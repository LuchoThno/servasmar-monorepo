import { Schema, model, models, type InferSchemaType } from 'mongoose'

const incomeSchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['transferencia', 'deposito', 'efectivo', 'webpay', 'otro'],
      default: 'transferencia',
      index: true,
    },
    notes: { type: String, default: '', trim: true },
    driveFileId: { type: String, default: '', trim: true },
    driveWebViewLink: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
      index: true,
    },
    createdBy: { type: String, default: '', trim: true },
    updatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

incomeSchema.index({ projectId: 1, date: -1 })

export type IncomeDocument = InferSchemaType<typeof incomeSchema>
export const IncomeModel = models.Income || model('Income', incomeSchema)
