import { Schema, model, models, type InferSchemaType } from 'mongoose'

const quoteItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'CLP', trim: true },
  },
  { _id: true }
)

const crmQuoteSchema = new Schema(
  {
    number: { type: String, required: true, trim: true, unique: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject' },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['borrador', 'enviada', 'aprobada', 'rechazada', 'vencida'],
      default: 'borrador',
      index: true,
    },
    issuedAt: { type: Date, default: Date.now },
    validUntil: { type: Date },
    discountType: {
      type: String,
      enum: ['none', 'amount', 'percent'],
      default: 'none',
    },
    discountValue: { type: Number, default: 0, min: 0 },
    applyVat: { type: Boolean, default: true },
    vatRate: { type: Number, default: 19, min: 0 },
    notes: { type: String, default: '', trim: true },
    specialClauses: { type: String, default: '', trim: true },
    items: { type: [quoteItemSchema], default: [] },
  },
  { timestamps: true }
)

crmQuoteSchema.index({ title: 'text', number: 'text', notes: 'text' })

export type CrmQuoteDocument = InferSchemaType<typeof crmQuoteSchema>
export const CrmQuoteModel = models.CrmQuote || model('CrmQuote', crmQuoteSchema)
