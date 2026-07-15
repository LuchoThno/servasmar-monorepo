import { Types } from 'mongoose'
import { z } from 'zod'

export const maxDocumentSizeBytes = 25 * 1024 * 1024

export const allowedDocumentMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
])

export const documentEntitySchema = z.enum(['client', 'project', 'invoice', 'installment'])
export const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID invalido')

export const documentFilterSchema = z.object({
  entityType: documentEntitySchema.optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  invoiceId: z.string().optional(),
  installmentId: z.string().optional(),
  search: z.string().optional(),
})

export const normalizeDocumentCategory = (value?: string) => {
  const clean = (value || 'GENERAL').trim().toUpperCase().replace(/\s+/g, '_')
  return clean.slice(0, 60) || 'GENERAL'
}

export const isAllowedDocumentMimeType = (mimeType: string) => allowedDocumentMimeTypes.has(mimeType)

export const resolveSafeDocumentMimeType = (mimeType?: string) => {
  const clean = (mimeType || '').trim().toLowerCase()
  return isAllowedDocumentMimeType(clean) ? clean : 'application/octet-stream'
}

export const sanitizeInternalDownloadUrl = (value?: string) => {
  const clean = (value || '').trim()
  return clean.startsWith('/api/') ? clean : '#'
}

export const sanitizeExternalHttpsUrl = (value?: string) => {
  const clean = (value || '').trim()
  if (!clean) return ''

  try {
    const url = new URL(clean)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
