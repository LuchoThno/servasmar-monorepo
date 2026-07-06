import type { WebhookEvent } from '@clerk/nextjs/server'
import { getPrimaryEmail, resolveDefaultPermissions } from '@servasmar/utils'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { connectToDatabase } from '../../../../../../api/src/config/db'
import { AdminModel } from '../../../../../../api/src/models/Admin'

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

  await connectToDatabase()

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const email = getPrimaryEmail(event.data).toLowerCase()
    const existingUser = await AdminModel.findOne({
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
    const permissions = event.data.public_metadata?.permissions || existingUser.permissions || resolveDefaultPermissions(role)

    await AdminModel.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          email,
          clerkId: event.data.id,
          role,
          status,
          provisioningStatus: 'active',
          provisioningError: undefined,
          activatedAt: existingUser.activatedAt || new Date(),
          permissions,
        },
        $addToSet: { clerkIds: event.data.id },
      }
    )

    if (!existingUser.name || existingUser.name === existingUser.email) {
      await AdminModel.updateOne(
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
    await AdminModel.updateOne(
      { $or: [{ clerkId: event.data.id }, { clerkIds: event.data.id }] },
      {
        $pull: { clerkIds: event.data.id },
        $set: {
          provisioningStatus: 'sync_error',
          provisioningError: 'Usuario eliminado en Clerk',
        },
      }
    )
  }

  return Response.json({ received: true })
}
