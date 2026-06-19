'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/lib/useApiClient'

type Client = {
  _id: string
  name: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
  contacts?: Array<{ name: string; role?: string; email?: string; phone?: string }>
}

type Project = {
  _id: string
  name: string
  status: string
}

type QuoteItem = {
  description: string
  quantity: number
  unitPrice: number
  currency: string
}

type Quote = {
  _id: string
  number: string
  clientId: Client
  projectId?: Project
  title: string
  status: string
  issuedAt?: string
  validUntil?: string
  discountType?: 'none' | 'amount' | 'percent'
  discountValue?: number
  applyVat?: boolean
  vatRate?: number
  notes?: string
  specialClauses?: string
  items: QuoteItem[]
}

const company = {
  name: 'SERVASMAR',
  legal: 'Asesorías y soluciones marítimas, portuarias y costeras',
  rut: '77.505.416-6',
  email: 'contacto@servasmar.cl',
  location: 'Chile',
  website: 'www.servasmar.cl',
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount || 0)
const date = (value?: string) =>
  value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-'
const subtotal = (items: QuoteItem[]) =>
  items.reduce((t, i) => t + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)
const totalsFor = (quote: Quote) => {
  const base = subtotal(quote.items)
  const discount =
    quote.discountType === 'percent'
      ? base * Math.min(Number(quote.discountValue || 0), 100) / 100
      : quote.discountType === 'amount'
        ? Math.min(Number(quote.discountValue || 0), base)
        : 0
  const net = Math.max(base - discount, 0)
  const applyVat = quote.applyVat ?? true
  const vat = applyVat ? net * Number(quote.vatRate ?? 19) / 100 : 0
  return { base, discount, net, vat, total: net + vat }
}

