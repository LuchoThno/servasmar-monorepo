import type { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { connectToMongo } from '@/lib/mongodb'
import { UserModel } from '@/lib/userModel'

const rolePermissions = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', users: 'none' },
  visor: { clients: 'read', projects: 'read', tasks: 'read', quotes: 'read', users: 'none' },
}

const getPrimaryEmail = (eventUser: WebhookEvent['data']) => {
  if (!('email_addresses' in eventUser)) return ''
  const primary = eventUser.email_addresses.find((email) => email.id === eventUser.primary_email_address_id)
  return primary?.email_address || eventUser.email_addresses[0]?.email_address || ''
}

const getName = (eventUser: WebhookEvent['data']) => {
  if (!('first_name' in eventUser)) return ''
  return [eventUser.first_name, eventUser.last_name].filter(Boolean).join(' ') || getPrimaryEmail(eventUser)
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'CLERK_WEBHOOK_SECRET no configurado' }, { status: 500 })
  }

  const body = await request.text()
  const headerList = await headers()
  const svixId = headerList.get('svix-id')
  const svixTimestamp = headerList.get('svix-timestamp')
  const svixSignature = headerList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Headers Svix incompletos' }, { status: 400 })
  }

  let event: WebhookEvent
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return Response.json({ error: 'Firma inválida' }, { status: 400 })
  }

  await connectToMongo()

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const email = getPrimaryEmail(event.data).toLowerCase()
    const existingUser = await UserModel.findOne({
      $or: [
        { clerkId: event.data.id },
        { clerkIds: event.data.id },
        { email },
      ],
    })

    if (!existingUser) {
      return Response.json({ received: true, skipped: 'user_not_preapproved' })
    }

    const role = (event.data.public_metadata?.role as 'admin' | 'gestor' | 'visor' | undefined) || existingUser.role || 'gestor'
    const status = (event.data.public_metadata?.status as 'active' | 'inactive' | undefined) || existingUser.status || 'active'
    const permissions = event.data.public_metadata?.permissions || existingUser.permissions || rolePermissions[role as keyof typeof rolePermissions]

    await UserModel.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          email,
          clerkId: existingUser.clerkId || event.data.id,
          role,
          status,
          permissions,
        },
        $setOnInsert: {
          name: getName(event.data),
        },
        $addToSet: { clerkIds: event.data.id },
      }
    )

    if (!existingUser.name || existingUser.name === existingUser.email) {
      await UserModel.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            name: getName(event.data),
          },
        }
      )
    }
  }

  if (event.type === 'user.deleted' && event.data.id) {
    await UserModel.updateOne(
      { $or: [{ clerkId: event.data.id }, { clerkIds: event.data.id }] },
      { $pull: { clerkIds: event.data.id } }
    )
  }

return Response.json({ received: true })
}
