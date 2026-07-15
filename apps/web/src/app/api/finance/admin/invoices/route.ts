import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { createInvoiceCalendarReminder } from '@/lib/calendarFinance'
import { financeSearchSchema, invoiceSchema, normalizeInvoicePayload } from '@/lib/financeApi'
import { applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'

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
    })

    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (parsed.status === 'anulada' || parsed.status === 'pagada') filter.status = parsed.status
    if (parsed.clientId) filter.clientId = parsed.clientId
    if (parsed.projectId) filter.projectId = parsed.projectId
    if (parsed.search) {
      filter.$or = [
        { invoiceNumber: { $regex: parsed.search, $options: 'i' } },
        { notes: { $regex: parsed.search, $options: 'i' } },
      ]
    }

    const invoices = await InvoiceModel.find(filter)
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500)

    const installments = await InstallmentModel.find({ invoiceId: { $in: invoices.map((item) => item._id) } })
      .select('invoiceId dueDate status amount paidDate')
      .lean()

    const installmentsByInvoice = new Map<string, typeof installments>()
    for (const installment of installments) {
      const key = String(installment.invoiceId)
      const current = installmentsByInvoice.get(key) || []
      current.push(installment)
      installmentsByInvoice.set(key, current)
    }

    const today = startOfTodayUtc()
    const hydratedInvoices = invoices
      .map((invoice) => applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today))
      .filter((invoice) => !parsed.status || invoice.status === parsed.status)

    return Response.json({ success: true, invoices: hydratedInvoices })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = invoiceSchema.parse(await req.json())
    await connectToDatabase()

    const [client, project] = await Promise.all([
      CrmClientModel.findById(payload.clientId),
      CrmProjectModel.findById(payload.projectId),
    ])

    if (!client) {
      return Response.json({ success: false, error: { message: 'Cliente asociado no encontrado' } }, { status: 404 })
    }

    if (!project) {
      return Response.json({ success: false, error: { message: 'Proyecto asociado no encontrado' } }, { status: 404 })
    }

    if (String(project.clientId) !== String(client._id)) {
      return Response.json({ success: false, error: { message: 'El proyecto no pertenece al cliente seleccionado' } }, { status: 400 })
    }

    const invoice = await InvoiceModel.create(normalizeInvoicePayload(payload, authorized.email, 'create'))
    let calendarWarning: string | undefined
    if (payload.createCalendarEvent) {
      try {
        const reminder = await createInvoiceCalendarReminder({
          invoiceNumber: invoice.invoiceNumber,
          clientName: client.name,
          projectName: project.name,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
        })
        invoice.calendarEventId = reminder.eventId
        invoice.calendarHtmlLink = reminder.htmlLink
        await invoice.save()
      } catch {
        calendarWarning = 'La factura fue creada, pero no se pudo generar el recordatorio en Google Calendar.'
      }
    }
    await invoice.populate('clientId', 'name taxId')
    await invoice.populate('projectId', 'name code serviceType')

    return Response.json({ success: true, invoice, ...(calendarWarning ? { calendarWarning } : {}) }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
