import { AdminPdfDownloadPage } from '@/components/admin/AdminPdfDownloadPage'

export default function ReportsPdfPage() {
  return (
    <AdminPdfDownloadPage
      endpoint="/api/admin/reportes/pdf"
      fallbackFilename="servasmar-reportes.pdf"
      backHref="/admin/reportes"
      title="Descarga de PDF de Reportes"
    />
  )
}
