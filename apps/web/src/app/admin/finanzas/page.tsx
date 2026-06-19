'use client'

import { AlertTriangle, BarChart3, CalendarClock, CircleDollarSign, FileSpreadsheet, Plus, ReceiptText, TrendingDown, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type ClientOption = {
  _id: string
  name: string
  taxId?: string
}

type ProjectOption = {
  _id: string
  name: string
  code?: string
  clientId: string | { _id: string; name: string }
}

type InvoiceStatus = 'pendiente' | 'pagada' | 'vencida' | 'anulada'
type InstallmentStatus = 'pendiente' | 'pagada' | 'pago_parcial' | 'vencida' | 'anulada'
type PaymentMethod = 'transferencia' | 'deposito' | 'efectivo' | 'webpay' | 'otro'
type ExpenseStatus = 'pendiente' | 'pagado' | 'anulado'
type ExpenseCategory = 'honorarios' | 'transporte' | 'combustible' | 'hospedaje' | 'alimentacion' | 'equipamiento' | 'software' | 'marketing' | 'servicios_externos' | 'permisos' | 'impuestos' | 'otros'

type InvoiceRecord = {
  _id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  daysOverdue: number
  status: InvoiceStatus
  notes: string
  clientId: ClientOption
  projectId: Pick<ProjectOption, '_id' | 'name' | 'code'>
}

type InstallmentRecord = {
  _id: string
  installmentNumber: number
  amount: number
  dueDate: string
  paidDate?: string
  status: InstallmentStatus
  paymentMethod: string
  notes: string
  clientId: ClientOption
  projectId: Pick<ProjectOption, '_id' | 'name' | 'code'>
  invoiceId: { _id: string; invoiceNumber: string; totalAmount: number }
}

type IncomeRecord = {
  _id: string
  date: string
  amount: number
  paymentMethod: PaymentMethod
  notes: string
  clientId: ClientOption
  projectId: Pick<ProjectOption, '_id' | 'name' | 'code'>
  invoiceId?: { _id: string; invoiceNumber: string; totalAmount: number }
  installmentId?: { _id: string; installmentNumber: number; amount: number; status: InstallmentStatus }
}

type ExpenseRecord = {
  _id: string
  date: string
  category: ExpenseCategory
  supplier: string
  amount: number
  status: ExpenseStatus
  notes: string
  clientId: ClientOption
  projectId: Pick<ProjectOption, '_id' | 'name' | 'code'>
}

type Summary = {
  activeClients: number
  activeProjects: number
  invoicesPendingAmount: number
  overdueInvoicesAmount: number
  pendingInstallments: number
  overdueInstallments: number
  monthlyIssued: number
  monthlyCollectedEstimate: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyUtility: number
  portfolioByStatus: Array<{ _id: string; total: number }>
  expenseByCategory: Array<{ _id: string; total: number }>
  projectProfitability: Array<{
    _id: string
    name: string
    code?: string
    totalIncome: number
    totalExpenses: number
    utility: number
    margin: number
  }>
}

type InvoiceForm = {
  clientId: string
  projectId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  netAmount: number
  status: InvoiceStatus
  createCalendarEvent: boolean
  notes: string
}

type InstallmentForm = {
  clientId: string
  projectId: string
  invoiceId: string
  installmentNumber: number
  amount: number
  dueDate: string
  paidDate: string
  status: InstallmentStatus
  createCalendarEvent: boolean
  paymentMethod: string
  notes: string
}

type IncomeForm = {
  date: string
  clientId: string
  projectId: string
  invoiceId: string
  installmentId: string
  amount: number
  paymentMethod: PaymentMethod
  notes: string
}

type ExpenseForm = {
  date: string
  category: ExpenseCategory
  supplier: string
  projectId: string
  clientId: string
  amount: number
  status: ExpenseStatus
  notes: string
}

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const dateValue = (value?: string) => (value ? value.slice(0, 10) : '')
const percent = (value: number) => `${Math.round(value || 0)}%`

const today = new Date().toISOString().slice(0, 10)

const emptySummary: Summary = {
  activeClients: 0,
  activeProjects: 0,
  invoicesPendingAmount: 0,
  overdueInvoicesAmount: 0,
  pendingInstallments: 0,
  overdueInstallments: 0,
  monthlyIssued: 0,
  monthlyCollectedEstimate: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlyUtility: 0,
  portfolioByStatus: [],
  expenseByCategory: [],
  projectProfitability: [],
}

const emptyInvoice: InvoiceForm = {
  clientId: '',
  projectId: '',
  invoiceNumber: '',
  issueDate: today,
  dueDate: today,
  netAmount: 0,
  status: 'pendiente',
  createCalendarEvent: false,
  notes: '',
}

const emptyInstallment: InstallmentForm = {
  clientId: '',
  projectId: '',
  invoiceId: '',
  installmentNumber: 1,
  amount: 0,
  dueDate: today,
  paidDate: '',
  status: 'pendiente',
  createCalendarEvent: false,
  paymentMethod: '',
  notes: '',
}

const emptyIncome: IncomeForm = {
  date: today,
  clientId: '',
  projectId: '',
  invoiceId: '',
  installmentId: '',
  amount: 0,
  paymentMethod: 'transferencia',
  notes: '',
}

const emptyExpense: ExpenseForm = {
  date: today,
  category: 'honorarios',
  supplier: '',
  projectId: '',
  clientId: '',
  amount: 0,
  status: 'pagado',
  notes: '',
}

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  honorarios: 'Honorarios',
  transporte: 'Transporte',
  combustible: 'Combustible',
  hospedaje: 'Hospedaje',
  alimentacion: 'Alimentación',
  equipamiento: 'Equipamiento',
  software: 'Software',
  marketing: 'Marketing',
  servicios_externos: 'Servicios externos',
  permisos: 'Permisos',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

export default function AdminFinanzasPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [googleStatus, setGoogleStatus] = useState<{ configured: boolean; calendarId: string; message: string } | null>(null)
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [installments, setInstallments] = useState<InstallmentRecord[]>([])
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoice)
  const [installmentForm, setInstallmentForm] = useState<InstallmentForm>(emptyInstallment)
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(emptyIncome)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState<'invoice' | 'installment' | 'income' | 'expense' | ''>('')

  const loadAll = useCallback(async () => {
    const [
      summaryData,
      googleData,
      clientsData,
      projectsData,
      invoicesData,
      installmentsData,
      incomesData,
      expensesData,
    ] = await Promise.all([
      requestJson<{ summary: Summary }>('/api/finance/admin/summary'),
      requestJson<{ google: { configured: boolean; calendarId: string; message: string } }>('/api/finance/admin/google/status'),
      requestJson<{ clients: ClientOption[] }>('/api/crm/admin/clients'),
      requestJson<{ projects: ProjectOption[] }>('/api/crm/admin/projects'),
      requestJson<{ invoices: InvoiceRecord[] }>('/api/finance/admin/invoices'),
      requestJson<{ installments: InstallmentRecord[] }>('/api/finance/admin/installments'),
      requestJson<{ incomes: IncomeRecord[] }>('/api/finance/admin/incomes'),
      requestJson<{ expenses: ExpenseRecord[] }>('/api/finance/admin/expenses'),
    ])

    setSummary(summaryData?.summary || emptySummary)
    setGoogleStatus(googleData?.google || null)
    setClients(clientsData?.clients || [])
    setProjects((projectsData?.projects || []) as ProjectOption[])
    setInvoices(invoicesData?.invoices || [])
    setInstallments(installmentsData?.installments || [])
    setIncomes(incomesData?.incomes || [])
    setExpenses(expensesData?.expenses || [])
  }, [requestJson])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadAll()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar el modulo financiero'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, loadAll])

  const projectsByClient = (clientId: string) => projects.filter((project) => {
    const currentClientId = typeof project.clientId === 'string' ? project.clientId : project.clientId._id
    return !clientId || currentClientId === clientId
  })

  const installmentInvoices = useMemo(
    () => invoices.filter((invoice) => (!installmentForm.clientId || invoice.clientId._id === installmentForm.clientId) && (!installmentForm.projectId || invoice.projectId._id === installmentForm.projectId)),
    [installmentForm.clientId, installmentForm.projectId, invoices]
  )

  const incomeInvoices = useMemo(
    () => invoices.filter((invoice) => (!incomeForm.clientId || invoice.clientId._id === incomeForm.clientId) && (!incomeForm.projectId || invoice.projectId._id === incomeForm.projectId)),
    [incomeForm.clientId, incomeForm.projectId, invoices]
  )

  const incomeInstallments = useMemo(
    () => installments.filter((installment) => (!incomeForm.clientId || installment.clientId._id === incomeForm.clientId) && (!incomeForm.projectId || installment.projectId._id === incomeForm.projectId) && (!incomeForm.invoiceId || installment.invoiceId._id === incomeForm.invoiceId)),
    [incomeForm.clientId, incomeForm.invoiceId, incomeForm.projectId, installments]
  )

  const invoiceVat = Math.round((invoiceForm.netAmount || 0) * 0.19)
  const invoiceTotal = (invoiceForm.netAmount || 0) + invoiceVat
  const maxPortfolio = Math.max(...summary.portfolioByStatus.map((item) => item.total), 1)
  const maxExpenseCategory = Math.max(...summary.expenseByCategory.map((item) => item.total), 1)

  const persist = async (label: typeof saving, url: string, body: unknown, successMessage: string, reset: () => void) => {
    setSaving(label)
    setMessage('')
    try {
      await requestJson(url, { method: 'POST', body: JSON.stringify(body) })
      reset()
      await loadAll()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el registro')
    } finally {
      setSaving('')
    }
  }

  const remove = async (url: string, successMessage: string) => {
    try {
      await requestJson(url, { method: 'DELETE' })
      await loadAll()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar el registro')
    }
  }

  return (
    <AdminShell title="Control Financiero">
      <div className="grid gap-6">
        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

        {googleStatus && (
          <section className={`rounded-3xl border px-5 py-4 text-sm ${googleStatus.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <p className="font-bold">{googleStatus.configured ? 'Google Calendar conectado' : 'Google Calendar pendiente / con incidencia'}</p>
            <p className="mt-1">{googleStatus.message}</p>
            <p className="mt-1 text-xs">Calendario: {googleStatus.calendarId}</p>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Ingresos del mes', value: money(summary.monthlyIncome), icon: CircleDollarSign, tone: 'bg-emerald-600' },
            { label: 'Egresos del mes', value: money(summary.monthlyExpense), icon: TrendingDown, tone: 'bg-rose-600' },
            { label: 'Utilidad del mes', value: money(summary.monthlyUtility), icon: Wallet, tone: 'bg-blue-600' },
            { label: 'Facturacion vencida', value: money(summary.overdueInvoicesAmount), icon: AlertTriangle, tone: 'bg-amber-500' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <article key={card.label} className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-300">{card.label}</p>
                  <div className={`rounded-2xl ${card.tone} p-2`}><Icon className="h-5 w-5" /></div>
                </div>
                <p className="mt-6 text-3xl font-black tracking-tight">{loading ? '...' : card.value}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Cartera y caja</h2>
                <p className="text-sm text-slate-500">Cartera facturada versus flujo real de ingresos y egresos.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {summary.portfolioByStatus.map((item) => (
                <div key={item._id} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span className="capitalize">{item._id}</span>
                    <span>{money(item.total)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item._id === 'pagada' ? 'bg-emerald-500' : item._id === 'vencida' ? 'bg-rose-500' : item._id === 'anulada' ? 'bg-slate-300' : 'bg-blue-600'}`} style={{ width: `${Math.max(8, Math.round(item.total / maxPortfolio * 100))}%` }} />
                  </div>
                </div>
              ))}
              {!summary.portfolioByStatus.length && <p className="text-sm text-slate-500">Aun no hay facturas registradas para graficar la cartera.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Pulso operativo</h2>
                <p className="text-sm text-slate-500">Seguimiento de cobranza, proyectos y centros de costo reales.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Clientes activos" value={String(summary.activeClients)} />
              <MetricCard label="Proyectos activos" value={String(summary.activeProjects)} />
              <MetricCard label="Cuotas pendientes" value={String(summary.pendingInstallments)} />
              <MetricCard label="Cuotas vencidas" value={String(summary.overdueInstallments)} accent="text-rose-600" />
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Registrar factura" subtitle="Calcula IVA y total automáticamente.">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Cliente" value={invoiceForm.clientId} onChange={(value) => setInvoiceForm((current) => ({ ...current, clientId: value, projectId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
              <SelectField label="Proyecto" value={invoiceForm.projectId} onChange={(value) => setInvoiceForm((current) => ({ ...current, projectId: value }))} options={projectsByClient(invoiceForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
              <InputField label="Numero factura" value={invoiceForm.invoiceNumber} onChange={(value) => setInvoiceForm((current) => ({ ...current, invoiceNumber: value }))} />
              <InputField label="Neto" type="number" value={String(invoiceForm.netAmount)} onChange={(value) => setInvoiceForm((current) => ({ ...current, netAmount: Number(value) }))} />
              <InputField label="Fecha emision" type="date" value={invoiceForm.issueDate} onChange={(value) => setInvoiceForm((current) => ({ ...current, issueDate: value }))} />
              <InputField label="Fecha vencimiento" type="date" value={invoiceForm.dueDate} onChange={(value) => setInvoiceForm((current) => ({ ...current, dueDate: value }))} />
              <SelectField label="Estado" value={invoiceForm.status} onChange={(value) => setInvoiceForm((current) => ({ ...current, status: value as InvoiceStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagada', label: 'Pagada' }, { value: 'vencida', label: 'Vencida' }, { value: 'anulada', label: 'Anulada' }]} />
              <InputField label="Observaciones" value={invoiceForm.notes} onChange={(value) => setInvoiceForm((current) => ({ ...current, notes: value }))} />
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
              <MiniMetric label="IVA" value={money(invoiceVat)} />
              <MiniMetric label="Total" value={money(invoiceTotal)} />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={invoiceForm.createCalendarEvent} onChange={(event) => setInvoiceForm((current) => ({ ...current, createCalendarEvent: event.target.checked }))} />
                Crear recordatorio en Calendar
              </label>
              <div className="flex items-end justify-end md:col-span-3">
                <PrimaryButton disabled={saving === 'invoice'} onClick={() => persist('invoice', '/api/finance/admin/invoices', invoiceForm, 'Factura registrada correctamente.', () => setInvoiceForm(emptyInvoice))}>
                  {saving === 'invoice' ? 'Guardando...' : 'Guardar factura'}
                </PrimaryButton>
              </div>
            </div>
          </FormCard>

          <FormCard title="Registrar cuota" subtitle="Base para cobranza y alertas de mora.">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Cliente" value={installmentForm.clientId} onChange={(value) => setInstallmentForm((current) => ({ ...current, clientId: value, projectId: '', invoiceId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
              <SelectField label="Proyecto" value={installmentForm.projectId} onChange={(value) => setInstallmentForm((current) => ({ ...current, projectId: value, invoiceId: '' }))} options={projectsByClient(installmentForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
              <SelectField label="Factura asociada" value={installmentForm.invoiceId} onChange={(value) => setInstallmentForm((current) => ({ ...current, invoiceId: value }))} options={installmentInvoices.map((invoice) => ({ value: invoice._id, label: `${invoice.invoiceNumber} · ${invoice.projectId.name}` }))} className="md:col-span-2" />
              <InputField label="Numero cuota" type="number" value={String(installmentForm.installmentNumber)} onChange={(value) => setInstallmentForm((current) => ({ ...current, installmentNumber: Number(value) }))} />
              <InputField label="Monto" type="number" value={String(installmentForm.amount)} onChange={(value) => setInstallmentForm((current) => ({ ...current, amount: Number(value) }))} />
              <InputField label="Vencimiento" type="date" value={installmentForm.dueDate} onChange={(value) => setInstallmentForm((current) => ({ ...current, dueDate: value }))} />
              <InputField label="Fecha pago" type="date" value={installmentForm.paidDate} onChange={(value) => setInstallmentForm((current) => ({ ...current, paidDate: value }))} />
              <SelectField label="Estado" value={installmentForm.status} onChange={(value) => setInstallmentForm((current) => ({ ...current, status: value as InstallmentStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagada', label: 'Pagada' }, { value: 'pago_parcial', label: 'Pago parcial' }, { value: 'vencida', label: 'Vencida' }, { value: 'anulada', label: 'Anulada' }]} />
              <InputField label="Medio de pago" value={installmentForm.paymentMethod} onChange={(value) => setInstallmentForm((current) => ({ ...current, paymentMethod: value }))} />
            </div>
            <div className="mt-4">
              <InputField label="Observaciones" value={installmentForm.notes} onChange={(value) => setInstallmentForm((current) => ({ ...current, notes: value }))} />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={installmentForm.createCalendarEvent} onChange={(event) => setInstallmentForm((current) => ({ ...current, createCalendarEvent: event.target.checked }))} />
                Crear recordatorio en Calendar
              </label>
              <PrimaryButton disabled={saving === 'installment'} onClick={() => persist('installment', '/api/finance/admin/installments', installmentForm, 'Cuota registrada correctamente.', () => setInstallmentForm(emptyInstallment))}>
                {saving === 'installment' ? 'Guardando...' : 'Guardar cuota'}
              </PrimaryButton>
            </div>
          </FormCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Registrar ingreso" subtitle="Si lo asocias a una cuota, la cobranza se recalcula sola.">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Fecha" type="date" value={incomeForm.date} onChange={(value) => setIncomeForm((current) => ({ ...current, date: value }))} />
              <SelectField label="Medio de pago" value={incomeForm.paymentMethod} onChange={(value) => setIncomeForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))} options={[{ value: 'transferencia', label: 'Transferencia' }, { value: 'deposito', label: 'Depósito' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'webpay', label: 'Webpay' }, { value: 'otro', label: 'Otro' }]} />
              <SelectField label="Cliente" value={incomeForm.clientId} onChange={(value) => setIncomeForm((current) => ({ ...current, clientId: value, projectId: '', invoiceId: '', installmentId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
              <SelectField label="Proyecto" value={incomeForm.projectId} onChange={(value) => setIncomeForm((current) => ({ ...current, projectId: value, invoiceId: '', installmentId: '' }))} options={projectsByClient(incomeForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
              <SelectField label="Factura asociada" value={incomeForm.invoiceId} onChange={(value) => setIncomeForm((current) => ({ ...current, invoiceId: value, installmentId: '' }))} options={[{ value: '', label: 'Sin factura directa' }, ...incomeInvoices.map((invoice) => ({ value: invoice._id, label: invoice.invoiceNumber }))]} />
              <SelectField label="Cuota asociada" value={incomeForm.installmentId} onChange={(value) => setIncomeForm((current) => ({ ...current, installmentId: value }))} options={[{ value: '', label: 'Sin cuota' }, ...incomeInstallments.map((installment) => ({ value: installment._id, label: `Cuota ${installment.installmentNumber} · ${installment.invoiceId.invoiceNumber}` }))]} />
              <InputField label="Monto" type="number" value={String(incomeForm.amount)} onChange={(value) => setIncomeForm((current) => ({ ...current, amount: Number(value) }))} />
              <InputField label="Observaciones" value={incomeForm.notes} onChange={(value) => setIncomeForm((current) => ({ ...current, notes: value }))} />
            </div>
            <div className="mt-5 flex justify-end">
              <PrimaryButton disabled={saving === 'income'} onClick={() => persist('income', '/api/finance/admin/incomes', incomeForm, 'Ingreso registrado y cobranza actualizada.', () => setIncomeForm(emptyIncome))}>
                {saving === 'income' ? 'Guardando...' : 'Guardar ingreso'}
              </PrimaryButton>
            </div>
          </FormCard>

          <FormCard title="Registrar egreso" subtitle="Cada egreso alimenta utilidad y centro de costo del proyecto.">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Fecha" type="date" value={expenseForm.date} onChange={(value) => setExpenseForm((current) => ({ ...current, date: value }))} />
              <SelectField label="Categoria" value={expenseForm.category} onChange={(value) => setExpenseForm((current) => ({ ...current, category: value as ExpenseCategory }))} options={(Object.keys(expenseCategoryLabels) as ExpenseCategory[]).map((key) => ({ value: key, label: expenseCategoryLabels[key] }))} />
              <SelectField label="Cliente" value={expenseForm.clientId} onChange={(value) => setExpenseForm((current) => ({ ...current, clientId: value, projectId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
              <SelectField label="Proyecto" value={expenseForm.projectId} onChange={(value) => setExpenseForm((current) => ({ ...current, projectId: value }))} options={projectsByClient(expenseForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
              <InputField label="Proveedor" value={expenseForm.supplier} onChange={(value) => setExpenseForm((current) => ({ ...current, supplier: value }))} />
              <InputField label="Monto" type="number" value={String(expenseForm.amount)} onChange={(value) => setExpenseForm((current) => ({ ...current, amount: Number(value) }))} />
              <SelectField label="Estado" value={expenseForm.status} onChange={(value) => setExpenseForm((current) => ({ ...current, status: value as ExpenseStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagado', label: 'Pagado' }, { value: 'anulado', label: 'Anulado' }]} />
              <InputField label="Observaciones" value={expenseForm.notes} onChange={(value) => setExpenseForm((current) => ({ ...current, notes: value }))} />
            </div>
            <div className="mt-5 flex justify-end">
              <PrimaryButton disabled={saving === 'expense'} onClick={() => persist('expense', '/api/finance/admin/expenses', expenseForm, 'Egreso registrado correctamente.', () => setExpenseForm(emptyExpense))}>
                {saving === 'expense' ? 'Guardando...' : 'Guardar egreso'}
              </PrimaryButton>
            </div>
          </FormCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TableCard title="Cobranza reciente">
            <DataTable
              headers={['Registro', 'Monto', 'Estado', 'Acción']}
              emptyText="Aun no hay cuotas registradas."
              rows={installments.slice(0, 6).map((installment) => ({
                key: installment._id,
                cells: [
                  <div key="label"><p className="font-semibold text-slate-900">Cuota {installment.installmentNumber}</p><p className="text-xs text-slate-500">{installment.invoiceId?.invoiceNumber} · {dateValue(installment.dueDate)}</p></div>,
                  <span key="amount" className="font-semibold text-slate-900">{money(installment.amount)}</span>,
                  <StatusBadge key="status" status={installment.status} />,
                  <ActionButton key="action" onClick={() => remove(`/api/finance/admin/installments/${installment._id}`, 'Cuota eliminada.')}>Eliminar</ActionButton>,
                ],
              }))}
            />
          </TableCard>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Rentabilidad por proyecto</h2>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4">
              {summary.projectProfitability.slice(0, 5).map((project) => (
                <div key={project._id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{project.code ? `${project.code} · ` : ''}{project.name}</p>
                    <p className="text-xs text-slate-500">Ingresos {money(project.totalIncome)} · Egresos {money(project.totalExpenses)} · Margen {percent(project.margin)}</p>
                  </div>
                  <p className={`text-sm font-black ${project.utility >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(project.utility)}</p>
                </div>
              ))}
              {!summary.projectProfitability.length && <p className="text-sm text-slate-500">La rentabilidad aparecerá cuando existan ingresos y egresos asociados a proyectos.</p>}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <TableCard title="Ingresos recientes">
            <DataTable
              headers={['Ingreso', 'Monto', 'Método', 'Acción']}
              emptyText="Aun no hay ingresos registrados."
              rows={incomes.slice(0, 6).map((income) => ({
                key: income._id,
                cells: [
                  <div key="label"><p className="font-semibold text-slate-900">{income.clientId?.name}</p><p className="text-xs text-slate-500">{income.installmentId ? `Cuota ${income.installmentId.installmentNumber}` : income.invoiceId ? income.invoiceId.invoiceNumber : 'Sin referencia'} · {dateValue(income.date)}</p></div>,
                  <span key="amount" className="font-semibold text-emerald-700">{money(income.amount)}</span>,
                  <span key="method" className="text-slate-700 capitalize">{income.paymentMethod}</span>,
                  <ActionButton key="action" onClick={() => remove(`/api/finance/admin/incomes/${income._id}`, 'Ingreso eliminado y cobranza recalculada.')}>Eliminar</ActionButton>,
                ],
              }))}
            />
          </TableCard>

          <TableCard title="Egresos recientes">
            <DataTable
              headers={['Egreso', 'Monto', 'Estado', 'Acción']}
              emptyText="Aun no hay egresos registrados."
              rows={expenses.slice(0, 6).map((expense) => ({
                key: expense._id,
                cells: [
                  <div key="label"><p className="font-semibold text-slate-900">{expense.supplier || expense.clientId?.name}</p><p className="text-xs text-slate-500">{expenseCategoryLabels[expense.category]} · {dateValue(expense.date)}</p></div>,
                  <span key="amount" className="font-semibold text-rose-700">{money(expense.amount)}</span>,
                  <StatusBadge key="status" status={expense.status} />,
                  <ActionButton key="action" onClick={() => remove(`/api/finance/admin/expenses/${expense._id}`, 'Egreso eliminado.')}>Eliminar</ActionButton>,
                ],
              }))}
            />
          </TableCard>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-slate-800" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Egresos por categoría</h2>
                <p className="text-sm text-slate-500">Lectura rápida del gasto operativo acumulado.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {summary.expenseByCategory.slice(0, 6).map((item) => (
                <div key={item._id} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{expenseCategoryLabels[item._id as ExpenseCategory] || item._id}</span>
                    <span>{money(item.total)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(8, Math.round(item.total / maxExpenseCategory * 100))}%` }} />
                  </div>
                </div>
              ))}
              {!summary.expenseByCategory.length && <p className="text-sm text-slate-500">Aun no hay egresos suficientes para agrupar categorías.</p>}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TableCard title="Facturas recientes">
            <DataTable
              headers={['Factura', 'Cliente', 'Total', 'Acción']}
              emptyText="Aun no hay facturas registradas."
              rows={invoices.slice(0, 6).map((invoice) => ({
                key: invoice._id,
                cells: [
                  <div key="label"><p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p><p className="text-xs text-slate-500">Vence {dateValue(invoice.dueDate)} · {invoice.status}</p></div>,
                  <span key="client" className="text-slate-700">{invoice.clientId?.name}</span>,
                  <span key="amount" className="font-semibold text-slate-900">{money(invoice.totalAmount)}</span>,
                  <ActionButton key="action" onClick={() => remove(`/api/finance/admin/invoices/${invoice._id}`, 'Factura eliminada.')}>Eliminar</ActionButton>,
                ],
              }))}
            />
          </TableCard>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Lectura de etapa 3</h2>
                <p className="text-sm text-slate-500">La rentabilidad ahora se mueve con caja real, no solo con facturación emitida.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MetricCard label="Facturación pendiente" value={money(summary.invoicesPendingAmount)} />
              <MetricCard label="Cobrado del mes" value={money(summary.monthlyCollectedEstimate)} accent="text-emerald-700" />
              <MetricCard label="Emitido del mes" value={money(summary.monthlyIssued)} />
              <MetricCard label="Utilidad del mes" value={money(summary.monthlyUtility)} accent={summary.monthlyUtility >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
            </div>
          </article>
        </section>
      </div>
    </AdminShell>
  )
}

function FormCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <Plus className="h-4 w-4" />
          Nuevo
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </article>
  )
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </article>
  )
}

function MetricCard({ label, value, accent = 'text-slate-950' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
    </label>
  )
}

function SelectField({ label, value, onChange, options, className = '' }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">
        <option value="">Selecciona</option>
        {options.map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{children}</button>
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-xs font-bold text-rose-600">{children}</button>
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'pagada' || status === 'pagado'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'vencida'
        ? 'bg-rose-100 text-rose-700'
        : status === 'pago_parcial'
          ? 'bg-amber-100 text-amber-700'
          : status === 'anulada' || status === 'anulado'
            ? 'bg-slate-200 text-slate-700'
            : 'bg-blue-100 text-blue-700'

  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${className}`}>{status}</span>
}

function DataTable({ headers, rows, emptyText }: { headers: string[]; rows: Array<{ key: string; cells: React.ReactNode[] }>; emptyText: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            {headers.map((header) => <th key={header} className="pb-3 pr-4">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate-100">
              {row.cells.map((cell, index) => <td key={index} className="py-3 pr-4">{cell}</td>)}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-sm text-slate-500">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
