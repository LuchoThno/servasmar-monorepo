import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { IncomeModel } from '../../../../../../../api/src/models/Income'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { syncInstallmentPaymentStatus, syncInvoicePaymentStatus } from '@/lib/financeAccounting'
import { financeSearchSchema, incomeSchema, normalizeIncomePayload } from '@/lib/financeApi'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const parsed = financeSearchSchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      clientId: url.searchParams.get('clientId') ?? undefined,
      projectId: url.searchParams.get('projectId') ?? undefined,
      invoiceId: url.searchParams.get('invoiceId') ?? undefined,
    })

    await connectToDatabase()
    const filter: Record<string, unknown> = { status: 'active' }
    if (parsed.clientId) filter.clientId = parsed.clientId
    if (parsed.projectId) filter.projectId = parsed.projectId
    if (parsed.invoiceId) filter.invoiceId = parsed.invoiceId
    if (parsed.search) filter.notes = { $regex: parsed.search, $options: 'i' }

    const incomes = await IncomeModel.find(filter)
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('installmentId', 'installmentNumber amount status')
      .sort({ date: -1, createdAt: -1 })
      .limit(500)

    return Response.json({ success: true, incomes })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = incomeSchema.parse(await req.json())
    await connectToDatabase()

    const [client, project, invoice, installment] = await Promise.all([
      CrmClientModel.findById(payload.clientId),
      CrmProjectModel.findById(payload.projectId),
      payload.invoiceId ? InvoiceModel.findById(payload.invoiceId) : Promise.resolve(null),
      payload.installmentId ? InstallmentModel.findById(payload.installmentId) : Promise.resolve(null),
    ])

    if (!client || !project) {
      return Response.json({ success: false, error: { message: 'Cliente o proyecto no encontrado' } }, { status: 404 })
    }

    if (String(project.clientId) !== String(client._id)) {
      return Response.json({ success: false, error: { message: 'El proyecto no pertenece al cliente seleccionado' } }, { status: 400 })
    }

    if (invoice && (String(invoice.clientId) !== String(client._id) || String(invoice.projectId) !== String(project._id))) {
      return Response.json({ success: false, error: { message: 'La factura no coincide con el cliente y proyecto' } }, { status: 400 })
    }

    if (installment) {
      if (String(installment.clientId) !== String(client._id) || String(installment.projectId) !== String(project._id)) {
        return Response.json({ success: false, error: { message: 'La cuota no coincide con el cliente y proyecto' } }, { status: 400 })
      }
      if (invoice && String(installment.invoiceId) !== String(invoice._id)) {
        return Response.json({ success: false, error: { message: 'La cuota no pertenece a la factura seleccionada' } }, { status: 400 })
      }
    }

    const income = await IncomeModel.create(normalizeIncomePayload(payload, authorized.email, 'create'))

    if (income.installmentId) await syncInstallmentPaymentStatus(String(income.installmentId))
    if (income.invoiceId) await syncInvoicePaymentStatus(String(income.invoiceId))
    else if (installment?.invoiceId) await syncInvoicePaymentStatus(String(installment.invoiceId))

    await income.populate('clientId', 'name taxId')
    await income.populate('projectId', 'name code serviceType')
    await income.populate('invoiceId', 'invoiceNumber totalAmount')
    await income.populate('installmentId', 'installmentNumber amount status')

    return Response.json({ success: true, income }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
