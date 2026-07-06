import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { resolveAdminRecord } from '../api/_lib/auth'

export const dynamic = 'force-dynamic'

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session.userId) {
    return session.redirectToSignIn()
  }

  const user = await currentUser()
  const primaryEmail =
    user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress
  const admin = await resolveAdminRecord(session.userId, primaryEmail)

  if (!admin || admin.status !== 'active') {
    redirect('/?admin=unauthorized')
  }

  return children
}
