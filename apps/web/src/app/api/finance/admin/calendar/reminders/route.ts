import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { createInstallmentCalendarReminder, createInvoiceCalendarReminder, createProjectMilestoneCalendarReminder } from '@/lib/calendarFinance'

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const body = await req.json()
    const { entityType, entityId, force } = body as {
      entityType?: 'invoice' | 'installment' | 'project'
      entityId?: string
      force?: boolean
    }
    if (!entityType || !entityId) {
      return Response.json({ success: false, error: { message: 'Faltan entityType o entityId para crear el recordatorio' } }, { status: 400 })
    }

    await connectToDatabase()

    if (entityType === 'invoice') {
      const invoice = await InvoiceModel.findById(entityId).populate('clientId', 'name').populate('projectId', 'name')
      if (!invoice) return Response.json({ success: false, error: { message: 'Factura no encontrada' } }, { status: 404 })
      if (invoice.calendarEventId && !force) {
        return Response.json(
          {
            success: false,
            error: { message: 'La factura ya tiene un recordatorio vinculado en Calendar' },
            reminder: { eventId: invoice.calendarEventId, htmlLink: invoice.calendarHtmlLink || '' },
          },
          { status: 409 }
        )
      }
      const reminder = await createInvoiceCalendarReminder({
        invoiceNumber: invoice.invoiceNumber,
        clientName: (invoice.clientId as any)?.name || 'Cliente',
        projectName: (invoice.projectId as any)?.name || 'Proyecto',
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
      })
      invoice.calendarEventId = reminder.eventId
      invoice.calendarHtmlLink = reminder.htmlLink
      await invoice.save()
      return Response.json({ success: true, reminder })
    }

    if (entityType === 'installment') {
      const installment = await InstallmentModel.findById(entityId)
        .populate('clientId', 'name')
        .populate('projectId', 'name')
        .populate('invoiceId', 'invoiceNumber')
      if (!installment) return Response.json({ success: false, error: { message: 'Cuota no encontrada' } }, { status: 404 })
      if (installment.calendarEventId && !force) {
        return Response.json(
          {
            success: false,
            error: { message: 'La cuota ya tiene un recordatorio vinculado en Calendar' },
            reminder: { eventId: installment.calendarEventId, htmlLink: installment.calendarHtmlLink || '' },
          },
          { status: 409 }
        )
      }
      const reminder = await createInstallmentCalendarReminder({
        installmentNumber: installment.installmentNumber,
        invoiceNumber: (installment.invoiceId as any)?.invoiceNumber || 'Factura',
        clientName: (installment.clientId as any)?.name || 'Cliente',
        projectName: (installment.projectId as any)?.name || 'Proyecto',
        dueDate: installment.dueDate,
        amount: installment.amount,
      })
      installment.calendarEventId = reminder.eventId
      installment.calendarHtmlLink = reminder.htmlLink
      await installment.save()
      return Response.json({ success: true, reminder })
    }

    const project = await CrmProjectModel.findById(entityId).populate('clientId', 'name')
    if (!project) return Response.json({ success: false, error: { message: 'Proyecto no encontrado' } }, { status: 404 })
    if (!project.endDate) return Response.json({ success: false, error: { message: 'El proyecto no tiene fecha de término para crear hito' } }, { status: 400 })
    if (project.milestoneCalendarEventId && !force) {
      return Response.json(
        {
          success: false,
          error: { message: 'El proyecto ya tiene un hito vinculado en Calendar' },
          reminder: { eventId: project.milestoneCalendarEventId, htmlLink: project.milestoneCalendarHtmlLink || '' },
        },
        { status: 409 }
      )
    }
    const reminder = await createProjectMilestoneCalendarReminder({
      projectName: project.name,
      clientName: (project.clientId as any)?.name || 'Cliente',
      endDate: project.endDate,
    })
    project.milestoneCalendarEventId = reminder.eventId
    project.milestoneCalendarHtmlLink = reminder.htmlLink
    await project.save()
    return Response.json({ success: true, reminder })
  } catch (error) {
    return toErrorResponse(error)
  }
}
