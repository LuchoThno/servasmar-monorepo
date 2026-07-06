import {
  hasClerkIdentity,
  isPendingClerkId,
  makePendingClerkId,
  resolveProvisioningStatus,
  type AdminProvisioningStatus,
} from './admin-provisioning'
import { normalizeEmail, resolveDefaultPermissions, type AdminRole, type PermissionKey, type PermissionLevel } from './admin-auth'

export type AdminUserStatus = 'active' | 'inactive'
export type AdminUserPermissions = Record<PermissionKey, PermissionLevel>

export type AdminUserPayload = {
  clerkId?: string
  name: string
  email: string
  role: AdminRole
  status: AdminUserStatus
  permissions?: AdminUserPermissions
}

export type ExistingAdminUserState = {
  clerkId: string
  clerkIds?: string[] | null
  provisioningStatus?: AdminProvisioningStatus | null
  provisioningError?: string | null
  activatedAt?: Date | null
  email: string
}

export type AdminUserListQuery = {
  search?: string
  role?: AdminRole
  status?: AdminUserStatus
  provisioningStatus?: AdminProvisioningStatus
}

export const buildAdminUserListFilter = (query: AdminUserListQuery) => {
  const filter: Record<string, unknown> = {}
  if (query.role) filter.role = query.role
  if (query.status) filter.status = query.status
  if (query.provisioningStatus) filter.provisioningStatus = query.provisioningStatus
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ]
  }
  return filter
}

export const buildAdminUserCreateInput = ({
  payload,
  createdBy,
  now = new Date(),
}: {
  payload: AdminUserPayload
  createdBy: string
  now?: Date
}) => {
  const email = normalizeEmail(payload.email)
  const requestedClerkId = payload.clerkId?.trim()
  const clerkId = requestedClerkId || makePendingClerkId(email)
  const provisioningStatus: AdminProvisioningStatus = requestedClerkId ? 'active' : 'pending_invitation'
  const permissions = payload.permissions || resolveDefaultPermissions(payload.role)

  return {
    email,
    requestedClerkId,
    clerkId,
    provisioningStatus,
    permissions,
    document: {
      clerkId,
      clerkIds: hasClerkIdentity({ clerkId, provisioningStatus }) ? [clerkId] : [],
      name: payload.name,
      email,
      role: payload.role,
      status: payload.status,
      provisioningStatus,
      provisioningError: undefined,
      invitationSentAt: undefined,
      activatedAt: requestedClerkId ? now : undefined,
      createdBy,
      permissions,
    },
  }
}

export const buildAdminUserUpdateInput = ({
  current,
  payload,
  now = new Date(),
}: {
  current: ExistingAdminUserState
  payload: AdminUserPayload
  now?: Date
}) => {
  const email = normalizeEmail(payload.email)
  const requestedClerkId = payload.clerkId?.trim()
  const currentProvisioning = resolveProvisioningStatus({
    clerkId: current.clerkId,
    provisioningStatus: current.provisioningStatus,
  })
  const nextClerkId = requestedClerkId || (isPendingClerkId(current.clerkId) ? makePendingClerkId(email) : current.clerkId)
  const nextProvisioningStatus: AdminProvisioningStatus = requestedClerkId
    ? 'active'
    : isPendingClerkId(nextClerkId)
      ? currentProvisioning === 'sync_error' ? 'sync_error' : 'pending_invitation'
      : 'active'
  const permissions = payload.permissions || resolveDefaultPermissions(payload.role)

  return {
    email,
    requestedClerkId,
    nextClerkId,
    nextProvisioningStatus,
    permissions,
    shouldSyncClerk: !isPendingClerkId(nextClerkId),
    update: {
      clerkId: nextClerkId,
      clerkIds: Array.from(new Set([...(current.clerkIds || []), ...(!isPendingClerkId(nextClerkId) ? [nextClerkId] : [])])),
      name: payload.name,
      email,
      role: payload.role,
      status: payload.status,
      provisioningStatus: nextProvisioningStatus,
      provisioningError: nextProvisioningStatus === 'active' ? undefined : current.provisioningError,
      activatedAt: nextProvisioningStatus === 'active' ? current.activatedAt || now : current.activatedAt,
      permissions,
    },
  }
}

export const buildAdminUserResendInvitationUpdate = ({
  user,
  now = new Date(),
}: {
  user: ExistingAdminUserState
  now?: Date
}) => ({
  $set: {
    provisioningStatus: 'pending_invitation' as AdminProvisioningStatus,
    provisioningError: undefined,
    invitationSentAt: now,
    clerkId: hasClerkIdentity({
      clerkId: user.clerkId,
      clerkIds: user.clerkIds,
      provisioningStatus: user.provisioningStatus,
    })
      ? user.clerkId
      : makePendingClerkId(user.email),
  },
})
