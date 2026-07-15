import { AdminPdfDownloadPage } from '@/components/admin/AdminPdfDownloadPage'

export default function ProjectsPdfPage() {
  return (
    <AdminPdfDownloadPage
      endpoint="/api/admin/proyectos/pdf"
      fallbackFilename="servasmar-proyectos.pdf"
      backHref="/admin/proyectos"
      title="Descarga de PDF de Proyectos"
    />
  )
}
