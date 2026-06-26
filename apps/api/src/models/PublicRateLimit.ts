import { Schema, model, models, type InferSchemaType } from 'mongoose'

const publicRateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    scope: { type: String, required: true, index: true },
    identifierHash: { type: String, required: true, index: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

publicRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type PublicRateLimitDocument = InferSchemaType<typeof publicRateLimitSchema>
export const PublicRateLimitModel = models.PublicRateLimit || model('PublicRateLimit', publicRateLimitSchema)
