import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { DocumentModel } from '../../../../../../../../api/src/models/Document'
import { createError, toErrorResponse } from '../../../../_lib/apiError'
import { requirePermission } from '../../../../_lib/auth'
import { resolveSafeDocumentMimeType } from '@/lib/documentUpload'
import { downloadDriveFile } from '@/lib/googleDrive'
import { objectIdSchema } from '@/lib/financeApi'

export const runtime = 'nodejs'

const encodeFilename = (filename: string) => encodeURIComponent(filename).replace(/['()]/g, escape)

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)

    await connectToDatabase()
    const document = await DocumentModel.findOne({ _id: id, status: 'active' })
    if (!document) throw createError('Documento no encontrado', 404)

    const buffer = await downloadDriveFile(document.driveFileId)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': resolveSafeDocumentMimeType(document.mimeType),
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeFilename(document.name)}`,
        'Cache-Control': 'private, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
