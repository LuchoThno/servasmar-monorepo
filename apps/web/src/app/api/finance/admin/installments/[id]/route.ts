import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { installmentSchema, normalizeInstallmentPayload, objectIdSchema } from '@/lib/financeApi'
import { parseDateInput, startOfTodayUtc } from '@/lib/finance'
import { syncInvoicePaymentStatus } from '@/lib/financeAccounting'
import { z } from 'zod'

const installmentStatusSchema = z.object({
  status: z.enum(['pendiente', 'pagada', 'pago_parcial', 'vencida', 'anulada']),
  paymentMethod: z.string().optional().default(''),
  paidDate: z.string().optional().default(''),
})

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const payload = installmentSchema.parse(await req.json())

    await connectToDatabase()

    const [client, project, invoice] = await Promise.all([
      CrmClientModel.findById(payload.clientId),
      CrmProjectModel.findById(payload.projectId),
      InvoiceModel.findById(payload.invoiceId),
    ])

    if (!client || !project || !invoice) {
      return Response.json({ success: false, error: { message: 'Cliente, proyecto o factura no encontrado' } }, { status: 404 })
    }

    if (String(project.clientId) !== String(client._id) || String(invoice.projectId) !== String(project._id)) {
      return Response.json({ success: false, error: { message: 'La cuota no coincide con la relacion cliente/proyecto/factura' } }, { status: 400 })
    }

    const installment = await InstallmentModel.findByIdAndUpdate(id, normalizeInstallmentPayload(payload, authorized.email, 'update'), { new: true })
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')
      .populate('invoiceId', 'invoiceNumber totalAmount')

    if (!installment) {
      return Response.json({ success: false, error: { message: 'Cuota no encontrada' } }, { status: 404 })
    }

    return Response.json({ success: true, installment })
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

    const installment = await InstallmentModel.findByIdAndDelete(id)
    if (!installment) {
      return Response.json({ success: false, error: { message: 'Cuota no encontrada' } }, { status: 404 })
    }

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
    const payload = installmentStatusSchema.parse(await req.json())

    await connectToDatabase()

    const installment = await InstallmentModel.findById(id)
    if (!installment) {
      return Response.json({ success: false, error: { message: 'Cuota no encontrada' } }, { status: 404 })
    }

    installment.status = payload.status
    installment.paymentMethod = payload.paymentMethod.trim() || installment.paymentMethod
    installment.updatedBy = authorized.email

    if (payload.status === 'pagada' || payload.status === 'pago_parcial') {
      installment.paidDate = parseDateInput(payload.paidDate) || startOfTodayUtc()
    } else {
      installment.paidDate = undefined
    }

    await installment.save()
    await syncInvoicePaymentStatus(String(installment.invoiceId))

    await installment.populate('clientId', 'name taxId')
    await installment.populate('projectId', 'name code serviceType')
    await installment.populate('invoiceId', 'invoiceNumber totalAmount')

    return Response.json({ success: true, installment })
  } catch (error) {
    return toErrorResponse(error)
  }
}
