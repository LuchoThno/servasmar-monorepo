import { calculateDaysOverdue, resolveInstallmentStatus, resolveInvoiceStatus, startOfTodayUtc } from '@/lib/finance'

type InvoiceStatus = 'pendiente' | 'pagada' | 'vencida' | 'anulada'
type InstallmentStatus = 'pendiente' | 'pagada' | 'pago_parcial' | 'vencida' | 'anulada'

type InstallmentLike = {
  status: InstallmentStatus
  dueDate?: Date | string
}

type InvoiceLike = {
  status: InvoiceStatus
  dueDate?: Date | string
  daysOverdue?: number
}

export const applyRuntimeInstallmentState = <T extends InstallmentLike>(installment: T, referenceDate = startOfTodayUtc()) => {
  installment.status = resolveInstallmentStatus(installment.status, installment.dueDate, referenceDate) as T['status']
  return installment
}

export const applyRuntimeInvoiceState = <T extends InvoiceLike>(
  invoice: T,
  installments: InstallmentLike[] = [],
  referenceDate = startOfTodayUtc()
) => {
  if (invoice.status === 'anulada') {
    invoice.daysOverdue = 0
    return invoice
  }

  const runtimeInstallments = installments.map((installment) => applyRuntimeInstallmentState(installment, referenceDate))

  if (runtimeInstallments.length) {
    const allPaid = runtimeInstallments.every((item) => item.status === 'pagada')
    const hasOverdue = runtimeInstallments.some(
      (item) => item.status !== 'pagada' && item.status !== 'anulada' && calculateDaysOverdue(item.dueDate, referenceDate) > 0
    )
    invoice.status = (allPaid ? 'pagada' : hasOverdue ? 'vencida' : 'pendiente') as T['status']
  } else {
    invoice.status = resolveInvoiceStatus(invoice.status, invoice.dueDate, referenceDate) as T['status']
  }

  invoice.daysOverdue = invoice.status === 'vencida' ? calculateDaysOverdue(invoice.dueDate, referenceDate) : 0
  return invoice
}
