import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { DocumentModel } from '../../../../../../../api/src/models/Document'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'
import { deleteDriveFile } from '@/lib/googleDrive'
import { objectIdSchema } from '@/lib/financeApi'

export const runtime = 'nodejs'

const isMissingDriveFileError = (error: unknown) => {
  const status = (error as { code?: number; status?: number; response?: { status?: number } })?.code
    || (error as { status?: number })?.status
    || (error as { response?: { status?: number } })?.response?.status
  return status === 404
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)

    await connectToDatabase()
    const document = await DocumentModel.findById(id)
    if (!document) throw createError('Documento no encontrado', 404)

    try {
      await deleteDriveFile(document.driveFileId)
    } catch (error) {
      if (!isMissingDriveFileError(error)) throw error
    }

    if (document.invoiceId) {
      await InvoiceModel.updateOne(
        { _id: document.invoiceId, driveFileId: document.driveFileId },
        { $set: { driveFileId: '', driveWebViewLink: '' } }
      )
    }

    if (document.installmentId) {
      await InstallmentModel.updateOne(
        { _id: document.installmentId, driveFileId: document.driveFileId },
        { $set: { driveFileId: '', driveWebViewLink: '' } }
      )
    }

    document.status = 'deleted'
    await document.save()

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
