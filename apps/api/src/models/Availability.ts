import { Schema, model, models, type InferSchemaType } from 'mongoose'

const blockedSlotSchema = new Schema(
  {
    date: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
)

const availabilitySchema = new Schema(
  {
    name: { type: String, default: 'default', unique: true },
    timezone: { type: String, default: 'America/Santiago' },
    businessDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '18:00' },
    meetingDurationMinutes: { type: Number, default: 60, min: 15, max: 240 },
    blockedSlots: { type: [blockedSlotSchema], default: [] },
  },
  { timestamps: true }
)

export type AvailabilityDocument = InferSchemaType<typeof availabilitySchema>
export const AvailabilityModel = models.Availability || model('Availability', availabilitySchema)
