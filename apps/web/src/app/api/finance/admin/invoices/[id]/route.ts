import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { invoiceSchema, normalizeInvoicePayload, objectIdSchema } from '@/lib/financeApi'
import { resolveInvoiceStatus } from '@/lib/finance'
import { z } from 'zod'

const invoiceStatusSchema = z.object({
  status: z.enum(['pendiente', 'pagada', 'vencida', 'anulada']),
})

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const payload = invoiceSchema.parse(await req.json())

    await connectToDatabase()

    const [client, project] = await Promise.all([
      CrmClientModel.findById(payload.clientId),
      CrmProjectModel.findById(payload.projectId),
    ])

    if (!client || !project) {
      return Response.json({ success: false, error: { message: 'Cliente o proyecto asociado no encontrado' } }, { status: 404 })
    }

    if (String(project.clientId) !== String(client._id)) {
      return Response.json({ success: false, error: { message: 'El proyecto no pertenece al cliente seleccionado' } }, { status: 400 })
    }

    const invoice = await InvoiceModel.findByIdAndUpdate(id, normalizeInvoicePayload(payload, authorized.email, 'update'), { new: true })
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')

    if (!invoice) {
      return Response.json({ success: false, error: { message: 'Factura no encontrada' } }, { status: 404 })
    }

    return Response.json({ success: true, invoice })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)

    await connectToDatabase()

    const invoice = await InvoiceModel.findByIdAndDelete(id)
    if (!invoice) {
      return Response.json({ success: false, error: { message: 'Factura no encontrada' } }, { status: 404 })
    }

    await InstallmentModel.deleteMany({ invoiceId: id })
    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const payload = invoiceStatusSchema.parse(await req.json())

    await connectToDatabase()

    const invoice = await InvoiceModel.findById(id)
    if (!invoice) {
      return Response.json({ success: false, error: { message: 'Factura no encontrada' } }, { status: 404 })
    }

    const installmentCount = await InstallmentModel.countDocuments({ invoiceId: invoice._id })
    if (installmentCount > 0 && payload.status !== 'anulada') {
      return Response.json({ success: false, error: { message: 'Esta factura tiene cuotas asociadas. Cambia el estado desde las cuotas o anula la factura completa.' } }, { status: 400 })
    }

    invoice.status = payload.status === 'anulada' ? 'anulada' : resolveInvoiceStatus(payload.status, invoice.dueDate)
    invoice.daysOverdue = invoice.status === 'vencida' ? invoice.daysOverdue : 0
    invoice.updatedBy = authorized.email
    await invoice.save()

    if (payload.status === 'anulada') {
      await InstallmentModel.updateMany(
        { invoiceId: invoice._id },
        { $set: { status: 'anulada', updatedBy: authorized.email }, $unset: { paidDate: '' } }
      )
    }

    await invoice.populate('clientId', 'name taxId')
    await invoice.populate('projectId', 'name code serviceType')

    return Response.json({ success: true, invoice })
  } catch (error) {
    return toErrorResponse(error)
  }
}
