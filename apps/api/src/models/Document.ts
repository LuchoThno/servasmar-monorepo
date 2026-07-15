import { Schema, model, models, type InferSchemaType } from 'mongoose'

const documentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'general', trim: true, index: true },
    entityType: {
      type: String,
      enum: ['client', 'project', 'invoice', 'installment'],
      required: true,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', index: true },
    driveFileId: { type: String, required: true, trim: true, index: true },
    driveFolderId: { type: String, default: '', trim: true },
    webViewLink: { type: String, default: '', trim: true },
    downloadUrl: { type: String, default: '', trim: true },
    mimeType: { type: String, default: 'application/octet-stream', trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    uploadedBy: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
)

documentSchema.index({ clientId: 1, projectId: 1, invoiceId: 1, installmentId: 1, createdAt: -1 })

export type DocumentRecord = InferSchemaType<typeof documentSchema>
export const DocumentModel = models.Document || model('Document', documentSchema)
