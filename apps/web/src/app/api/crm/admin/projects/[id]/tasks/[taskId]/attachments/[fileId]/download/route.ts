import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '@api/config/db'
import { CrmProjectModel } from '@api/models/CrmProject'
import { createError, toErrorResponse } from '@/app/api/_lib/apiError'
import { requirePermission } from '@/app/api/_lib/auth'
import { downloadDriveFile } from '@/lib/googleDrive'

export const runtime = 'nodejs'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

const encodeFilename = (filename: string) => encodeURIComponent(filename).replace(/['()]/g, escape)

export async function GET(req: NextRequest, context: { params: Promise<{ id: string; taskId: string; fileId: string }> }) {
  try {
    const authorized = await requirePermission(req, 'projects', 'read')
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

    const attachment = task.attachments.find((item: any) => item.driveFileId === fileId)
    if (!attachment) throw createError('Adjunto no encontrado', 404)

    const buffer = await downloadDriveFile(fileId)
    const disposition = req.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'
    const filename = attachment.name || 'archivo'

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeFilename(filename)}`,
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
