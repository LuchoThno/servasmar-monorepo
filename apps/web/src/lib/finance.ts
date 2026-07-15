type InvoiceStatus = 'pendiente' | 'pagada' | 'vencida' | 'anulada'
type InstallmentStatus = 'pendiente' | 'pagada' | 'pago_parcial' | 'vencida' | 'anulada'

export const IVA_RATE = 0.19

export const parseDateInput = (value?: string) => {
  if (!value) return undefined
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value)
}

export const startOfTodayUtc = () => {
  const today = new Date()
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
}

export const calculateInvoiceTotals = (netAmount: number) => {
  const safeNet = Number.isFinite(netAmount) ? Math.max(0, netAmount) : 0
  const vatAmount = Math.round(safeNet * IVA_RATE)
  const totalAmount = safeNet + vatAmount
  return { netAmount: safeNet, vatAmount, totalAmount }
}

export const calculateDaysOverdue = (dueDate?: Date | string, referenceDate = startOfTodayUtc()) => {
  if (!dueDate) return 0
  const due = dueDate instanceof Date ? dueDate : parseDateInput(dueDate)
  if (!due) return 0
  const diffMs = referenceDate.getTime() - due.getTime()
  return diffMs > 0 ? Math.floor(diffMs / 86_400_000) : 0
}

export const resolveInvoiceStatus = (
  status: InvoiceStatus,
  dueDate?: Date | string,
  referenceDate = startOfTodayUtc()
): InvoiceStatus => {
  if (status === 'pagada' || status === 'anulada') return status
  return calculateDaysOverdue(dueDate, referenceDate) > 0 ? 'vencida' : 'pendiente'
}

export const resolveInstallmentStatus = (
  status: InstallmentStatus,
  dueDate?: Date | string,
  referenceDate = startOfTodayUtc()
): InstallmentStatus => {
  if (status === 'pagada' || status === 'pago_parcial' || status === 'anulada') return status
  return calculateDaysOverdue(dueDate, referenceDate) > 0 ? 'vencida' : 'pendiente'
}

export const formatRut = (value: string) => value.replace(/\./g, '').replace(/\s+/g, '').toUpperCase()

export const isValidChileanRut = (value: string) => {
  const clean = formatRut(value)
  if (!/^\d{7,8}-[\dK]$/.test(clean)) return false

  const [body, verifier] = clean.split('-')
  let sum = 0
  let multiplier = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const expected = 11 - (sum % 11)
  const expectedVerifier = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return verifier === expectedVerifier
}
