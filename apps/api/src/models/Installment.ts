import { Schema, model, models, type InferSchemaType } from 'mongoose'

const installmentSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    installmentNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    paidDate: { type: Date },
    status: {
      type: String,
      enum: ['pendiente', 'pagada', 'pago_parcial', 'vencida', 'anulada'],
      default: 'pendiente',
      index: true,
    },
    paymentMethod: { type: String, default: '', trim: true },
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

installmentSchema.index({ invoiceId: 1, installmentNumber: 1 }, { unique: true })

export type InstallmentDocument = InferSchemaType<typeof installmentSchema>
export const InstallmentModel = models.Installment || model('Installment', installmentSchema)
