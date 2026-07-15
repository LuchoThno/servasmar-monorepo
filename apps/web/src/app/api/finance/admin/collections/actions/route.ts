import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { ActivityLogModel } from '../../../../../../../../api/src/models/ActivityLog'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { collectionActionSchema, normalizeCollectionActionPayload } from '@/lib/collectionsApi'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const entityType = url.searchParams.get('entityType') || undefined
    const entityId = url.searchParams.get('entityId') || undefined

    await connectToDatabase()
    const filter: Record<string, unknown> = {}
    if (entityType) filter.entityType = entityType
    if (entityId) filter.entityId = entityId

    const actions = await ActivityLogModel.find(filter)
      .populate('clientId', 'name')
      .populate('projectId', 'name code')
      .populate('invoiceId', 'invoiceNumber')
      .populate('installmentId', 'installmentNumber')
      .sort({ createdAt: -1 })
      .limit(300)

    return Response.json({ success: true, actions })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = collectionActionSchema.parse(await req.json())
    await connectToDatabase()

    const [invoice, installment] = await Promise.all([
      payload.invoiceId ? InvoiceModel.findById(payload.invoiceId) : Promise.resolve(null),
      payload.installmentId ? InstallmentModel.findById(payload.installmentId) : Promise.resolve(null),
    ])

    if (payload.entityType === 'invoice') {
      if (!invoice) {
        return Response.json({ success: false, error: { message: 'Factura no encontrada para la gestión' } }, { status: 404 })
      }

      if (String(payload.entityId) !== String(invoice._id)) {
        return Response.json({ success: false, error: { message: 'El entityId no corresponde a la factura indicada' } }, { status: 400 })
      }

      if (String(payload.clientId) !== String(invoice.clientId) || String(payload.projectId) !== String(invoice.projectId)) {
        return Response.json({ success: false, error: { message: 'La factura no coincide con el cliente y proyecto informados' } }, { status: 400 })
      }

      if (payload.invoiceId && String(payload.invoiceId) !== String(invoice._id)) {
        return Response.json({ success: false, error: { message: 'invoiceId no coincide con la factura indicada' } }, { status: 400 })
      }

      if (payload.installmentId) {
        return Response.json({ success: false, error: { message: 'Una gestión de factura no debe incluir installmentId' } }, { status: 400 })
      }
    }

    if (payload.entityType === 'installment') {
      if (!installment) {
        return Response.json({ success: false, error: { message: 'Cuota no encontrada para la gestión' } }, { status: 404 })
      }

      if (String(payload.entityId) !== String(installment._id)) {
        return Response.json({ success: false, error: { message: 'El entityId no corresponde a la cuota indicada' } }, { status: 400 })
      }

      if (String(payload.clientId) !== String(installment.clientId) || String(payload.projectId) !== String(installment.projectId)) {
        return Response.json({ success: false, error: { message: 'La cuota no coincide con el cliente y proyecto informados' } }, { status: 400 })
      }

      if (payload.installmentId && String(payload.installmentId) !== String(installment._id)) {
        return Response.json({ success: false, error: { message: 'installmentId no coincide con la cuota indicada' } }, { status: 400 })
      }

      if (payload.invoiceId && String(payload.invoiceId) !== String(installment.invoiceId)) {
        return Response.json({ success: false, error: { message: 'invoiceId no coincide con la factura de la cuota' } }, { status: 400 })
      }
    }

    const action = await ActivityLogModel.create(
      normalizeCollectionActionPayload(
        {
          ...payload,
          entityId: payload.entityType === 'invoice' ? String(invoice!._id) : String(installment!._id),
          clientId: payload.entityType === 'invoice' ? String(invoice!.clientId) : String(installment!.clientId),
          projectId: payload.entityType === 'invoice' ? String(invoice!.projectId) : String(installment!.projectId),
          invoiceId: payload.entityType === 'invoice' ? String(invoice!._id) : String(installment!.invoiceId),
          installmentId: payload.entityType === 'installment' ? String(installment!._id) : '',
        },
        authorized.email
      )
    )
    await action.populate('clientId', 'name')
    await action.populate('projectId', 'name code')
    await action.populate('invoiceId', 'invoiceNumber')
    await action.populate('installmentId', 'installmentNumber')

    return Response.json({ success: true, action }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
