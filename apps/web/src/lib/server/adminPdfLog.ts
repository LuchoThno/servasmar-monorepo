import { randomUUID } from 'crypto'
import { ExportSequenceModel } from '../../../../api/src/models/ExportSequence'
import { PdfExportLogModel } from '../../../../api/src/models/PdfExportLog'
import type { AuthenticatedAdmin } from '@/app/api/_lib/auth'

export type PdfDocumentType = 'reportes' | 'finanzas' | 'proyectos'

const PREFIX_BY_TYPE: Record<PdfDocumentType, string> = {
  reportes: 'RPT',
  finanzas: 'FIN',
  proyectos: 'PRY',
}

const SEQUENCE_KEY = 'pdf_exports_global'

export async function registerPdfExport(
  documentType: PdfDocumentType,
  admin: AuthenticatedAdmin,
  metadata: Record<string, unknown> = {}
) {
  const generatedAt = new Date()
  const sequenceRow = await ExportSequenceModel.findOneAndUpdate(
    { key: SEQUENCE_KEY },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  const sequence = Number(sequenceRow.value || 0)
  const sequenceLabel = String(sequence).padStart(6, '0')
  const ymd = generatedAt.toISOString().slice(0, 10).replace(/-/g, '')
  const exportId = `${PREFIX_BY_TYPE[documentType]}-${ymd}-${sequenceLabel}-${randomUUID().slice(0, 8).toUpperCase()}`
  const fileName = `servasmar-${documentType}-${sequenceLabel}.pdf`

  await PdfExportLogModel.create({
    exportId,
    sequence,
    documentType,
    fileName,
    downloadedBy: admin.email,
    downloadedByClerkId: admin.clerkId,
    downloadedByAdminId: admin.id,
    generatedAt,
    metadata,
  })

  return { exportId, sequence, sequenceLabel, fileName, generatedAt }
}
