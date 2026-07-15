import { Schema, model, models, type InferSchemaType } from 'mongoose'

const pdfExportLogSchema = new Schema(
  {
    exportId: { type: String, required: true, unique: true, trim: true, index: true },
    sequence: { type: Number, required: true, index: true },
    documentType: {
      type: String,
      enum: ['reportes', 'finanzas', 'proyectos'],
      required: true,
      index: true,
    },
    fileName: { type: String, required: true, trim: true },
    downloadedBy: { type: String, required: true, trim: true, index: true },
    downloadedByClerkId: { type: String, default: '', trim: true, index: true },
    downloadedByAdminId: { type: String, default: '', trim: true, index: true },
    generatedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

pdfExportLogSchema.index({ documentType: 1, sequence: -1 })

export type PdfExportLogDocument = InferSchemaType<typeof pdfExportLogSchema>
export const PdfExportLogModel = models.PdfExportLog || model('PdfExportLog', pdfExportLogSchema)
