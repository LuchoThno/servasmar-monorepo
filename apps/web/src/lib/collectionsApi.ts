import { z } from 'zod'
import { parseDateInput } from '@/lib/finance'
import { objectIdSchema } from '@/lib/financeApi'

export const collectionActionSchema = z.object({
  entityType: z.enum(['invoice', 'installment']),
  entityId: objectIdSchema,
  clientId: objectIdSchema,
  projectId: objectIdSchema,
  invoiceId: objectIdSchema.optional().or(z.literal('')).default(''),
  installmentId: objectIdSchema.optional().or(z.literal('')).default(''),
  actionType: z.enum(['note', 'call', 'email', 'promise', 'warning', 'payment', 'status_change']).default('note'),
  title: z.string().min(2),
  description: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  status: z.enum(['active', 'resolved']).default('active'),
})

export const normalizeCollectionActionPayload = (
  payload: z.infer<typeof collectionActionSchema>,
  userEmail: string
) => ({
  entityType: payload.entityType,
  entityId: payload.entityId,
  clientId: payload.clientId,
  projectId: payload.projectId,
  invoiceId: payload.invoiceId || undefined,
  installmentId: payload.installmentId || undefined,
  actionType: payload.actionType,
  title: payload.title.trim(),
  description: payload.description.trim(),
  dueDate: parseDateInput(payload.dueDate),
  status: payload.status,
  createdBy: userEmail,
  updatedBy: userEmail,
  resolvedBy: payload.status === 'resolved' ? userEmail : '',
  resolvedAt: payload.status === 'resolved' ? new Date() : undefined,
})
