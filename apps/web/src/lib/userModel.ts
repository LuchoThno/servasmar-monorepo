import { Schema, model, models } from 'mongoose'

const permissionSchema = new Schema(
  {
    clients: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    projects: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    tasks: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    quotes: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
    users: { type: String, enum: ['none', 'read', 'write', 'admin'], default: 'none' },
  },
  { _id: false }
)

const userSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    clerkIds: { type: [String], default: [], index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'gestor', 'visor'], default: 'gestor' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    permissions: { type: permissionSchema, default: () => ({}) },
    lastLoginAt: { type: Date },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true, collection: 'users' }
)

export const UserModel = models.User || model('User', userSchema)
