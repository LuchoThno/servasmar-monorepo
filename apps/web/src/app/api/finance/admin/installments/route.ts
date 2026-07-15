import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { createInstallmentCalendarReminder } from '@/lib/calendarFinance'
import { financeSearchSchema, installmentSchema, normalizeInstallmentPayload } from '@/lib/financeApi'
import { applyRuntimeInstallmentState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const parsed = financeSearchSchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      clientId: url.searchParams.get('clientId') ?? undefined,
      projectId: url.searchParams.get('projectId') ?? undefined,
      invoiceId: url.searchParams.get('invoiceId') ?? undefined,
    })

    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (parsed.status === 'pagada' || parsed.status === 'pago_parcial' || parsed.status === 'anulada') filter.status = parsed.status
    if (parsed.clientId) filter.clientId = parsed.clientId
    if (parsed.projectId) filter.projectId = parsed.projectId
    if (parsed.invoiceId) filter.invoiceId = parsed.invoiceId
    if (parsed.search) filter.notes = { $regex: parsed.search, $options: 'i' }

    const installments = await InstallmentModel.find(filter)
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .sort({ dueDate: 1, installmentNumber: 1 })
      .limit(800)

    const today = startOfTodayUtc()
    const hydratedInstallments = installments
      .map((installment) => applyRuntimeInstallmentState(installment, today))
      .filter((installment) => !parsed.status || installment.status === parsed.status)

    return Response.json({ success: true, installments: hydratedInstallments })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

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

    const installment = await InstallmentModel.create(normalizeInstallmentPayload(payload, authorized.email, 'create'))
    let calendarWarning: string | undefined
    if (payload.createCalendarEvent) {
      try {
        const reminder = await createInstallmentCalendarReminder({
          installmentNumber: installment.installmentNumber,
          invoiceNumber: invoice.invoiceNumber,
          clientName: client.name,
          projectName: project.name,
          dueDate: installment.dueDate,
          amount: installment.amount,
        })
        installment.calendarEventId = reminder.eventId
        installment.calendarHtmlLink = reminder.htmlLink
        await installment.save()
      } catch {
        calendarWarning = 'La cuota fue creada, pero no se pudo generar el recordatorio en Google Calendar.'
      }
    }
    await installment.populate('clientId', 'name taxId')
    await installment.populate('projectId', 'name code serviceType')
    await installment.populate('invoiceId', 'invoiceNumber totalAmount')

    return Response.json({ success: true, installment, ...(calendarWarning ? { calendarWarning } : {}) }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
