import { Schema, model, models, type InferSchemaType } from 'mongoose'

const invoiceSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true, index: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true, index: true },
    netAmount: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    daysOverdue: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pendiente', 'pagada', 'vencida', 'anulada'],
      default: 'pendiente',
      index: true,
    },
    driveFileId: { type: String, default: '', trim: true },
    driveWebViewLink: { type: String, default: '', trim: true },
    calendarEventId: { type: String, default: '', trim: true },
    calendarHtmlLink: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    createdBy: { type: String, default: '', trim: true },
    updatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

invoiceSchema.index({ clientId: 1, projectId: 1, dueDate: -1 })

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema>
export const InvoiceModel = models.Invoice || model('Invoice', invoiceSchema)
