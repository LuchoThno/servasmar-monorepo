import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '@api/config/db'
import { CrmClientModel } from '@api/models/CrmClient'
import { CrmProjectModel } from '@api/models/CrmProject'
import { createError, toErrorResponse } from '@/app/api/_lib/apiError'
import { requirePermission } from '@/app/api/_lib/auth'
import { isAllowedDocumentMimeType, resolveSafeDocumentMimeType, sanitizeExternalHttpsUrl, sanitizeInternalDownloadUrl } from '@/lib/documentUpload'
import { ensureProjectCategoryFolder } from '@/lib/driveFolders'
import { ensureDriveFolder, uploadDriveFile } from '@/lib/googleDrive'

export const runtime = 'nodejs'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')
const maxFileSizeBytes = 25 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const taskFolderName = (task: any) => {
  const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : 'sin-fecha'
  return `${dueDate} - ${task.title}`.slice(0, 180)
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const authorized = await requirePermission(req, 'projects', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const projectId = idSchema.parse(params.id)
    const taskId = idSchema.parse(params.taskId)

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) throw createError('Archivo no recibido', 400)
    if (file.size > maxFileSizeBytes) throw createError('El archivo supera el máximo de 25 MB', 413)
    if (!isAllowedDocumentMimeType(file.type || 'application/octet-stream')) {
      throw createError('Tipo de archivo no permitido', 400)
    }

    await connectToDatabase()

    const project = await CrmProjectModel.findById(projectId)
    if (!project) throw createError('Proyecto no encontrado', 404)
    const client = await CrmClientModel.findById(project.clientId)
    if (!client) throw createError('Cliente asociado no encontrado', 404)

    const task = (project.tasks as any).id(taskId)
    if (!task) throw createError('Tarea no encontrada', 404)

    const antecedentesFolderId = await ensureProjectCategoryFolder(client, project, 'ANTECEDENTES')
    const taskDriveFolderId = await ensureDriveFolder(taskFolderName(task), antecedentesFolderId)

    const buffer = Buffer.from(await file.arrayBuffer())
    const driveFile = await uploadDriveFile({
      buffer,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      folderId: taskDriveFolderId,
    })

    const attachment = {
      name: file.name,
      size: formatFileSize(file.size),
      url: sanitizeInternalDownloadUrl(`/api/crm/admin/projects/${projectId}/tasks/${taskId}/attachments/${driveFile.id}/download`),
      driveFileId: driveFile.id,
      driveFolderId: taskDriveFolderId,
      mimeType: resolveSafeDocumentMimeType(driveFile.mimeType || file.type || 'application/octet-stream'),
      sizeBytes: file.size,
      webViewLink: sanitizeExternalHttpsUrl(driveFile.webViewLink || ''),
      uploadedAt: new Date(),
      uploadedBy: authorized.email,
    }

    task.attachments.push(attachment)
    task.activity.push(`Adjunto cargado: ${file.name}`)
    await project.save()

    return Response.json({ success: true, attachment, task })
  } catch (err) {
    return toErrorResponse(err)
  }
}
