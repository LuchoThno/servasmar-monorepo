import { createCalendarReminderEvent } from '../../../api/src/services/googleCalendar'

export const createInvoiceCalendarReminder = async ({
  invoiceNumber,
  clientName,
  projectName,
  dueDate,
  totalAmount,
}: {
  invoiceNumber: string
  clientName: string
  projectName: string
  dueDate: Date
  totalAmount: number
}) => {
  return createCalendarReminderEvent({
    summary: `Vencimiento factura ${invoiceNumber} · ${clientName}`,
    description: `Proyecto: ${projectName}\nCliente: ${clientName}\nMonto total: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}\nTipo: vencimiento de factura SERVASMAR`,
    date: dueDate,
  })
}

export const createInstallmentCalendarReminder = async ({
  installmentNumber,
  invoiceNumber,
  clientName,
  projectName,
  dueDate,
  amount,
}: {
  installmentNumber: number
  invoiceNumber: string
  clientName: string
  projectName: string
  dueDate: Date
  amount: number
}) => {
  return createCalendarReminderEvent({
    summary: `Vencimiento cuota ${installmentNumber} · ${clientName}`,
    description: `Factura: ${invoiceNumber}\nProyecto: ${projectName}\nCliente: ${clientName}\nMonto: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)}\nTipo: vencimiento de cuota SERVASMAR`,
    date: dueDate,
  })
}

export const createProjectMilestoneCalendarReminder = async ({
  projectName,
  clientName,
  endDate,
}: {
  projectName: string
  clientName: string
  endDate: Date
}) => {
  return createCalendarReminderEvent({
    summary: `Hito proyecto · ${projectName}`,
    description: `Cliente: ${clientName}\nTipo: hito / fecha de término de proyecto SERVASMAR`,
    date: endDate,
  })
}
