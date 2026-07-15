import { Schema, model, models, type InferSchemaType } from 'mongoose'

const activityLogSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['invoice', 'installment', 'income', 'expense', 'project', 'client'],
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'CrmProject', index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', index: true },
    actionType: {
      type: String,
      enum: ['note', 'call', 'email', 'promise', 'warning', 'payment', 'status_change'],
      default: 'note',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    dueDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String, default: '', trim: true },
    updatedBy: { type: String, default: '', trim: true },
    resolvedBy: { type: String, default: '', trim: true },
    resolvedAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
)

activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema>
export const ActivityLogModel = models.ActivityLog || model('ActivityLog', activityLogSchema)
