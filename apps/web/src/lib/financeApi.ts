import { Types } from 'mongoose'
import { z } from 'zod'
import { calculateDaysOverdue, calculateInvoiceTotals, parseDateInput, resolveInstallmentStatus, resolveInvoiceStatus } from '@/lib/finance'

export const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID invalido')

export const financeSearchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  invoiceId: z.string().optional(),
})

export const invoiceSchema = z.object({
  clientId: objectIdSchema,
  projectId: objectIdSchema,
  invoiceNumber: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  netAmount: z.coerce.number().min(0),
  status: z.enum(['pendiente', 'pagada', 'vencida', 'anulada']).default('pendiente'),
  createCalendarEvent: z.boolean().optional().default(false),
  driveFileId: z.string().optional().default(''),
  driveWebViewLink: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const installmentSchema = z.object({
  clientId: objectIdSchema,
  projectId: objectIdSchema,
  invoiceId: objectIdSchema,
  installmentNumber: z.coerce.number().int().min(1),
  amount: z.coerce.number().min(0),
  dueDate: z.string().min(1),
  paidDate: z.string().optional().default(''),
  status: z.enum(['pendiente', 'pagada', 'pago_parcial', 'vencida', 'anulada']).default('pendiente'),
  createCalendarEvent: z.boolean().optional().default(false),
  paymentMethod: z.string().optional().default(''),
  driveFileId: z.string().optional().default(''),
  driveWebViewLink: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const incomeSchema = z.object({
  date: z.string().min(1),
  clientId: objectIdSchema,
  projectId: objectIdSchema,
  invoiceId: objectIdSchema.optional().or(z.literal('')).default(''),
  installmentId: objectIdSchema.optional().or(z.literal('')).default(''),
  amount: z.coerce.number().min(0.01),
  paymentMethod: z.enum(['transferencia', 'deposito', 'efectivo', 'webpay', 'otro']).default('transferencia'),
  notes: z.string().optional().default(''),
  driveFileId: z.string().optional().default(''),
  driveWebViewLink: z.string().optional().default(''),
})

export const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.enum(['honorarios', 'transporte', 'combustible', 'hospedaje', 'alimentacion', 'equipamiento', 'software', 'marketing', 'servicios_externos', 'permisos', 'impuestos', 'otros']),
  supplier: z.string().optional().default(''),
  projectId: objectIdSchema,
  clientId: objectIdSchema,
  amount: z.coerce.number().min(0.01),
  status: z.enum(['pendiente', 'pagado', 'anulado']).default('pendiente'),
  notes: z.string().optional().default(''),
  driveFileId: z.string().optional().default(''),
  driveWebViewLink: z.string().optional().default(''),
})

export const normalizeInvoicePayload = (
  payload: z.infer<typeof invoiceSchema>,
  userEmail: string,
  mode: 'create' | 'update'
) => {
  const issueDate = parseDateInput(payload.issueDate)
  const dueDate = parseDateInput(payload.dueDate)
  const totals = calculateInvoiceTotals(payload.netAmount)
  const status = resolveInvoiceStatus(payload.status, dueDate)

  return {
    clientId: payload.clientId,
    projectId: payload.projectId,
    invoiceNumber: payload.invoiceNumber.trim(),
    issueDate,
    dueDate,
    netAmount: totals.netAmount,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    daysOverdue: calculateDaysOverdue(dueDate),
    status,
    driveFileId: payload.driveFileId.trim(),
    driveWebViewLink: payload.driveWebViewLink.trim(),
    notes: payload.notes.trim(),
    ...(mode === 'create' ? { createdBy: userEmail } : {}),
    updatedBy: userEmail,
  }
}

export const normalizeInstallmentPayload = (
  payload: z.infer<typeof installmentSchema>,
  userEmail: string,
  mode: 'create' | 'update'
) => {
  const dueDate = parseDateInput(payload.dueDate)
  const paidDate = parseDateInput(payload.paidDate)
  const status = resolveInstallmentStatus(payload.status, dueDate)

  return {
    clientId: payload.clientId,
    projectId: payload.projectId,
    invoiceId: payload.invoiceId,
    installmentNumber: payload.installmentNumber,
    amount: payload.amount,
    dueDate,
    paidDate,
    status,
    paymentMethod: payload.paymentMethod.trim(),
    driveFileId: payload.driveFileId.trim(),
    driveWebViewLink: payload.driveWebViewLink.trim(),
    notes: payload.notes.trim(),
    ...(mode === 'create' ? { createdBy: userEmail } : {}),
    updatedBy: userEmail,
  }
}

export const normalizeIncomePayload = (
  payload: z.infer<typeof incomeSchema>,
  userEmail: string,
  mode: 'create' | 'update'
) => ({
  date: parseDateInput(payload.date),
  clientId: payload.clientId,
  projectId: payload.projectId,
  invoiceId: payload.invoiceId || undefined,
  installmentId: payload.installmentId || undefined,
  amount: payload.amount,
  paymentMethod: payload.paymentMethod,
  notes: payload.notes.trim(),
  driveFileId: payload.driveFileId.trim(),
  driveWebViewLink: payload.driveWebViewLink.trim(),
  status: 'active',
  ...(mode === 'create' ? { createdBy: userEmail } : {}),
  updatedBy: userEmail,
})

export const normalizeExpensePayload = (
  payload: z.infer<typeof expenseSchema>,
  userEmail: string,
  mode: 'create' | 'update'
) => ({
  date: parseDateInput(payload.date),
  category: payload.category,
  supplier: payload.supplier.trim(),
  projectId: payload.projectId,
  clientId: payload.clientId,
  amount: payload.amount,
  status: payload.status,
  notes: payload.notes.trim(),
  driveFileId: payload.driveFileId.trim(),
  driveWebViewLink: payload.driveWebViewLink.trim(),
  ...(mode === 'create' ? { createdBy: userEmail } : {}),
  updatedBy: userEmail,
})
