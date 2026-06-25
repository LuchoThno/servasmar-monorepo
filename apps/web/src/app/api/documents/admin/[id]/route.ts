import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { DocumentModel } from '../../../../../../../api/src/models/Document'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'
import { deleteDriveFile } from '@/lib/googleDrive'
import { documentEntitySchema, normalizeDocumentCategory } from '@/lib/documentUpload'
import { objectIdSchema } from '@/lib/financeApi'
import { z } from 'zod'

export const runtime = 'nodejs'

const isMissingDriveFileError = (error: unknown) => {
  const status = (error as { code?: number; status?: number; response?: { status?: number } })?.code
    || (error as { status?: number })?.status
    || (error as { response?: { status?: number } })?.response?.status
  return status === 404
}

const updateDocumentSchema = z.object({
  name: z.string().min(1).max(180),
  category: z.string().min(1).max(60),
  entityType: documentEntitySchema,
  clientId: z.string().optional().default(''),
  projectId: z.string().optional().default(''),
  invoiceId: z.string().optional().default(''),
  installmentId: z.string().optional().default(''),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const payload = updateDocumentSchema.parse(await req.json())

    await connectToDatabase()
    const document = await DocumentModel.findById(id)
    if (!document) throw createError('Documento no encontrado', 404)

    let client: any = null
    let project: any = null
    let invoice: any = null
    let installment: any = null

    if (payload.entityType === 'client') {
      client = await CrmClientModel.findById(payload.clientId)
      if (!client) throw createError('Cliente no encontrado', 404)
    }

    if (payload.entityType === 'project') {
      project = await CrmProjectModel.findById(payload.projectId)
      if (!project) throw createError('Proyecto no encontrado', 404)
      client = await CrmClientModel.findById(project.clientId)
      if (!client) throw createError('Cliente asociado no encontrado', 404)
    }

    if (payload.entityType === 'invoice') {
      invoice = await InvoiceModel.findById(payload.invoiceId)
      if (!invoice) throw createError('Factura no encontrada', 404)
      project = await CrmProjectModel.findById(invoice.projectId)
      client = await CrmClientModel.findById(invoice.clientId)
      if (!project || !client) throw createError('Relación de factura incompleta', 404)
    }

    if (payload.entityType === 'installment') {
      installment = await InstallmentModel.findById(payload.installmentId)
      if (!installment) throw createError('Cuota no encontrada', 404)
      invoice = await InvoiceModel.findById(installment.invoiceId)
      project = await CrmProjectModel.findById(installment.projectId)
      client = await CrmClientModel.findById(installment.clientId)
      if (!invoice || !project || !client) throw createError('Relación de cuota incompleta', 404)
    }

    document.name = payload.name.trim()
    document.category = normalizeDocumentCategory(payload.category)
    document.entityType = payload.entityType
    document.clientId = client?._id
    document.projectId = project?._id
    document.invoiceId = invoice?._id
    document.installmentId = installment?._id
    await document.save()

    await document.populate('clientId', 'name taxId')
    await document.populate('projectId', 'name code driveFolderId tasks')
    await document.populate('invoiceId', 'invoiceNumber')
    await document.populate('installmentId', 'installmentNumber')

    return Response.json({ success: true, document })
  } catch (error) {
    return toErrorResponse(error)
  }
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
