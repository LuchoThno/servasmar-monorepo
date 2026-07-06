import { Schema, model, models, type InferSchemaType } from 'mongoose'

const permissionLevelSchema = new Schema(
  {
    clients: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    projects: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    tasks: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    quotes: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    finance: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    users: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
  },
  { _id: false }
)

const adminSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    clerkIds: { type: [String], default: [], index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'gestor', 'visor'], default: 'gestor' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    provisioningStatus: { type: String, enum: ['pending_invitation', 'active', 'sync_error'], default: 'active', index: true },
    provisioningError: { type: String },
    invitationSentAt: { type: Date },
    activatedAt: { type: Date },
    permissions: { type: permissionLevelSchema, default: () => ({}) },
    lastLoginAt: { type: Date },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true, collection: 'users' }
)

export type AdminDocument = InferSchemaType<typeof adminSchema>
export const AdminModel = models.User || model('User', adminSchema)
