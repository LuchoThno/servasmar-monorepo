import { Schema, model, models, type InferSchemaType } from 'mongoose'

const appointmentSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    empresa: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    motivo: { type: String, required: true, trim: true },
    observaciones: { type: String, default: '', trim: true },
    fechaSolicitada: { type: Date, required: true },
    horaSolicitada: { type: String, required: true },
    fechaFinal: { type: Date },
    horaFinal: { type: String },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    googleCalendarEventId: { type: String },
    googleMeetLink: { type: String },
    motivoRechazo: { type: String, default: '' },
  },
  { timestamps: true }
)

appointmentSchema.index({ fechaSolicitada: 1, horaSolicitada: 1, estado: 1 })
appointmentSchema.index({ email: 1, createdAt: -1 })

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema>
export const AppointmentModel = models.Appointment || model('Appointment', appointmentSchema)
