import { Schema, model, models, type InferSchemaType } from 'mongoose'

const exportSequenceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export type ExportSequenceDocument = InferSchemaType<typeof exportSequenceSchema>
export const ExportSequenceModel = models.ExportSequence || model('ExportSequence', exportSequenceSchema)
