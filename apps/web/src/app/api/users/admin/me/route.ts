import { NextRequest } from 'next/server'

import { requireAdmin } from '../../../_lib/auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (admin instanceof Response && 'status' in admin) return admin

  return Response.json({ success: true, user: admin })
}
