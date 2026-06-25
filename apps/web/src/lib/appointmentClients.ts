import { Types } from 'mongoose'
import { CrmClientModel } from '@api/models/CrmClient'

export type AppointmentLinkedClient = {
  _id: string
  name: string
  email: string
  contacts: Array<{
    name: string
    email: string
  }>
}

export type AppointmentNotificationRecipient = {
  email: string
  name: string
}

const normalizeEmail = (value?: string) => (value || '').trim().toLowerCase()
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function resolveLinkedClientsForAppointment(input: {
  email?: string
  empresa?: string
  linkedClientIds?: string[]
}) {
  const linkedClientIds = Array.from(new Set((input.linkedClientIds || []).filter((value) => Types.ObjectId.isValid(value))))
  const email = normalizeEmail(input.email)
  const company = (input.empresa || '').trim()

  const filters: Record<string, unknown>[] = []

  if (linkedClientIds.length) {
    filters.push({ _id: { $in: linkedClientIds.map((value) => new Types.ObjectId(value)) } })
  }

  if (email) {
    filters.push({ email })
    filters.push({ 'contacts.email': email })
  }

  if (company) {
    filters.push({ name: { $regex: `^${escapeRegExp(company)}$`, $options: 'i' } })
  }

  if (!filters.length) return []

  const clients = await CrmClientModel.find({ $or: filters })
    .select('name email contacts')
    .lean()

  const deduped = new Map<string, AppointmentLinkedClient>()
  for (const client of clients) {
    deduped.set(String(client._id), {
      _id: String(client._id),
      name: String(client.name || ''),
        email: String(client.email || ''),
        contacts: Array.isArray(client.contacts)
        ? client.contacts.map((contact: { name?: string; email?: string }) => ({
            name: String(contact.name || ''),
            email: String(contact.email || ''),
          }))
        : [],
    })
  }

  return Array.from(deduped.values())
}

export function buildAppointmentNotificationRecipients(input: {
  requesterName: string
  requesterEmail: string
  linkedClients: AppointmentLinkedClient[]
}) {
  const recipients = new Map<string, AppointmentNotificationRecipient>()

  const register = (email: string, name: string) => {
    const normalized = normalizeEmail(email)
    if (!normalized) return
    if (!recipients.has(normalized)) {
      recipients.set(normalized, {
        email: normalized,
        name: name.trim() || normalized,
      })
    }
  }

  register(input.requesterEmail, input.requesterName)

  for (const client of input.linkedClients) {
    register(client.email, client.name)
    for (const contact of client.contacts) {
      register(contact.email, contact.name || client.name)
    }
  }

  return Array.from(recipients.values())
}
