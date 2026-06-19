import { Schema, model, models, type InferSchemaType } from 'mongoose'

const expenseSchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    category: {
      type: String,
      enum: ['honorarios', 'transporte', 'combustible', 'hospedaje', 'alimentacion', 'equipamiento', 'software', 'marketing', 'servicios_externos', 'permisos', 'impuestos', 'otros'],
      required: true,
      index: true,
    },
    supplier: { type: String, default: '', trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pendiente', 'pagado', 'anulado'],
      default: 'pendiente',
      index: true,
    },
    notes: { type: String, default: '', trim: true },
    driveFileId: { type: String, default: '', trim: true },
    driveWebViewLink: { type: String, default: '', trim: true },
    createdBy: { type: String, default: '', trim: true },
    updatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

expenseSchema.index({ projectId: 1, date: -1 })

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>
export const ExpenseModel = models.Expense || model('Expense', expenseSchema)
