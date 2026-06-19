import { InstallmentModel } from '@api/models/Installment'
import { InvoiceModel } from '@api/models/Invoice'
import { IncomeModel } from '@api/models/Income'
import { calculateDaysOverdue, startOfTodayUtc } from '@/lib/finance'
import { applyRuntimeInstallmentState } from '@/lib/financeReadModels'

export const syncInstallmentPaymentStatus = async (installmentId: string) => {
  const installment = await InstallmentModel.findById(installmentId)
  if (!installment) return null

  const [paidAmount] = await IncomeModel.aggregate([
    { $match: { installmentId: installment._id, status: 'active' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const totalPaid = paidAmount?.total || 0
  const today = startOfTodayUtc()
  const overdue = calculateDaysOverdue(installment.dueDate, today) > 0

  installment.paidDate = totalPaid > 0 ? today : undefined
  if (totalPaid <= 0) {
    installment.status = overdue ? 'vencida' : 'pendiente'
  } else if (totalPaid < installment.amount) {
    installment.status = 'pago_parcial'
  } else {
    installment.status = 'pagada'
  }

  installment.updatedBy = installment.updatedBy || 'system'
  await installment.save()
  return installment
}

export const syncInvoicePaymentStatus = async (invoiceId: string) => {
  const invoice = await InvoiceModel.findById(invoiceId)
  if (!invoice || invoice.status === 'anulada') return invoice

  const installments = await InstallmentModel.find({ invoiceId: invoice._id })
  const today = startOfTodayUtc()

  if (installments.length) {
    const runtimeInstallments = installments.map((item) => applyRuntimeInstallmentState(item, today))
    const allPaid = runtimeInstallments.every((item) => item.status === 'pagada')
    const hasOverdue = runtimeInstallments.some(
      (item) => item.status !== 'pagada' && item.status !== 'anulada' && calculateDaysOverdue(item.dueDate, today) > 0
    )
    invoice.status = allPaid ? 'pagada' : hasOverdue ? 'vencida' : 'pendiente'
  } else {
    const [paidAmount] = await IncomeModel.aggregate([
      { $match: { invoiceId: invoice._id, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const totalPaid = paidAmount?.total || 0
    if (totalPaid >= invoice.totalAmount) {
      invoice.status = 'pagada'
    } else if (calculateDaysOverdue(invoice.dueDate, today) > 0) {
      invoice.status = 'vencida'
    } else {
      invoice.status = 'pendiente'
    }
  }

  invoice.daysOverdue = invoice.status === 'vencida' ? calculateDaysOverdue(invoice.dueDate, today) : 0
  await invoice.save()
  return invoice
}
