import { Schema, model, models, type InferSchemaType } from 'mongoose'

const emailLogSchema = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    providerMessageId: { type: String },
    error: { type: String },
  },
  { timestamps: true }
)

export type EmailLogDocument = InferSchemaType<typeof emailLogSchema>
export const EmailLogModel = models.EmailLog || model('EmailLog', emailLogSchema)
