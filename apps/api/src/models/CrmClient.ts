import { Schema, model, models, type InferSchemaType } from 'mongoose'

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: '', trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { _id: true }
)

const crmClientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    taxId: { type: String, default: '', trim: true },
    industry: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['prospecto', 'activo', 'inactivo'],
      default: 'prospecto',
      index: true,
    },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    contacts: { type: [contactSchema], default: [] },
  },
  { timestamps: true }
)

crmClientSchema.index({ name: 'text', taxId: 'text', email: 'text' })

export type CrmClientDocument = InferSchemaType<typeof crmClientSchema>
export const CrmClientModel = models.CrmClient || model('CrmClient', crmClientSchema)
