import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { connectToDatabase } from '../../../../api/src/config/db'
import { AdminModel } from '../../../../api/src/models/Admin'

export const dynamic = 'force-dynamic'

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session.userId) {
    return session.redirectToSignIn()
  }

  await connectToDatabase()
  const admin = await AdminModel.exists({
    status: 'active',
    $or: [{ clerkId: session.userId }, { clerkIds: session.userId }],
  })

  if (!admin) {
    redirect('/?admin=unauthorized')
  }

  return children
}