export default function QuotePdfPage() {
  const { authHeaders, isLoaded, isSignedIn } = useApiClient()
  const params = useParams<{ id: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const loadQuote = async () => {
      try {
        const res = await fetch(`/api/crm/admin/quotes/${params.id}`, {
          headers: await authHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error?.message || 'No pudimos cargar la cotización')
        setQuote(data.quote)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar')
      }
    }
    loadQuote()
  }, [authHeaders, isLoaded, isSignedIn, params.id])

  const totals = useMemo(() => (quote ? totalsFor(quote) : null), [quote])
  const currency = quote?.items[0]?.currency || 'CLP'
  const primaryContact = quote?.clientId.contacts?.[0]

  if (error) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>
  )
  if (!quote || !totals) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">Cargando cotización...</main>
  )

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: letter;
          margin: 0.35in;
        }

        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; width: 100% !important; }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 11px;
            margin: 0 !important;
            overflow: visible !important;
          }

          .print-page {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            font-size: 11px;
            transform: translateY(0.2in) scale(0.92);
            transform-origin: top center;
          }

          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }

          .print-table { font-size: 10px; table-layout: fixed !important; }
          .print-table th, .print-table td { padding: 5px 8px !important; }
          .print-table td:first-child {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .print-compact { padding: 10px 12px !important; }
          .print-gap { gap: 10px !important; }
          .print-py { padding-top: 10px !important; padding-bottom: 10px !important; }
          .print-mt { margin-top: 10px !important; }

          .print-text-xs { font-size: 10px !important; }
          .print-text-sm { font-size: 11px !important; }
          .print-text-base { font-size: 12px !important; }
          .print-text-lg { font-size: 14px !important; }
          .print-text-xl { font-size: 17px !important; }
          .print-text-2xl { font-size: 18px !important; }
          .print-wrap {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
        }
      `}</style>

      {/* Botón pantalla */}
      <div className="no-print mx-auto mb-4 flex max-w-5xl justify-end">
        <button
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
        >
          <Printer className="h-4 w-4" />
          Guardar / imprimir PDF
        </button>
      </div>

      <section className="print-page mx-auto w-full max-w-[8.5in] rounded-xl border border-slate-200 bg-white p-8 shadow-xl">

        {/* ── HEADER: empresa izq | cotización der ── */}
        <header
          className="print-avoid-break border-b border-slate-200 pb-6"
          style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: '20px', alignItems: 'start' }}
        >
          {/* Empresa */}
          <div className="flex items-start gap-4">
            <Image src="/images/logo2.png" alt="SERVASMAR" width={64} height={64} className="h-16 w-16 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 print-text-xl">{company.name}</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 print-text-xs leading-snug">{company.legal}</p>
              <div className="mt-3 flex flex-col gap-0.5 text-xs text-slate-400 print-text-xs">
                <span>{company.rut}</span>
                <span>{company.email}</span>
                <span>{company.website}</span>
                <span>{company.location}</span>
              </div>
            </div>
          </div>

          {/* Card cotización */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print-compact">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Cotización</p>
            <p className="mt-0.5 text-[22px] font-black text-slate-950 leading-none print-text-xl">{quote.number}</p>
            <div className="mt-3 grid gap-1.5 print-gap">
              {[
                { label: 'Fecha', value: date(quote.issuedAt) },
                { label: 'Validez', value: date(quote.validUntil) },
                { label: 'Estado', value: quote.status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs text-slate-500 print-text-xs">
                  <span>{label}</span>
                  <strong className="text-slate-800">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── CLIENTE + ANTECEDENTES ── */}
        <div
          className="print-avoid-break print-py py-5"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
        >
          {/* Cliente */}
          <div className="rounded-lg border border-slate-200 p-4 print-compact">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 leading-tight print-text-base">{quote.clientId.name}</h2>
            <div className="mt-2.5 grid gap-0.5 text-xs text-slate-500 print-text-xs">
              {quote.clientId.taxId && <span><span className="text-slate-400">RUT</span> {quote.clientId.taxId}</span>}
              {quote.clientId.email && <span><span className="text-slate-400">Email</span> {quote.clientId.email}</span>}
              {quote.clientId.phone && <span><span className="text-slate-400">Tel.</span> {quote.clientId.phone}</span>}
              {quote.clientId.address && <span><span className="text-slate-400">Dir.</span> {quote.clientId.address}</span>}
              {primaryContact && (
                <span>
                  <span className="text-slate-400">Contacto</span>{' '}
                  {primaryContact.name}{primaryContact.role ? `, ${primaryContact.role}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Antecedentes */}
          <div className="rounded-lg border border-slate-200 p-4 print-compact">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Antecedentes</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 leading-tight print-text-base">{quote.title}</h2>
            <div className="mt-2.5 grid gap-0.5 text-xs text-slate-500 print-text-xs">
              {quote.projectId?.name && (
                <span><span className="text-slate-400">Proyecto</span> {quote.projectId.name}</span>
              )}
              <span>
                <span className="text-slate-400">Tributario</span>{' '}
                {(quote.applyVat ?? true) ? `Afecta IVA ${quote.vatRate ?? 19}%` : 'Sin IVA'}
              </span>
              <span><span className="text-slate-400">Moneda</span> {currency}</span>
            </div>
          </div>
        </div>

        {/* ── TABLA DE ÍTEMS ── */}
        <table className="print-table w-full border-collapse text-left text-sm print-text-sm">
          <colgroup>
            <col />
            <col style={{ width: '72px' }} />
            <col style={{ width: '118px' }} />
            <col style={{ width: '118px' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-4 py-2.5 font-semibold print-text-xs">Descripción</th>
              <th className="px-4 py-2.5 text-right font-semibold print-text-xs">Cant.</th>
              <th className="px-4 py-2.5 text-right font-semibold print-text-xs">P. unitario</th>
              <th className="px-4 py-2.5 text-right font-semibold print-text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 even:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800 leading-snug">{item.description}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{money(item.unitPrice, item.currency || currency)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">{money(item.quantity * item.unitPrice, item.currency || currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── NOTAS + TOTALES ── */}
        <div
          className="print-avoid-break print-mt mt-5"
          style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}
        >
          {/* Notas y cláusulas */}
          <div className="space-y-3">
            {quote.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notas</p>
                <p className="print-wrap text-xs text-slate-500 leading-relaxed whitespace-pre-line print-text-xs">{quote.notes}</p>
              </div>
            )}
            {quote.specialClauses && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cláusulas especiales</p>
                <p className="print-wrap text-xs text-slate-500 leading-relaxed whitespace-pre-line print-text-xs">{quote.specialClauses}</p>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="rounded-lg border border-slate-200 overflow-hidden print-avoid-break">
            <div className="px-4 py-3 space-y-2 print-compact">
              {[
                { label: 'Subtotal', value: money(totals.base, currency), muted: true },
                { label: 'Descuento', value: `-${money(totals.discount, currency)}`, muted: true },
                { label: 'Neto', value: money(totals.net, currency), muted: true },
                {
                  label: `IVA ${(quote.applyVat ?? true) ? `${quote.vatRate ?? 19}%` : 'no aplicado'}`,
                  value: money(totals.vat, currency),
                  muted: true,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs text-slate-500 print-text-xs">
                  <span>{label}</span>
                  <span className="font-semibold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 bg-slate-900 px-4 py-3 flex justify-between items-center print-compact">
              <span className="text-sm font-black text-white print-text-sm">Total</span>
              <span className="text-base font-black text-white print-text-base">{money(totals.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="print-avoid-break mt-6 print-mt border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400 leading-5 print-text-xs">
          Esta cotización fue emitida por {company.name}. Los valores, plazos y condiciones quedan sujetos a las cláusulas indicadas y a la aprobación formal del cliente.
        </footer>

      </section>
    </main>
  )
}
