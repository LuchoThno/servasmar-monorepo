import { Schema, model, models, type InferSchemaType } from 'mongoose'

const projectValueSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'CLP', trim: true },
    type: {
      type: String,
      enum: ['ingreso', 'egreso'],
      default: 'ingreso',
    },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pendiente', 'facturado', 'pagado'],
      default: 'pendiente',
    },
    notes: { type: String, default: '', trim: true },
  },
  { _id: true }
)

const projectTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    owner: { type: String, default: '', trim: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pendiente', 'en_progreso', 'completada', 'bloqueada'],
      default: 'pendiente',
    },
    notes: { type: String, default: '', trim: true },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    tag: { type: String, default: 'General', trim: true },
    tagColor: { type: String, default: 'blue', trim: true },
    assignees: { type: [String], default: [] },
    desc: { type: String, default: '', trim: true },
    subtasks: {
      type: [
        {
          text: { type: String, required: true, trim: true },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    attachments: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          size: { type: String, default: '', trim: true },
          url: { type: String, default: '#', trim: true },
          driveFileId: { type: String, default: '', trim: true },
          driveFolderId: { type: String, default: '', trim: true },
          mimeType: { type: String, default: '', trim: true },
          sizeBytes: { type: Number, default: 0, min: 0 },
          webViewLink: { type: String, default: '', trim: true },
          uploadedAt: { type: Date },
          uploadedBy: { type: String, default: '', trim: true },
        },
      ],
      default: [],
    },
    activity: { type: [String], default: [] },
  },
  { _id: true }
)

const crmProjectSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'CrmClient', required: true, index: true },
    name: { type: String, required: true, trim: true },
    serviceType: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['prospecto', 'en_progreso', 'pausado', 'cerrado', 'perdido'],
      default: 'prospecto',
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '', trim: true },
    values: { type: [projectValueSchema], default: [] },
    tasks: { type: [projectTaskSchema], default: [] },
  },
  { timestamps: true }
)

crmProjectSchema.index({ name: 'text', serviceType: 'text', description: 'text' })

export type CrmProjectDocument = InferSchemaType<typeof crmProjectSchema>
export const CrmProjectModel = models.CrmProject || model('CrmProject', crmProjectSchema)
