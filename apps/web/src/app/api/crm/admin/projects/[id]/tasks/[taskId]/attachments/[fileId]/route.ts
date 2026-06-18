import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '@api/config/db'
import { CrmProjectModel } from '@api/models/CrmProject'
import { createError, toErrorResponse } from '@/app/api/_lib/apiError'
import { requirePermission } from '@/app/api/_lib/auth'
import { deleteDriveFile } from '@/lib/googleDrive'

export const runtime = 'nodejs'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

const isMissingDriveFileError = (error: unknown) => {
  const status = (error as { code?: number; status?: number; response?: { status?: number } })?.code
    || (error as { status?: number })?.status
    || (error as { response?: { status?: number } })?.response?.status
  return status === 404
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; taskId: string; fileId: string }> }) {
  try {
    const authorized = await requirePermission(req, 'projects', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const projectId = idSchema.parse(params.id)
    const taskId = idSchema.parse(params.taskId)
    const fileId = params.fileId

    await connectToDatabase()

    const project = await CrmProjectModel.findById(projectId)
    if (!project) throw createError('Proyecto no encontrado', 404)

    const task = (project.tasks as any).id(taskId)
    if (!task) throw createError('Tarea no encontrada', 404)

    const attachmentIndex = task.attachments.findIndex((item: any) => item.driveFileId === fileId)
    if (attachmentIndex < 0) throw createError('Adjunto no encontrado', 404)

    const [attachment] = task.attachments.splice(attachmentIndex, 1)
    task.activity.push(`Adjunto eliminado: ${attachment.name}`)

    try {
      await deleteDriveFile(fileId)
    } catch (error) {
      if (!isMissingDriveFileError(error)) throw error
    }

    await project.save()

    return Response.json({ success: true, attachment, task })
  } catch (err) {
    return toErrorResponse(err)
  }
}
