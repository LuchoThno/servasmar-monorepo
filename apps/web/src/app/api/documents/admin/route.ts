import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../api/src/models/CrmClient'
import { DocumentModel } from '../../../../../../api/src/models/Document'
import { InstallmentModel } from '../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../api/src/models/Invoice'
import { CrmProjectModel } from '../../../../../../api/src/models/CrmProject'
import { createError, toErrorResponse } from '../../_lib/apiError'
import { requirePermission } from '../../_lib/auth'
import { ensureClientCategoryFolder, ensureProjectCategoryFolder } from '@/lib/driveFolders'
import { uploadDriveFile } from '@/lib/googleDrive'
import { documentEntitySchema, documentFilterSchema, formatFileSize, isAllowedDocumentMimeType, maxDocumentSizeBytes, normalizeDocumentCategory } from '@/lib/documentUpload'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const filters = documentFilterSchema.parse({
      entityType: url.searchParams.get('entityType') ?? undefined,
      clientId: url.searchParams.get('clientId') ?? undefined,
      projectId: url.searchParams.get('projectId') ?? undefined,
      invoiceId: url.searchParams.get('invoiceId') ?? undefined,
      installmentId: url.searchParams.get('installmentId') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    })

    await connectToDatabase()
    const query: Record<string, unknown> = { status: 'active' }
    if (filters.entityType) query.entityType = filters.entityType
    if (filters.clientId) query.clientId = filters.clientId
    if (filters.projectId) query.projectId = filters.projectId
    if (filters.invoiceId) query.invoiceId = filters.invoiceId
    if (filters.installmentId) query.installmentId = filters.installmentId
    if (filters.search) query.name = { $regex: filters.search, $options: 'i' }

    const documents = await DocumentModel.find(query)
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code')
      .populate('invoiceId', 'invoiceNumber')
      .populate('installmentId', 'installmentNumber')
      .sort({ createdAt: -1 })
      .limit(500)

    return Response.json({ success: true, documents })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) throw createError('Archivo no recibido', 400)
    if (file.size > maxDocumentSizeBytes) throw createError('El archivo supera el máximo de 25 MB', 413)
    if (!isAllowedDocumentMimeType(file.type || 'application/octet-stream')) {
      throw createError('Tipo de archivo no permitido', 400)
    }

    const entityType = documentEntitySchema.parse(formData.get('entityType'))
    const category = normalizeDocumentCategory(String(formData.get('category') || 'GENERAL'))

    await connectToDatabase()

    let client: any = null
    let project: any = null
    let invoice: any = null
    let installment: any = null
    let targetFolderId = ''

    if (entityType === 'client') {
      const clientId = String(formData.get('clientId') || '')
      client = await CrmClientModel.findById(clientId)
      if (!client) throw createError('Cliente no encontrado', 404)
      targetFolderId = await ensureClientCategoryFolder(client, category)
    }

    if (entityType === 'project') {
      const projectId = String(formData.get('projectId') || '')
      project = await CrmProjectModel.findById(projectId)
      if (!project) throw createError('Proyecto no encontrado', 404)
      client = await CrmClientModel.findById(project.clientId)
      if (!client) throw createError('Cliente asociado no encontrado', 404)
      targetFolderId = await ensureProjectCategoryFolder(client, project, category)
    }

    if (entityType === 'invoice') {
      const invoiceId = String(formData.get('invoiceId') || '')
      invoice = await InvoiceModel.findById(invoiceId)
      if (!invoice) throw createError('Factura no encontrada', 404)
      project = await CrmProjectModel.findById(invoice.projectId)
      client = await CrmClientModel.findById(invoice.clientId)
      if (!project || !client) throw createError('Relación de factura incompleta', 404)
      targetFolderId = await ensureProjectCategoryFolder(client, project, 'FACTURAS')
    }

    if (entityType === 'installment') {
      const installmentId = String(formData.get('installmentId') || '')
      installment = await InstallmentModel.findById(installmentId)
      if (!installment) throw createError('Cuota no encontrada', 404)
      invoice = await InvoiceModel.findById(installment.invoiceId)
      project = await CrmProjectModel.findById(installment.projectId)
      client = await CrmClientModel.findById(installment.clientId)
      if (!invoice || !project || !client) throw createError('Relación de cuota incompleta', 404)
      targetFolderId = await ensureProjectCategoryFolder(client, project, 'COMPROBANTES')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const driveFile = await uploadDriveFile({
      buffer,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      folderId: targetFolderId,
    })

    const document = await DocumentModel.create({
      name: file.name,
      category,
      entityType,
      clientId: client?._id,
      projectId: project?._id,
      invoiceId: invoice?._id,
      installmentId: installment?._id,
      driveFileId: driveFile.id,
      driveFolderId: targetFolderId,
      webViewLink: driveFile.webViewLink || '',
      mimeType: driveFile.mimeType || file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedBy: authorized.email,
      downloadUrl: '',
    })

    document.downloadUrl = `/api/documents/admin/${document._id}/download`
    await document.save()

    if (invoice) {
      invoice.driveFileId = driveFile.id
      invoice.driveWebViewLink = driveFile.webViewLink || ''
      await invoice.save()
    }

    if (installment) {
      installment.driveFileId = driveFile.id
      installment.driveWebViewLink = driveFile.webViewLink || ''
      await installment.save()
    }

    await document.populate('clientId', 'name taxId')
    await document.populate('projectId', 'name code')
    await document.populate('invoiceId', 'invoiceNumber')
    await document.populate('installmentId', 'installmentNumber')

    return Response.json({
      success: true,
      document: {
        ...document.toObject(),
        sizeLabel: formatFileSize(file.size),
      },
    }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
