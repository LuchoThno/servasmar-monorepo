import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../../api/src/config/db'

import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'

import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { CrmQuoteModel } from '../../../../../../../../api/src/models/CrmQuote'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

const projectValueSchema = z.object({
  label: z.string().min(2),
  amount: z.coerce.number().min(0),
  currency: z.string().optional().default('CLP'),
  type: z.enum(['ingreso', 'egreso']).default('ingreso'),
  dueDate: z.string().optional().default(''),
  status: z.enum(['pendiente', 'facturado', 'pagado']).default('pendiente'),
  notes: z.string().optional().default(''),
})

const projectTaskSchema = z.object({
  title: z.string().min(2),
  owner: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  status: z.enum(['pendiente', 'en_progreso', 'completada', 'bloqueada']).default('pendiente'),
  notes: z.string().optional().default(''),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  tag: z.string().optional().default('General'),
  tagColor: z.string().optional().default('blue'),
  assignees: z.array(z.string()).optional().default([]),
  desc: z.string().optional().default(''),
  subtasks: z
    .array(
      z.object({
        text: z.string().min(1),
        done: z.boolean().default(false),
      })
    )
    .optional()
    .default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        size: z.string().optional().default(''),
        url: z.string().optional().default('#'),
      })
    )
    .optional()
    .default([]),
  activity: z.array(z.string()).optional().default([]),
})

const projectSchema = z.object({
  clientId: idSchema,
  name: z.string().min(2),
  serviceType: z.string().optional().default(''),
  status: z
    .enum(['prospecto', 'en_progreso', 'pausado', 'cerrado', 'perdido'])
    .default('prospecto'),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  description: z.string().optional().default(''),
  values: z.array(projectValueSchema).default([]),
  tasks: z.array(projectTaskSchema).default([]),
})

const emptyToDate = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined)

const normalizeProjectPayload = (payload: z.infer<typeof projectSchema>) => ({
  ...payload,
  startDate: emptyToDate(payload.startDate),
  endDate: emptyToDate(payload.endDate),
  values: payload.values.map((value) => ({
    ...value,
    dueDate: emptyToDate(value.dueDate),
  })),
  tasks: payload.tasks.map((task) => ({
    ...task,
    dueDate: emptyToDate(task.dueDate),
    title: task.title.trim(),
    owner: task.owner.trim(),
    notes: task.notes.trim(),
    tag: task.tag.trim() || 'General',
    tagColor: task.tagColor.trim() || 'blue',
    desc: task.desc.trim(),
    assignees: task.assignees.map((assignee) => assignee.trim()).filter(Boolean),
    subtasks: (task.subtasks || [])
      .map((subtask) => ({ ...subtask, text: subtask.text.trim() }))
      .filter((subtask) => subtask.text),
    attachments: (task.attachments || [])
      .map((attachment) => ({
        name: attachment.name.trim(),
        size: attachment.size.trim(),
        url: attachment.url.trim() || '#',
      }))
      .filter((attachment) => attachment.name),
  })),
})

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'projects', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = idSchema.parse(params.id)
    const payload = projectSchema.parse(await req.json())

    await connectToDatabase()

    const client = await CrmClientModel.findById(payload.clientId)
    if (!client) {
      return Response.json({ success: false, error: { message: 'Cliente asociado no encontrado' } }, { status: 404 })
    }

    const project = await CrmProjectModel.findByIdAndUpdate(id, normalizeProjectPayload(payload), { new: true })
      .populate('clientId', 'name taxId email')

    if (!project) {
      return Response.json({ success: false, error: { message: 'Proyecto no encontrado' } }, { status: 404 })
    }

    return Response.json({ success: true, project })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'projects', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = idSchema.parse(params.id)

    await connectToDatabase()

    const project = await CrmProjectModel.findByIdAndDelete(id)
    if (!project) {
      return Response.json({ success: false, error: { message: 'Proyecto no encontrado' } }, { status: 404 })
    }

    await CrmQuoteModel.updateMany({ projectId: id }, { $unset: { projectId: '' } })

    return Response.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
