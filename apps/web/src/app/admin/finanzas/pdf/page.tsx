import { AdminPdfDownloadPage } from '@/components/admin/AdminPdfDownloadPage'

export default function FinancePdfPage() {
  return (
    <AdminPdfDownloadPage
      endpoint="/api/admin/finanzas/pdf"
      fallbackFilename="servasmar-finanzas.pdf"
      backHref="/admin/finanzas"
      title="Descarga de PDF de Finanzas"
    />
  )
}
