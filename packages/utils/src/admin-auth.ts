export type AdminRole = 'admin' | 'gestor' | 'visor'
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'
export type PermissionKey = 'clients' | 'projects' | 'tasks' | 'quotes' | 'finance' | 'users'

type ClerkEmailAddressLike = {
  id?: string | null
  emailAddress?: string | null
  email_address?: string | null
}

type ClerkUserLike = {
  primaryEmailAddressId?: string | null
  primary_email_address_id?: string | null
  emailAddresses?: ClerkEmailAddressLike[] | null
  email_addresses?: ClerkEmailAddressLike[] | null
}

export const permissionRank: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
}

export const rolePermissions: Record<AdminRole, Record<PermissionKey, PermissionLevel>> = {
  admin: {
    clients: 'admin',
    projects: 'admin',
    tasks: 'admin',
    quotes: 'admin',
    finance: 'admin',
    users: 'admin',
  },
  gestor: {
    clients: 'write',
    projects: 'write',
    tasks: 'write',
    quotes: 'write',
    finance: 'write',
    users: 'none',
  },
  visor: {
    clients: 'read',
    projects: 'read',
    tasks: 'read',
    quotes: 'read',
    finance: 'read',
    users: 'none',
  },
}

export const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || ''

export const resolveDefaultPermissions = (role?: string | null) =>
  rolePermissions[(role || '') as AdminRole] || rolePermissions.gestor

export const getPrimaryEmail = (user?: ClerkUserLike | null) => {
  const primaryId = user?.primaryEmailAddressId || user?.primary_email_address_id
  const addresses = user?.emailAddresses || user?.email_addresses || []
  const primary = addresses.find((entry) => entry.id === primaryId)
  return normalizeEmail(
    primary?.emailAddress ||
      primary?.email_address ||
      addresses[0]?.emailAddress ||
      addresses[0]?.email_address
  )
}

type ResolveAdminRecordOptions<TUser> = {
  clerkId: string
  emailHint?: string
  findByClerkId: (clerkId: string) => Promise<TUser | null>
  findAndLinkByEmail: (params: { clerkId: string; email: string }) => Promise<TUser | null>
  fetchClerkEmail?: (clerkId: string) => Promise<string>
  onClerkEmailLookupFailed?: (params: { clerkId: string; error: unknown }) => void
  onAdminReconciled?: (params: { clerkId: string; email: string }) => void
}

export const createFetchPrimaryEmail =
  <TUser extends ClerkUserLike>(fetchUserById: (clerkId: string) => Promise<TUser>) =>
  async (clerkId: string) =>
    getPrimaryEmail(await fetchUserById(clerkId))

export async function resolveAdminRecordByIdentity<TUser>({
  clerkId,
  emailHint,
  findByClerkId,
  findAndLinkByEmail,
  fetchClerkEmail,
  onClerkEmailLookupFailed,
  onAdminReconciled,
}: ResolveAdminRecordOptions<TUser>) {
  const existing = await findByClerkId(clerkId)
  if (existing) return existing

  let email = normalizeEmail(emailHint)
  if (!email && fetchClerkEmail) {
    try {
      email = normalizeEmail(await fetchClerkEmail(clerkId))
    } catch (error) {
      onClerkEmailLookupFailed?.({ clerkId, error })
      email = ''
    }
  }

  if (!email) return null

  const reconciled = await findAndLinkByEmail({ clerkId, email })
  if (reconciled) {
    onAdminReconciled?.({ clerkId, email })
  }
  return reconciled
}
