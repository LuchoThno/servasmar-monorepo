'use client'

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileClock,
  FileSpreadsheet,
  FolderKanban,
  Landmark,
  Plus,
  Printer,
  ReceiptText,
  Save,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
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
type FinanceView = 'cobrar' | 'pagar' | 'movimientos' | 'reportes'
type ComposerKind = 'invoice' | 'installment' | 'income' | 'expense'

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
  updatedAt?: string
  updatedBy?: string
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
  updatedAt?: string
  updatedBy?: string
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
  updatedAt?: string
  updatedBy?: string
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
  updatedAt?: string
  updatedBy?: string
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

type CollectionsSummary = {
  alertSummary: {
    overdueInvoices: number
    overdueInstallments: number
    severeInvoices: number
    pendingActions: number
  }
  overdueInvoices: InvoiceRecord[]
  overdueInstallments: InstallmentRecord[]
  pendingActions: Array<{
    _id: string
    action: string
    entityType: string
    createdAt: string
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
    invoiceId?: { invoiceNumber: string }
    installmentId?: { installmentNumber: number }
  }>
}

type ReportsSummary = {
  cashFlow: Array<{ month: string; income: number; expense: number; net: number }>
  resultSummary: { income: number; expense: number; net: number }
  overdueInvoices: InvoiceRecord[]
  incomeByClient: Array<{ _id: string; total: number; name: string; taxId?: string }>
  expensesByCategory: Array<{ _id: string; total: number }>
  projectResults: Summary['projectProfitability']
  collectionsByClient: Array<{ _id: string; pending: number; overdueCount: number; name: string }>
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

const emptyCollections: CollectionsSummary = {
  alertSummary: {
    overdueInvoices: 0,
    overdueInstallments: 0,
    severeInvoices: 0,
    pendingActions: 0,
  },
  overdueInvoices: [],
  overdueInstallments: [],
  pendingActions: [],
}

const emptyReports: ReportsSummary = {
  cashFlow: [],
  resultSummary: { income: 0, expense: 0, net: 0 },
  overdueInvoices: [],
  incomeByClient: [],
  expensesByCategory: [],
  projectResults: [],
  collectionsByClient: [],
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
  alimentacion: 'Alimentacion',
  equipamiento: 'Equipamiento',
  software: 'Software',
  marketing: 'Marketing',
  servicios_externos: 'Servicios externos',
  permisos: 'Permisos',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

const viewItems: Array<{ id: FinanceView; label: string; detail: string }> = [
  { id: 'cobrar', label: 'Cuentas por cobrar', detail: 'Cobranza, deuda y vencimientos' },
  { id: 'pagar', label: 'Cuentas por pagar', detail: 'Egresos, proveedores y compromisos' },
  { id: 'movimientos', label: 'Registros', detail: 'Facturas, cuotas, ingresos y egresos' },
  { id: 'reportes', label: 'Reportes', detail: 'Rentabilidad, caja y cartera' },
]

const composerItems: Array<{ id: ComposerKind; label: string; detail: string }> = [
  { id: 'invoice', label: 'Factura', detail: 'Cuenta por cobrar base' },
  { id: 'installment', label: 'Cuota', detail: 'Plan de cobranza' },
  { id: 'income', label: 'Ingreso', detail: 'Pago recibido' },
  { id: 'expense', label: 'Egreso', detail: 'Salida operativa' },
]

export default function AdminFinanzasPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [googleStatus, setGoogleStatus] = useState<{ configured: boolean; calendarId: string; message: string } | null>(null)
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [collections, setCollections] = useState<CollectionsSummary>(emptyCollections)
  const [reports, setReports] = useState<ReportsSummary>(emptyReports)
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
  const [view, setView] = useState<FinanceView>('movimientos')
  const [composer, setComposer] = useState<ComposerKind>('invoice')
  const [invoiceStep, setInvoiceStep] = useState(0)
  const [installmentStep, setInstallmentStep] = useState(0)
  const [incomeStep, setIncomeStep] = useState(0)
  const [expenseStep, setExpenseStep] = useState(0)
  const [receivableSearch, setReceivableSearch] = useState('')
  const [receivableStatus, setReceivableStatus] = useState('')
  const [payableSearch, setPayableSearch] = useState('')
  const [payableStatus, setPayableStatus] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState<'invoice' | 'installment' | 'income' | 'expense' | ''>('')
  const [statusSavingKey, setStatusSavingKey] = useState('')
  const [invoiceStatusDrafts, setInvoiceStatusDrafts] = useState<Record<string, InvoiceStatus>>({})
  const [installmentStatusDrafts, setInstallmentStatusDrafts] = useState<Record<string, InstallmentStatus>>({})
  const [expenseStatusDrafts, setExpenseStatusDrafts] = useState<Record<string, ExpenseStatus>>({})
  const [draftReady, setDraftReady] = useState(false)
  const [currentSearch, setCurrentSearch] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncSearch = () => {
      const nextSearch = window.location.search
      setCurrentSearch(nextSearch)
      const requestedView = new URLSearchParams(nextSearch).get('view')
      if (requestedView === 'cobrar' || requestedView === 'pagar' || requestedView === 'movimientos' || requestedView === 'reportes') {
        setView(requestedView)
        return
      }
      setView('movimientos')
    }
    syncSearch()
    window.addEventListener('popstate', syncSearch)
    return () => window.removeEventListener('popstate', syncSearch)
  }, [])

  useEffect(() => {
    const requestedView = new URLSearchParams(currentSearch).get('view')
    if (requestedView === 'cobrar' || requestedView === 'pagar' || requestedView === 'movimientos' || requestedView === 'reportes') {
      setView(requestedView)
      return
    }
    setView('movimientos')
  }, [currentSearch])

  const loadAll = useCallback(async () => {
    const [
      summaryData,
      collectionsData,
      reportsData,
      googleData,
      clientsData,
      projectsData,
      invoicesData,
      installmentsData,
      incomesData,
      expensesData,
    ] = await Promise.all([
      requestJson<{ summary: Summary }>('/api/finance/admin/summary'),
      requestJson<CollectionsSummary & { success: boolean }>('/api/finance/admin/collections/summary'),
      requestJson<{ reports: ReportsSummary }>('/api/finance/admin/reports/summary'),
      requestJson<{ google: { configured: boolean; calendarId: string; message: string } }>('/api/finance/admin/google/status'),
      requestJson<{ clients: ClientOption[] }>('/api/crm/admin/clients'),
      requestJson<{ projects: ProjectOption[] }>('/api/crm/admin/projects'),
      requestJson<{ invoices: InvoiceRecord[] }>('/api/finance/admin/invoices'),
      requestJson<{ installments: InstallmentRecord[] }>('/api/finance/admin/installments'),
      requestJson<{ incomes: IncomeRecord[] }>('/api/finance/admin/incomes'),
      requestJson<{ expenses: ExpenseRecord[] }>('/api/finance/admin/expenses'),
    ])

    setSummary(summaryData?.summary || emptySummary)
    setCollections(collectionsData ? {
      alertSummary: collectionsData.alertSummary || emptyCollections.alertSummary,
      overdueInvoices: collectionsData.overdueInvoices || [],
      overdueInstallments: collectionsData.overdueInstallments || [],
      pendingActions: collectionsData.pendingActions || [],
    } : emptyCollections)
    setReports(reportsData?.reports || emptyReports)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const restoreDraft = <T,>(key: string, emptyValue: T, setter: (value: T) => void) => {
      const rawValue = window.localStorage.getItem(key)
      if (!rawValue) return
      try {
        setter({ ...emptyValue, ...JSON.parse(rawValue) })
      } catch {
        window.localStorage.removeItem(key)
        setMessage('Encontramos un borrador dañado y lo reiniciamos para mantener estable el módulo financiero.')
      }
    }

    restoreDraft('servasmar-finance-invoice-draft', emptyInvoice, setInvoiceForm)
    restoreDraft('servasmar-finance-installment-draft', emptyInstallment, setInstallmentForm)
    restoreDraft('servasmar-finance-income-draft', emptyIncome, setIncomeForm)
    restoreDraft('servasmar-finance-expense-draft', emptyExpense, setExpenseForm)
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady || typeof window === 'undefined') return
    window.localStorage.setItem('servasmar-finance-invoice-draft', JSON.stringify(invoiceForm))
  }, [draftReady, invoiceForm])

  useEffect(() => {
    if (!draftReady || typeof window === 'undefined') return
    window.localStorage.setItem('servasmar-finance-installment-draft', JSON.stringify(installmentForm))
  }, [draftReady, installmentForm])

  useEffect(() => {
    if (!draftReady || typeof window === 'undefined') return
    window.localStorage.setItem('servasmar-finance-income-draft', JSON.stringify(incomeForm))
  }, [draftReady, incomeForm])

  useEffect(() => {
    if (!draftReady || typeof window === 'undefined') return
    window.localStorage.setItem('servasmar-finance-expense-draft', JSON.stringify(expenseForm))
  }, [draftReady, expenseForm])

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
  const cashMax = Math.max(...reports.cashFlow.map((item) => Math.max(item.income, item.expense, Math.abs(item.net))), 1)

  const pendingInstallmentRows = useMemo(
    () => installments
      .filter((item) => item.status !== 'pagada' && item.status !== 'anulada')
      .filter((item) => {
        const term = receivableSearch.trim().toLowerCase()
        const matchesSearch = !term || [item.clientId?.name, item.projectId?.name, item.invoiceId?.invoiceNumber, item.notes]
          .join(' ')
          .toLowerCase()
          .includes(term)
        const matchesStatus = !receivableStatus || item.status === receivableStatus
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [installments, receivableSearch, receivableStatus]
  )

  const pendingExpenseRows = useMemo(
    () => expenses
      .filter((item) => item.status !== 'anulado')
      .filter((item) => {
        const term = payableSearch.trim().toLowerCase()
        const matchesSearch = !term || [item.supplier, item.clientId?.name, item.projectId?.name, item.notes, expenseCategoryLabels[item.category]]
          .join(' ')
          .toLowerCase()
          .includes(term)
        const matchesStatus = !payableStatus || item.status === payableStatus
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses, payableSearch, payableStatus]
  )

  const recentRecords = useMemo(() => {
    const rows = [
      ...invoices.map((item) => ({ id: item._id, type: 'Factura', title: item.invoiceNumber, client: item.clientId?.name || 'Cliente', date: item.issueDate, amount: item.totalAmount, status: item.status })),
      ...installments.map((item) => ({ id: item._id, type: 'Cuota', title: `Cuota ${item.installmentNumber}`, client: item.clientId?.name || 'Cliente', date: item.dueDate, amount: item.amount, status: item.status })),
      ...incomes.map((item) => ({
        id: item._id,
        type: 'Ingreso',
        title: item.invoiceId?.invoiceNumber || (item.installmentId ? `Cobro ${item.installmentId.installmentNumber}` : 'Ingreso directo'),
        client: item.clientId?.name || 'Cliente',
        date: item.date,
        amount: item.amount,
        status: 'pagado',
      })),
      ...expenses.map((item) => ({ id: item._id, type: 'Egreso', title: expenseCategoryLabels[item.category], client: item.supplier || item.clientId?.name || 'Proveedor', date: item.date, amount: item.amount, status: item.status })),
    ]

    return rows
      .filter((row) => {
        const term = recordSearch.trim().toLowerCase()
        return !term || [row.type, row.title, row.client, row.status].join(' ').toLowerCase().includes(term)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)
  }, [expenses, incomes, installments, invoices, recordSearch])

  const persist = async (label: typeof saving, url: string, body: unknown, successMessage: string, reset: () => void, draftKey: string) => {
    setSaving(label)
    setMessage('')
    try {
      await requestJson(url, { method: 'POST', body: JSON.stringify(body) })
      reset()
      if (typeof window !== 'undefined') window.localStorage.removeItem(draftKey)
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

  const updateStatus = async (key: string, url: string, body: unknown, successMessage: string, cleanup?: () => void) => {
    setStatusSavingKey(key)
    try {
      await requestJson(url, { method: 'PATCH', body: JSON.stringify(body) })
      cleanup?.()
      await loadAll()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el estado')
    } finally {
      setStatusSavingKey('')
    }
  }

  const saveDraft = (key: string, data: unknown, successMessage: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, JSON.stringify(data))
    setMessage(successMessage)
  }

  const clearDraft = (key: string, reset: () => void, successMessage: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key)
    reset()
    setMessage(successMessage)
  }

  const changeView = (nextView: FinanceView) => {
    setView(nextView)
    const params = new URLSearchParams(currentSearch)
    if (nextView === 'movimientos') {
      params.delete('view')
    } else {
      params.set('view', nextView)
    }
    const query = params.toString()
    setCurrentSearch(query ? `?${query}` : '')
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const openFinancePdf = () => window.open('/admin/finanzas/pdf', '_blank', 'noopener,noreferrer')

  const invoiceStepError = (step: number) => {
    if (step === 0 && (!invoiceForm.clientId || !invoiceForm.projectId)) return 'Selecciona cliente y proyecto para crear la cuenta por cobrar.'
    if (step === 1 && (!invoiceForm.invoiceNumber.trim() || !invoiceForm.issueDate || !invoiceForm.dueDate)) return 'Completa numero, fecha de emision y vencimiento.'
    if (step === 2 && invoiceForm.netAmount <= 0) return 'El monto neto debe ser mayor a cero.'
    return ''
  }

  const installmentStepError = (step: number) => {
    if (step === 0 && (!installmentForm.clientId || !installmentForm.projectId || !installmentForm.invoiceId)) return 'Relaciona la cuota con cliente, proyecto y factura.'
    if (step === 1 && (installmentForm.installmentNumber <= 0 || installmentForm.amount <= 0 || !installmentForm.dueDate)) return 'Define numero de cuota, monto y vencimiento.'
    return ''
  }

  const incomeStepError = (step: number) => {
    if (step === 0 && (!incomeForm.clientId || !incomeForm.projectId)) return 'Todo ingreso debe estar asociado a cliente y proyecto.'
    if (step === 1 && incomeForm.amount <= 0) return 'El monto recibido debe ser mayor a cero.'
    if (step === 2 && !incomeForm.date) return 'Selecciona la fecha del pago.'
    return ''
  }

  const expenseStepError = (step: number) => {
    if (step === 0 && !expenseForm.category) return 'Selecciona una categoria de gasto.'
    if (step === 1 && (!expenseForm.clientId || !expenseForm.projectId)) return 'Asocia el egreso a un cliente y proyecto.'
    if (step === 2 && expenseForm.amount <= 0) return 'El monto del egreso debe ser mayor a cero.'
    return ''
  }

  const latestInvoices = invoices.slice(0, 8)
  const latestInstallments = installments.slice(0, 8)
  const latestExpenses = expenses.slice(0, 8)

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-700">Cargando finanzas...</main>
  }

  return (
    <AdminShell title="Finanzas">
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm xl:sticky xl:top-6 xl:h-fit">
          <div className="rounded-[24px] bg-[radial-gradient(circle_at_top_left,_#0f766e,_#0f172a_60%,_#020617)] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Servasmar Finance</p>
            <h2 className="mt-3 text-2xl font-black leading-tight">Modulo central para caja, deuda y rentabilidad.</h2>
            <p className="mt-2 text-sm text-slate-200">Conecta cartera, operaciones, proyectos y alertas en una sola vista.</p>
          </div>

          <nav className="mt-4 grid gap-2">
            {viewItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeView(item.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${view === item.id ? 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-transparent bg-stone-50 text-stone-700 hover:border-stone-200 hover:bg-white'}`}
              >
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="mt-1 block text-xs text-stone-500">{item.detail}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Alertas activas</p>
            <div className="mt-3 grid gap-3">
              <CompactKpi label="Facturas vencidas" value={String(collections.alertSummary.overdueInvoices)} tone="red" />
              <CompactKpi label="Cuotas vencidas" value={String(collections.alertSummary.overdueInstallments)} tone="amber" />
              <CompactKpi label="Acciones pendientes" value={String(collections.alertSummary.pendingActions)} tone="blue" />
            </div>
          </div>
        </aside>

        <section className="grid gap-6">
          {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-600">
                  <Landmark className="h-3.5 w-3.5" />
                  Operacion financiera
                </div>
                <h1 className="mt-3 text-2xl font-black text-stone-950">Administracion de cobros, pagos y registros conectados al CRM.</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                  Cada movimiento queda asociado a cliente y proyecto, se relee desde Mongo despues de guardar y alimenta el dashboard principal del CRM.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={openFinancePdf}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-stone-800"
                >
                  <Printer className="h-4 w-4" />
                  Abrir PDF finanzas
                </button>
                <div className={`rounded-2xl border px-4 py-3 text-sm ${googleStatus?.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <p className="font-bold">{googleStatus?.configured ? 'Calendar operativo' : 'Calendar pendiente'}</p>
                  <p className="mt-1 max-w-xs">{googleStatus?.message || 'Sin diagnostico disponible.'}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminSummaryRow label="Por cobrar" value={money(summary.invoicesPendingAmount)} />
              <AdminSummaryRow label="Vencido" value={money(summary.overdueInvoicesAmount)} />
              <AdminSummaryRow label="Por pagar" value={money(pendingExpenseRows.filter((item) => item.status === 'pendiente').reduce((total, item) => total + item.amount, 0))} />
              <AdminSummaryRow label="Guardado en Mongo" value={`${invoices.length + installments.length + incomes.length + expenses.length} registros`} />
            </div>
          </section>

          {view === 'cobrar' && (
            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiPanel label="Cartera pendiente" value={money(summary.invoicesPendingAmount)} detail="Facturas no cerradas" icon={FileClock} tone="amber" />
                <KpiPanel label="Facturas vencidas" value={money(summary.overdueInvoicesAmount)} detail="Prioridad inmediata" icon={AlertTriangle} tone="rose" />
                <KpiPanel label="Cuotas pendientes" value={String(summary.pendingInstallments)} detail="Cobros por ejecutar" icon={CreditCard} tone="blue" />
                <KpiPanel label="Cuotas vencidas" value={String(summary.overdueInstallments)} detail="Seguimiento intensivo" icon={ShieldAlert} tone="slate" />
              </section>

              <Card title="Pipeline de cobranza" subtitle="Filtra clientes con deuda, servicios pendientes y cuotas vencidas.">
                <div className="grid gap-3 border-b border-stone-200 pb-4 md:grid-cols-[1fr_220px]">
                  <TextInput label="Buscar" value={receivableSearch} onChange={setReceivableSearch} placeholder="Cliente, proyecto, factura o nota" />
                  <SelectInput
                    label="Estado"
                    value={receivableStatus}
                    onChange={setReceivableStatus}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'pendiente', label: 'Pendiente' },
                      { value: 'pago_parcial', label: 'Parcial' },
                      { value: 'vencida', label: 'Vencida' },
                    ]}
                  />
                </div>
                <div className="mt-5 grid gap-3">
                  {pendingInstallmentRows.slice(0, 12).map((item) => (
                    <div key={item._id} className="grid gap-3 rounded-2xl border border-stone-200 p-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr_auto] lg:items-center">
                      <div>
                        <p className="font-bold text-stone-950">{item.clientId?.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{item.projectId?.name} · {item.invoiceId?.invoiceNumber} · vence {dateValue(item.dueDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Monto</p>
                        <p className="mt-1 font-black text-stone-950">{money(item.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Estado</p>
                        <div className="mt-1">
                          <InlineStatusEditor
                            value={installmentStatusDrafts[item._id] ?? item.status}
                            options={[
                              { value: 'pendiente', label: 'Pendiente' },
                              { value: 'pago_parcial', label: 'Parcial' },
                              { value: 'pagada', label: 'Pagada' },
                              { value: 'vencida', label: 'Vencida' },
                              { value: 'anulada', label: 'Anulada' },
                            ]}
                            onChange={(value) => setInstallmentStatusDrafts((current) => ({ ...current, [item._id]: value as InstallmentStatus }))}
                            onSave={() => updateStatus(
                              `installment:${item._id}`,
                              `/api/finance/admin/installments/${item._id}`,
                              { status: installmentStatusDrafts[item._id] ?? item.status },
                              'Estado de cuota actualizado en Mongo y sincronizado con la factura.',
                              () => setInstallmentStatusDrafts((current) => {
                                const next = { ...current }
                                delete next[item._id]
                                return next
                              })
                            )}
                            saving={statusSavingKey === `installment:${item._id}`}
                            meta={formatAuditMeta(item.updatedBy, item.updatedAt)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <ActionButton onClick={() => remove(`/api/finance/admin/installments/${item._id}`, 'Cuota eliminada.')}>Eliminar</ActionButton>
                      </div>
                    </div>
                  ))}
                  {!pendingInstallmentRows.length && <EmptyLine text="No hay cuentas por cobrar con esos filtros." />}
                </div>
              </Card>

              <section className="grid gap-6 xl:grid-cols-2">
                <Card title="Facturas criticas" subtitle="Las de mayor mora para priorizar llamadas y compromisos.">
                  <SimpleTable
                    headers={['Factura', 'Cliente', 'Mora', 'Monto']}
                    rows={collections.overdueInvoices.slice(0, 6).map((invoice) => [
                      <span key="inv" className="font-semibold text-stone-900">{invoice.invoiceNumber}</span>,
                      <span key="client">{invoice.clientId?.name}</span>,
                      <span key="days" className="text-rose-700">{invoice.daysOverdue} dias</span>,
                      <span key="amt" className="font-semibold text-stone-900">{money(invoice.totalAmount)}</span>,
                    ])}
                    emptyText="No hay facturas vencidas."
                  />
                </Card>

                <Card title="Estado de facturas" subtitle="Administra manualmente estados directos o anula documentos completos.">
                  <div className="grid gap-3">
                    {latestInvoices.map((invoice) => (
                      <div key={invoice._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-stone-900">{invoice.invoiceNumber}</p>
                            <p className="mt-1 text-sm text-stone-500">{invoice.clientId?.name} · {invoice.projectId?.name}</p>
                          </div>
                          <span className="text-sm font-black text-stone-950">{money(invoice.totalAmount)}</span>
                        </div>
                        <div className="mt-3">
                          <InlineStatusEditor
                            value={invoiceStatusDrafts[invoice._id] ?? invoice.status}
                            options={[
                              { value: 'pendiente', label: 'Pendiente' },
                              { value: 'pagada', label: 'Pagada' },
                              { value: 'vencida', label: 'Vencida' },
                              { value: 'anulada', label: 'Anulada' },
                            ]}
                            onChange={(value) => setInvoiceStatusDrafts((current) => ({ ...current, [invoice._id]: value as InvoiceStatus }))}
                            onSave={() => updateStatus(
                              `invoice:${invoice._id}`,
                              `/api/finance/admin/invoices/${invoice._id}`,
                              { status: invoiceStatusDrafts[invoice._id] ?? invoice.status },
                              'Estado de factura actualizado.',
                              () => setInvoiceStatusDrafts((current) => {
                                const next = { ...current }
                                delete next[invoice._id]
                                return next
                              })
                            )}
                            saving={statusSavingKey === `invoice:${invoice._id}`}
                            meta={formatAuditMeta(invoice.updatedBy, invoice.updatedAt)}
                          />
                        </div>
                      </div>
                    ))}
                    {!latestInvoices.length && <EmptyLine text="Aun no hay facturas para administrar estados." />}
                  </div>
                </Card>

                <Card title="Historial de gestion" subtitle="Actividad financiera pendiente de seguimiento.">
                  <div className="grid gap-3">
                    {collections.pendingActions.slice(0, 7).map((item) => (
                      <div key={item._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                        <p className="font-semibold text-stone-900">{item.clientId?.name || 'Cliente'} · {item.projectId?.name || item.entityType}</p>
                        <p className="mt-1 text-sm text-stone-600">{item.action.replaceAll('_', ' ')} · {dateValue(item.createdAt)}</p>
                      </div>
                    ))}
                    {!collections.pendingActions.length && <EmptyLine text="No hay acciones de cobranza pendientes registradas." />}
                  </div>
                </Card>
              </section>
            </div>
          )}

          {view === 'pagar' && (
            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiPanel label="Egresos del mes" value={money(summary.monthlyExpense)} detail="Salida operacional" icon={TrendingDown} tone="rose" />
                <KpiPanel label="Pendientes de pago" value={money(pendingExpenseRows.filter((item) => item.status === 'pendiente').reduce((total, item) => total + item.amount, 0))} detail="Compromisos abiertos" icon={Wallet} tone="amber" />
                <KpiPanel label="Categorias activas" value={String(summary.expenseByCategory.length)} detail="Centros de costo visibles" icon={ClipboardList} tone="blue" />
                <KpiPanel label="Margen mensual" value={money(summary.monthlyUtility)} detail="Ingreso menos egreso" icon={TrendingUp} tone={summary.monthlyUtility >= 0 ? 'emerald' : 'slate'} />
              </section>

              <Card title="Cuentas por pagar" subtitle="Vista operativa de proveedores, gastos recurrentes y pagos programados.">
                <div className="grid gap-3 border-b border-stone-200 pb-4 md:grid-cols-[1fr_220px]">
                  <TextInput label="Buscar" value={payableSearch} onChange={setPayableSearch} placeholder="Proveedor, cliente, proyecto o categoria" />
                  <SelectInput
                    label="Estado"
                    value={payableStatus}
                    onChange={setPayableStatus}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'pendiente', label: 'Pendiente' },
                      { value: 'pagado', label: 'Pagado' },
                      { value: 'anulado', label: 'Anulado' },
                    ]}
                  />
                </div>
                <div className="mt-5 grid gap-3">
                  {pendingExpenseRows.slice(0, 12).map((expense) => (
                    <div key={expense._id} className="grid gap-3 rounded-2xl border border-stone-200 p-4 lg:grid-cols-[1.4fr_0.9fr_0.7fr_auto] lg:items-center">
                      <div>
                        <p className="font-bold text-stone-950">{expense.supplier || expense.clientId?.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{expenseCategoryLabels[expense.category]} · {expense.projectId?.name} · {dateValue(expense.date)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Monto</p>
                        <p className="mt-1 font-black text-stone-950">{money(expense.amount)}</p>
                      </div>
                      <div>
                        <InlineStatusEditor
                          value={expenseStatusDrafts[expense._id] ?? expense.status}
                          options={[
                            { value: 'pendiente', label: 'Pendiente' },
                            { value: 'pagado', label: 'Pagado' },
                            { value: 'anulado', label: 'Anulado' },
                          ]}
                          onChange={(value) => setExpenseStatusDrafts((current) => ({ ...current, [expense._id]: value as ExpenseStatus }))}
                          onSave={() => updateStatus(
                            `expense:${expense._id}`,
                            `/api/finance/admin/expenses/${expense._id}`,
                            { status: expenseStatusDrafts[expense._id] ?? expense.status },
                            'Estado del egreso actualizado en Mongo.',
                            () => setExpenseStatusDrafts((current) => {
                              const next = { ...current }
                              delete next[expense._id]
                              return next
                            })
                          )}
                          saving={statusSavingKey === `expense:${expense._id}`}
                          meta={formatAuditMeta(expense.updatedBy, expense.updatedAt)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <ActionButton onClick={() => remove(`/api/finance/admin/expenses/${expense._id}`, 'Egreso eliminado.')}>Eliminar</ActionButton>
                      </div>
                    </div>
                  ))}
                  {!pendingExpenseRows.length && <EmptyLine text="No hay egresos con esos filtros." />}
                </div>
              </Card>

              <section className="grid gap-6 xl:grid-cols-2">
                <Card title="Categorias de gasto" subtitle="Donde se concentra el mayor costo del negocio.">
                  <div className="grid gap-4">
                    {summary.expenseByCategory.slice(0, 7).map((item) => (
                      <div key={item._id} className="grid gap-2">
                        <div className="flex items-center justify-between text-sm font-medium text-stone-700">
                          <span>{expenseCategoryLabels[item._id as ExpenseCategory] || item._id}</span>
                          <span>{money(item.total)}</span>
                        </div>
                        <div className="h-3 rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(8, Math.round(item.total / maxExpenseCategory * 100))}%` }} />
                        </div>
                      </div>
                    ))}
                    {!summary.expenseByCategory.length && <EmptyLine text="Aun no hay egresos suficientes para analizar categorias." />}
                  </div>
                </Card>

                <Card title="Compromisos de pago" subtitle="Pendientes inmediatos para orden operacional.">
                  <div className="grid gap-3">
                    {pendingExpenseRows.filter((item) => item.status === 'pendiente').slice(0, 6).map((expense) => (
                      <div key={expense._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-stone-900">{expense.supplier || expense.clientId?.name}</p>
                            <p className="mt-1 text-sm text-stone-500">{expenseCategoryLabels[expense.category]} · {expense.projectId?.name}</p>
                          </div>
                          <span className="font-black text-stone-950">{money(expense.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {!pendingExpenseRows.filter((item) => item.status === 'pendiente').length && <EmptyLine text="No hay pagos pendientes cargados en este momento." />}
                  </div>
                </Card>
              </section>
            </div>
          )}

          {view === 'movimientos' && (
            <div className="grid gap-6">
              <section className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
                <Card title="Workspace financiero" subtitle="Formularios por pasos, borradores locales y validacion por contexto.">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {composerItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setComposer(item.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${composer === item.id ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-white'}`}
                      >
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className="mt-1 block text-xs text-stone-500">{item.detail}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    {composer === 'invoice' && (
                      <WizardCard
                        title="Nueva factura"
                        subtitle="Transforma una venta o servicio en cuenta por cobrar trazable."
                        steps={['Cliente y proyecto', 'Documento', 'Montos', 'Control']}
                        currentStep={invoiceStep}
                        onStepChange={setInvoiceStep}
                        footer={(
                          <WizardFooter
                            canBack={invoiceStep > 0}
                            canNext={invoiceStep < 3}
                            nextLabel={invoiceStep === 2 ? 'Revisar control' : 'Siguiente'}
                            onBack={() => setInvoiceStep((current) => current - 1)}
                            onNext={() => {
                              const error = invoiceStepError(invoiceStep)
                              if (error) {
                                setMessage(error)
                                return
                              }
                              setInvoiceStep((current) => Math.min(current + 1, 3))
                            }}
                            draftLabel="Guardar borrador"
                            onDraft={() => saveDraft('servasmar-finance-invoice-draft', invoiceForm, 'Borrador de factura guardado en este navegador.')}
                            clearLabel="Limpiar"
                            onClear={() => clearDraft('servasmar-finance-invoice-draft', () => {
                              setInvoiceForm(emptyInvoice)
                              setInvoiceStep(0)
                            }, 'Borrador de factura limpiado.')}
                            primaryAction={invoiceStep === 3 ? (
                              <PrimaryButton disabled={saving === 'invoice'} onClick={() => {
                                const error = [0, 1, 2].map(invoiceStepError).find(Boolean)
                                if (error) {
                                  setMessage(error)
                                  return
                                }
                                persist('invoice', '/api/finance/admin/invoices', invoiceForm, 'Factura registrada correctamente.', () => {
                                  setInvoiceForm(emptyInvoice)
                                  setInvoiceStep(0)
                                }, 'servasmar-finance-invoice-draft')
                              }}>
                                {saving === 'invoice' ? 'Guardando...' : 'Registrar factura'}
                              </PrimaryButton>
                            ) : undefined}
                          />
                        )}
                      >
                        {invoiceStep === 0 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Cliente" value={invoiceForm.clientId} onChange={(value) => setInvoiceForm((current) => ({ ...current, clientId: value, projectId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
                            <SelectInput label="Proyecto" value={invoiceForm.projectId} onChange={(value) => setInvoiceForm((current) => ({ ...current, projectId: value }))} options={projectsByClient(invoiceForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
                          </div>
                        )}
                        {invoiceStep === 1 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextInput label="Numero de factura" value={invoiceForm.invoiceNumber} onChange={(value) => setInvoiceForm((current) => ({ ...current, invoiceNumber: value }))} placeholder="F-2026-001" />
                            <SelectInput label="Estado inicial" value={invoiceForm.status} onChange={(value) => setInvoiceForm((current) => ({ ...current, status: value as InvoiceStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagada', label: 'Pagada' }, { value: 'vencida', label: 'Vencida' }, { value: 'anulada', label: 'Anulada' }]} />
                            <TextInput label="Fecha de emision" type="date" value={invoiceForm.issueDate} onChange={(value) => setInvoiceForm((current) => ({ ...current, issueDate: value }))} />
                            <TextInput label="Fecha de vencimiento" type="date" value={invoiceForm.dueDate} onChange={(value) => setInvoiceForm((current) => ({ ...current, dueDate: value }))} />
                          </div>
                        )}
                        {invoiceStep === 2 && (
                          <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <TextInput label="Monto neto" type="number" value={String(invoiceForm.netAmount)} onChange={(value) => setInvoiceForm((current) => ({ ...current, netAmount: Number(value) }))} />
                              <StaticMetric label="IVA 19%" value={money(invoiceVat)} />
                              <StaticMetric label="Monto total" value={money(invoiceTotal)} />
                            </div>
                            <TextAreaInput label="Observaciones" value={invoiceForm.notes} onChange={(value) => setInvoiceForm((current) => ({ ...current, notes: value }))} placeholder="Notas de emision, referencia comercial o acuerdo." />
                          </div>
                        )}
                        {invoiceStep === 3 && (
                          <ReviewPanel
                            rows={[
                              ['Cliente', clients.find((item) => item._id === invoiceForm.clientId)?.name || 'Sin seleccionar'],
                              ['Proyecto', projects.find((item) => item._id === invoiceForm.projectId)?.name || 'Sin seleccionar'],
                              ['Factura', invoiceForm.invoiceNumber || 'Sin numero'],
                              ['Monto total', money(invoiceTotal)],
                              ['Vencimiento', invoiceForm.dueDate || 'Sin fecha'],
                              ['Recordatorio', invoiceForm.createCalendarEvent ? 'Si, crear alerta' : 'No por ahora'],
                            ]}
                            extra={(
                              <ToggleRow
                                label="Crear recordatorio en Calendar"
                                checked={invoiceForm.createCalendarEvent}
                                onChange={(checked) => setInvoiceForm((current) => ({ ...current, createCalendarEvent: checked }))}
                              />
                            )}
                          />
                        )}
                      </WizardCard>
                    )}

                    {composer === 'installment' && (
                      <WizardCard
                        title="Nueva cuota"
                        subtitle="Agenda el cobro y deja trazabilidad del compromiso de pago."
                        steps={['Relacion', 'Monto y vencimiento', 'Estado', 'Confirmacion']}
                        currentStep={installmentStep}
                        onStepChange={setInstallmentStep}
                        footer={(
                          <WizardFooter
                            canBack={installmentStep > 0}
                            canNext={installmentStep < 3}
                            onBack={() => setInstallmentStep((current) => current - 1)}
                            onNext={() => {
                              const error = installmentStepError(installmentStep)
                              if (error) {
                                setMessage(error)
                                return
                              }
                              setInstallmentStep((current) => Math.min(current + 1, 3))
                            }}
                            draftLabel="Guardar borrador"
                            onDraft={() => saveDraft('servasmar-finance-installment-draft', installmentForm, 'Borrador de cuota guardado.')}
                            clearLabel="Limpiar"
                            onClear={() => clearDraft('servasmar-finance-installment-draft', () => {
                              setInstallmentForm(emptyInstallment)
                              setInstallmentStep(0)
                            }, 'Borrador de cuota limpiado.')}
                            primaryAction={installmentStep === 3 ? (
                              <PrimaryButton disabled={saving === 'installment'} onClick={() => {
                                const error = [0, 1].map(installmentStepError).find(Boolean)
                                if (error) {
                                  setMessage(error)
                                  return
                                }
                                persist('installment', '/api/finance/admin/installments', installmentForm, 'Cuota registrada correctamente.', () => {
                                  setInstallmentForm(emptyInstallment)
                                  setInstallmentStep(0)
                                }, 'servasmar-finance-installment-draft')
                              }}>
                                {saving === 'installment' ? 'Guardando...' : 'Registrar cuota'}
                              </PrimaryButton>
                            ) : undefined}
                          />
                        )}
                      >
                        {installmentStep === 0 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Cliente" value={installmentForm.clientId} onChange={(value) => setInstallmentForm((current) => ({ ...current, clientId: value, projectId: '', invoiceId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
                            <SelectInput label="Proyecto" value={installmentForm.projectId} onChange={(value) => setInstallmentForm((current) => ({ ...current, projectId: value, invoiceId: '' }))} options={projectsByClient(installmentForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
                            <div className="md:col-span-2">
                              <SelectInput label="Factura asociada" value={installmentForm.invoiceId} onChange={(value) => setInstallmentForm((current) => ({ ...current, invoiceId: value }))} options={installmentInvoices.map((invoice) => ({ value: invoice._id, label: `${invoice.invoiceNumber} · ${invoice.projectId.name}` }))} />
                            </div>
                          </div>
                        )}
                        {installmentStep === 1 && (
                          <div className="grid gap-4 md:grid-cols-3">
                            <TextInput label="Numero de cuota" type="number" value={String(installmentForm.installmentNumber)} onChange={(value) => setInstallmentForm((current) => ({ ...current, installmentNumber: Number(value) }))} />
                            <TextInput label="Monto" type="number" value={String(installmentForm.amount)} onChange={(value) => setInstallmentForm((current) => ({ ...current, amount: Number(value) }))} />
                            <TextInput label="Vencimiento" type="date" value={installmentForm.dueDate} onChange={(value) => setInstallmentForm((current) => ({ ...current, dueDate: value }))} />
                          </div>
                        )}
                        {installmentStep === 2 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Estado de pago" value={installmentForm.status} onChange={(value) => setInstallmentForm((current) => ({ ...current, status: value as InstallmentStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagada', label: 'Pagada' }, { value: 'pago_parcial', label: 'Pago parcial' }, { value: 'vencida', label: 'Vencida' }, { value: 'anulada', label: 'Anulada' }]} />
                            <TextInput label="Medio de pago" value={installmentForm.paymentMethod} onChange={(value) => setInstallmentForm((current) => ({ ...current, paymentMethod: value }))} placeholder="Transferencia, cheque, etc." />
                            <TextInput label="Fecha de pago" type="date" value={installmentForm.paidDate} onChange={(value) => setInstallmentForm((current) => ({ ...current, paidDate: value }))} />
                            <div className="flex items-end">
                              <ToggleRow label="Crear recordatorio en Calendar" checked={installmentForm.createCalendarEvent} onChange={(checked) => setInstallmentForm((current) => ({ ...current, createCalendarEvent: checked }))} />
                            </div>
                            <div className="md:col-span-2">
                              <TextAreaInput label="Observaciones" value={installmentForm.notes} onChange={(value) => setInstallmentForm((current) => ({ ...current, notes: value }))} placeholder="Compromiso de pago, contacto o condicion especial." />
                            </div>
                          </div>
                        )}
                        {installmentStep === 3 && (
                          <ReviewPanel
                            rows={[
                              ['Factura', installmentInvoices.find((item) => item._id === installmentForm.invoiceId)?.invoiceNumber || 'Sin seleccionar'],
                              ['Monto', money(installmentForm.amount)],
                              ['Vence', installmentForm.dueDate || 'Sin fecha'],
                              ['Estado', installmentForm.status],
                              ['Recordatorio', installmentForm.createCalendarEvent ? 'Si' : 'No'],
                            ]}
                          />
                        )}
                      </WizardCard>
                    )}

                    {composer === 'income' && (
                      <WizardCard
                        title="Nuevo ingreso"
                        subtitle="Registra caja real y recalcula automaticamente la cobranza."
                        steps={['Cliente y servicio', 'Documento y monto', 'Pago y soporte', 'Confirmacion']}
                        currentStep={incomeStep}
                        onStepChange={setIncomeStep}
                        footer={(
                          <WizardFooter
                            canBack={incomeStep > 0}
                            canNext={incomeStep < 3}
                            onBack={() => setIncomeStep((current) => current - 1)}
                            onNext={() => {
                              const error = incomeStepError(incomeStep)
                              if (error) {
                                setMessage(error)
                                return
                              }
                              setIncomeStep((current) => Math.min(current + 1, 3))
                            }}
                            draftLabel="Guardar borrador"
                            onDraft={() => saveDraft('servasmar-finance-income-draft', incomeForm, 'Borrador de ingreso guardado.')}
                            clearLabel="Limpiar"
                            onClear={() => clearDraft('servasmar-finance-income-draft', () => {
                              setIncomeForm(emptyIncome)
                              setIncomeStep(0)
                            }, 'Borrador de ingreso limpiado.')}
                            primaryAction={incomeStep === 3 ? (
                              <PrimaryButton disabled={saving === 'income'} onClick={() => {
                                const error = [0, 1, 2].map(incomeStepError).find(Boolean)
                                if (error) {
                                  setMessage(error)
                                  return
                                }
                                persist('income', '/api/finance/admin/incomes', incomeForm, 'Ingreso registrado y cobranza actualizada.', () => {
                                  setIncomeForm(emptyIncome)
                                  setIncomeStep(0)
                                }, 'servasmar-finance-income-draft')
                              }}>
                                {saving === 'income' ? 'Guardando...' : 'Registrar ingreso'}
                              </PrimaryButton>
                            ) : undefined}
                          />
                        )}
                      >
                        {incomeStep === 0 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Cliente" value={incomeForm.clientId} onChange={(value) => setIncomeForm((current) => ({ ...current, clientId: value, projectId: '', invoiceId: '', installmentId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
                            <SelectInput label="Proyecto" value={incomeForm.projectId} onChange={(value) => setIncomeForm((current) => ({ ...current, projectId: value, invoiceId: '', installmentId: '' }))} options={projectsByClient(incomeForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
                          </div>
                        )}
                        {incomeStep === 1 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Factura asociada" value={incomeForm.invoiceId} onChange={(value) => setIncomeForm((current) => ({ ...current, invoiceId: value, installmentId: '' }))} options={[{ value: '', label: 'Sin factura directa' }, ...incomeInvoices.map((invoice) => ({ value: invoice._id, label: `${invoice.invoiceNumber} · ${money(invoice.totalAmount)}` }))]} />
                            <SelectInput label="Cuota asociada" value={incomeForm.installmentId} onChange={(value) => setIncomeForm((current) => ({ ...current, installmentId: value }))} options={[{ value: '', label: 'Sin cuota' }, ...incomeInstallments.map((installment) => ({ value: installment._id, label: `Cuota ${installment.installmentNumber} · ${installment.invoiceId.invoiceNumber}` }))]} />
                            <TextInput label="Monto recibido" type="number" value={String(incomeForm.amount)} onChange={(value) => setIncomeForm((current) => ({ ...current, amount: Number(value) }))} />
                            <SelectInput label="Medio de pago" value={incomeForm.paymentMethod} onChange={(value) => setIncomeForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))} options={[{ value: 'transferencia', label: 'Transferencia' }, { value: 'deposito', label: 'Deposito' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'webpay', label: 'Webpay' }, { value: 'otro', label: 'Otro' }]} />
                          </div>
                        )}
                        {incomeStep === 2 && (
                          <div className="grid gap-4">
                            <TextInput label="Fecha de pago" type="date" value={incomeForm.date} onChange={(value) => setIncomeForm((current) => ({ ...current, date: value }))} />
                            <TextAreaInput label="Observaciones" value={incomeForm.notes} onChange={(value) => setIncomeForm((current) => ({ ...current, notes: value }))} placeholder="Comprobante, referencia bancaria o detalle del pago." />
                          </div>
                        )}
                        {incomeStep === 3 && (
                          <ReviewPanel
                            rows={[
                              ['Cliente', clients.find((item) => item._id === incomeForm.clientId)?.name || 'Sin seleccionar'],
                              ['Proyecto', projects.find((item) => item._id === incomeForm.projectId)?.name || 'Sin seleccionar'],
                              ['Monto', money(incomeForm.amount)],
                              ['Medio', incomeForm.paymentMethod],
                              ['Fecha', incomeForm.date || 'Sin fecha'],
                            ]}
                          />
                        )}
                      </WizardCard>
                    )}

                    {composer === 'expense' && (
                      <WizardCard
                        title="Nuevo egreso"
                        subtitle="Agrupa gasto, responsable y centro de costo sin sobrecargar el formulario."
                        steps={['Tipo de gasto', 'Contexto', 'Monto y control', 'Confirmacion']}
                        currentStep={expenseStep}
                        onStepChange={setExpenseStep}
                        footer={(
                          <WizardFooter
                            canBack={expenseStep > 0}
                            canNext={expenseStep < 3}
                            onBack={() => setExpenseStep((current) => current - 1)}
                            onNext={() => {
                              const error = expenseStepError(expenseStep)
                              if (error) {
                                setMessage(error)
                                return
                              }
                              setExpenseStep((current) => Math.min(current + 1, 3))
                            }}
                            draftLabel="Guardar borrador"
                            onDraft={() => saveDraft('servasmar-finance-expense-draft', expenseForm, 'Borrador de egreso guardado.')}
                            clearLabel="Limpiar"
                            onClear={() => clearDraft('servasmar-finance-expense-draft', () => {
                              setExpenseForm(emptyExpense)
                              setExpenseStep(0)
                            }, 'Borrador de egreso limpiado.')}
                            primaryAction={expenseStep === 3 ? (
                              <PrimaryButton disabled={saving === 'expense'} onClick={() => {
                                const error = [0, 1, 2].map(expenseStepError).find(Boolean)
                                if (error) {
                                  setMessage(error)
                                  return
                                }
                                persist('expense', '/api/finance/admin/expenses', expenseForm, 'Egreso registrado correctamente.', () => {
                                  setExpenseForm(emptyExpense)
                                  setExpenseStep(0)
                                }, 'servasmar-finance-expense-draft')
                              }}>
                                {saving === 'expense' ? 'Guardando...' : 'Registrar egreso'}
                              </PrimaryButton>
                            ) : undefined}
                          />
                        )}
                      >
                        {expenseStep === 0 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Categoria" value={expenseForm.category} onChange={(value) => setExpenseForm((current) => ({ ...current, category: value as ExpenseCategory }))} options={(Object.keys(expenseCategoryLabels) as ExpenseCategory[]).map((key) => ({ value: key, label: expenseCategoryLabels[key] }))} />
                            <TextInput label="Proveedor o responsable" value={expenseForm.supplier} onChange={(value) => setExpenseForm((current) => ({ ...current, supplier: value }))} placeholder="Proveedor, consultor o responsable interno" />
                          </div>
                        )}
                        {expenseStep === 1 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <SelectInput label="Cliente" value={expenseForm.clientId} onChange={(value) => setExpenseForm((current) => ({ ...current, clientId: value, projectId: '' }))} options={clients.map((client) => ({ value: client._id, label: client.name }))} />
                            <SelectInput label="Proyecto" value={expenseForm.projectId} onChange={(value) => setExpenseForm((current) => ({ ...current, projectId: value }))} options={projectsByClient(expenseForm.clientId).map((project) => ({ value: project._id, label: `${project.code ? `${project.code} · ` : ''}${project.name}` }))} />
                          </div>
                        )}
                        {expenseStep === 2 && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextInput label="Fecha" type="date" value={expenseForm.date} onChange={(value) => setExpenseForm((current) => ({ ...current, date: value }))} />
                            <TextInput label="Monto" type="number" value={String(expenseForm.amount)} onChange={(value) => setExpenseForm((current) => ({ ...current, amount: Number(value) }))} />
                            <SelectInput label="Estado de pago" value={expenseForm.status} onChange={(value) => setExpenseForm((current) => ({ ...current, status: value as ExpenseStatus }))} options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagado', label: 'Pagado' }, { value: 'anulado', label: 'Anulado' }]} />
                            <TextAreaInput label="Observaciones" value={expenseForm.notes} onChange={(value) => setExpenseForm((current) => ({ ...current, notes: value }))} placeholder="Respaldo, centro de costo o contexto operacional." />
                          </div>
                        )}
                        {expenseStep === 3 && (
                          <ReviewPanel
                            rows={[
                              ['Categoria', expenseCategoryLabels[expenseForm.category]],
                              ['Proyecto', projects.find((item) => item._id === expenseForm.projectId)?.name || 'Sin seleccionar'],
                              ['Proveedor', expenseForm.supplier || 'Sin especificar'],
                              ['Monto', money(expenseForm.amount)],
                              ['Estado', expenseForm.status],
                            ]}
                          />
                        )}
                      </WizardCard>
                    )}
                  </div>
                </Card>

                <Card title="Linea de tiempo de registros" subtitle="Lo ultimo creado en el modulo, filtrado para revision rapida.">
                  <div className="border-b border-stone-200 pb-4">
                    <TextInput label="Buscar registro" value={recordSearch} onChange={setRecordSearch} placeholder="Tipo, cliente, titulo o estado" />
                  </div>
                  <div className="mt-5 grid gap-3">
                    {recentRecords.map((row) => (
                      <div key={`${row.type}-${row.id}`} className="grid gap-3 rounded-2xl border border-stone-200 p-4 md:grid-cols-[0.9fr_1.3fr_0.8fr_auto] md:items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{row.type}</p>
                          <p className="mt-1 font-bold text-stone-900">{row.title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-stone-700">{row.client}</p>
                          <p className="mt-1 text-xs text-stone-500">{dateValue(row.date)}</p>
                        </div>
                        <div>
                          <p className="font-black text-stone-950">{money(row.amount)}</p>
                          <div className="mt-1"><StatusBadge status={row.status} /></div>
                        </div>
                        <div className="hidden md:flex md:justify-end">
                          <ArrowRight className="h-4 w-4 text-stone-400" />
                        </div>
                      </div>
                    ))}
                    {!recentRecords.length && <EmptyLine text="No hay registros recientes con ese filtro." />}
                  </div>
                </Card>

                <div className="grid gap-6">
                  <Card title="Gestion de estados de cobro" subtitle="Los cambios impactan la cobranza y el dashboard principal al releer desde Mongo.">
                    <div className="grid gap-3">
                      {latestInstallments.map((item) => (
                        <div key={item._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-stone-900">Cuota {item.installmentNumber} · {item.invoiceId?.invoiceNumber}</p>
                              <p className="mt-1 text-sm text-stone-500">{item.clientId?.name} · vence {dateValue(item.dueDate)}</p>
                            </div>
                            <span className="font-black text-stone-950">{money(item.amount)}</span>
                          </div>
                          <div className="mt-3">
                            <InlineStatusEditor
                              value={installmentStatusDrafts[item._id] ?? item.status}
                              options={[
                                { value: 'pendiente', label: 'Pendiente' },
                                { value: 'pago_parcial', label: 'Parcial' },
                                { value: 'pagada', label: 'Pagada' },
                                { value: 'vencida', label: 'Vencida' },
                                { value: 'anulada', label: 'Anulada' },
                              ]}
                              onChange={(value) => setInstallmentStatusDrafts((current) => ({ ...current, [item._id]: value as InstallmentStatus }))}
                              onSave={() => updateStatus(
                                `installment:${item._id}`,
                                `/api/finance/admin/installments/${item._id}`,
                                { status: installmentStatusDrafts[item._id] ?? item.status },
                                'Estado de cuota actualizado en Mongo y sincronizado con la factura.',
                                () => setInstallmentStatusDrafts((current) => {
                                  const next = { ...current }
                                  delete next[item._id]
                                  return next
                                })
                              )}
                              saving={statusSavingKey === `installment:${item._id}`}
                              meta={formatAuditMeta(item.updatedBy, item.updatedAt)}
                            />
                          </div>
                        </div>
                      ))}
                      {!latestInstallments.length && <EmptyLine text="Aun no hay cuotas registradas." />}
                    </div>
                  </Card>

                  <Card title="Gestion de estados de pago" subtitle="Egresos y pagos operativos administrables desde un solo lugar.">
                    <div className="grid gap-3">
                      {latestExpenses.map((expense) => (
                        <div key={expense._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-stone-900">{expense.supplier || expense.clientId?.name}</p>
                              <p className="mt-1 text-sm text-stone-500">{expenseCategoryLabels[expense.category]} · {expense.projectId?.name}</p>
                            </div>
                            <span className="font-black text-stone-950">{money(expense.amount)}</span>
                          </div>
                          <div className="mt-3">
                            <InlineStatusEditor
                              value={expenseStatusDrafts[expense._id] ?? expense.status}
                              options={[
                                { value: 'pendiente', label: 'Pendiente' },
                                { value: 'pagado', label: 'Pagado' },
                                { value: 'anulado', label: 'Anulado' },
                              ]}
                              onChange={(value) => setExpenseStatusDrafts((current) => ({ ...current, [expense._id]: value as ExpenseStatus }))}
                              onSave={() => updateStatus(
                                `expense:${expense._id}`,
                                `/api/finance/admin/expenses/${expense._id}`,
                                { status: expenseStatusDrafts[expense._id] ?? expense.status },
                                'Estado del egreso actualizado en Mongo.',
                                () => setExpenseStatusDrafts((current) => {
                                  const next = { ...current }
                                  delete next[expense._id]
                                  return next
                                })
                              )}
                              saving={statusSavingKey === `expense:${expense._id}`}
                              meta={formatAuditMeta(expense.updatedBy, expense.updatedAt)}
                            />
                          </div>
                        </div>
                      ))}
                      {!latestExpenses.length && <EmptyLine text="Aun no hay egresos registrados." />}
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          )}

          {view === 'reportes' && (
            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiPanel label="Ingresos 6 meses" value={money(reports.resultSummary.income)} detail="Caja acumulada" icon={CircleDollarSign} tone="emerald" />
                <KpiPanel label="Egresos 6 meses" value={money(reports.resultSummary.expense)} detail="Costo acumulado" icon={TrendingDown} tone="rose" />
                <KpiPanel label="Resultado neto" value={money(reports.resultSummary.net)} detail="Flujo consolidado" icon={BarChart3} tone={reports.resultSummary.net >= 0 ? 'blue' : 'slate'} />
                <KpiPanel label="Clientes rentables" value={String(reports.incomeByClient.length)} detail="Con ingresos historicos" icon={FileSpreadsheet} tone="amber" />
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Card title="Rentabilidad por cliente" subtitle="Quienes concentran mayor ingreso real.">
                  <SimpleTable
                    headers={['Cliente', 'RUT', 'Ingreso']}
                    rows={reports.incomeByClient.slice(0, 8).map((client) => [
                      <span key="name" className="font-semibold text-stone-900">{client.name}</span>,
                      <span key="tax">{client.taxId || '-'}</span>,
                      <span key="amt" className="font-semibold text-stone-900">{money(client.total)}</span>,
                    ])}
                    emptyText="Aun no hay ingresos suficientes para construir este reporte."
                  />
                </Card>

                <Card title="Rentabilidad por servicio" subtitle="Proyectos y servicios con mejor margen operativo.">
                  <div className="grid gap-3">
                    {reports.projectResults.slice(0, 8).map((project) => (
                      <div key={project._id} className="rounded-2xl border border-stone-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-stone-900">{project.code ? `${project.code} · ` : ''}{project.name}</p>
                            <p className="mt-1 text-xs text-stone-500">Margen {percent(project.margin)} · Ingreso {money(project.totalIncome)}</p>
                          </div>
                          <span className={`font-black ${project.utility >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(project.utility)}</span>
                        </div>
                      </div>
                    ))}
                    {!reports.projectResults.length && <EmptyLine text="Sin datos suficientes para rentabilidad por servicio." />}
                  </div>
                </Card>
              </section>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-stone-950">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  )
}

function ExecutiveCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate'
}) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    blue: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-200 text-slate-700',
  }

  return (
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-600">{label}</p>
        <div className={`rounded-2xl p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight text-stone-950">{value}</p>
    </div>
  )
}

function HeroBadge({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'rose' | 'emerald' | 'slate' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  )
}

function KpiPanel({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate'
}) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-100 bg-rose-50 text-rose-950',
    blue: 'border-sky-100 bg-sky-50 text-sky-950',
    amber: 'border-amber-100 bg-amber-50 text-amber-950',
    slate: 'border-stone-200 bg-stone-50 text-stone-950',
  }

  return (
    <article className={`rounded-[24px] border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-semibold opacity-70">{detail}</p>
        </div>
        <Icon className="h-5 w-5" />
      </div>
    </article>
  )
}

function CompactKpi({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'blue' }) {
  const tones = {
    red: 'border-rose-200 bg-rose-50 text-rose-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
  }

  return (
    <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  )
}

function AdminSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-black text-stone-950">{value}</p>
    </div>
  )
}

function formatAuditMeta(updatedBy?: string, updatedAt?: string) {
  if (!updatedBy && !updatedAt) return ''
  const when = updatedAt ? dateValue(updatedAt) : 'sin fecha'
  return `Último cambio: ${updatedBy || 'sistema'} · ${when}`
}

function InlineStatusEditor({
  value,
  options,
  onChange,
  onSave,
  saving,
  meta,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  onSave: () => void
  saving: boolean
  meta?: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-emerald-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-stone-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Actualizar'}
        </button>
      </div>
      {meta && <p className="text-xs text-stone-500">{meta}</p>}
    </div>
  )
}

function AlertRow({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'blue' | 'slate' }) {
  const tones = {
    red: 'bg-rose-500',
    amber: 'bg-amber-500',
    blue: 'bg-sky-500',
    slate: 'bg-slate-500',
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${tones[tone]}`} />
        <span className="text-sm font-semibold text-stone-700">{label}</span>
      </div>
      <span className="text-lg font-black text-stone-950">{value}</span>
    </div>
  )
}

function WizardCard({
  title,
  subtitle,
  steps,
  currentStep,
  onStepChange,
  children,
  footer,
}: {
  title: string
  subtitle: string
  steps: string[]
  currentStep: number
  onStepChange: (step: number) => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-4">
      <div className="rounded-[24px] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-stone-950">{title}</h3>
            <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          </div>
          <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-600">
            Paso {currentStep + 1}/{steps.length}
          </span>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => onStepChange(index)}
              className={`rounded-2xl border px-3 py-3 text-left ${index === currentStep ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : index < currentStep ? 'border-stone-200 bg-white text-stone-700' : 'border-stone-200 bg-stone-50 text-stone-500'}`}
            >
              <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Paso {index + 1}</span>
              <span className="mt-1 block text-sm font-semibold">{step}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">{children}</div>
        <div className="mt-6">{footer}</div>
      </div>
    </div>
  )
}

function WizardFooter({
  canBack,
  canNext,
  onBack,
  onNext,
  draftLabel,
  onDraft,
  clearLabel,
  onClear,
  nextLabel = 'Siguiente',
  primaryAction,
}: {
  canBack: boolean
  canNext: boolean
  onBack: () => void
  onNext: () => void
  draftLabel: string
  onDraft: () => void
  clearLabel: string
  onClear: () => void
  nextLabel?: string
  primaryAction?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-stone-200 pt-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={onDraft}><Save className="h-4 w-4" />{draftLabel}</SecondaryButton>
        <GhostButton onClick={onClear}>{clearLabel}</GhostButton>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {canBack && <GhostButton onClick={onBack}>Atras</GhostButton>}
        {canNext && <SecondaryButton onClick={onNext}>{nextLabel}</SecondaryButton>}
        {primaryAction}
      </div>
    </div>
  )
}

function ReviewPanel({
  rows,
  extra,
}: {
  rows: Array<[string, string]>
  extra?: React.ReactNode
}) {
  return (
    <div className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
          <span className="text-sm font-semibold text-stone-600">{label}</span>
          <span className="text-sm font-black text-stone-950">{value}</span>
        </div>
      ))}
      {extra}
    </div>
  )
}

function StaticMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  )
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full min-w-0 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      >
        <option value="">Selecciona</option>
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-800 transition hover:bg-stone-50">
      {children}
    </button>
  )
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100">
      {children}
    </button>
  )
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100">
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'pagada' || status === 'pagado'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'vencida'
        ? 'bg-rose-100 text-rose-700'
        : status === 'pago_parcial'
          ? 'bg-sky-100 text-sky-700'
          : status === 'anulada' || status === 'anulado'
            ? 'bg-stone-200 text-stone-700'
            : 'bg-amber-100 text-amber-700'

  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${className}`}>{status.replaceAll('_', ' ')}</span>
}

function SimpleTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[]
  rows: React.ReactNode[][]
  emptyText: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-stone-500">
          <tr>
            {headers.map((header) => <th key={header} className="pb-3 pr-4">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-stone-100">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="py-3 pr-4">{cell}</td>)}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-sm text-stone-500">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm font-medium text-stone-500">{text}</p>
}
