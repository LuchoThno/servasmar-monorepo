import { normalizeEmail } from './admin-auth'

export type AdminProvisioningStatus = 'pending_invitation' | 'active' | 'sync_error'

// Placeholder legacy: se usa para compatibilidad de datos existentes.
// En el flujo nuevo, el estado debe derivarse de `provisioningStatus`.
export const PENDING_CLERK_PREFIX = 'pending:'

export const makePendingClerkId = (email: string) => `${PENDING_CLERK_PREFIX}${normalizeEmail(email)}`

export const isPendingClerkId = (clerkId?: string | null) => !!clerkId?.startsWith(PENDING_CLERK_PREFIX)


export const resolveProvisioningStatus = (params: {
  clerkId?: string | null
  provisioningStatus?: AdminProvisioningStatus | null
}) => {
  if (params.provisioningStatus) return params.provisioningStatus

  // Compatibilidad: si no existe provisioningStatus en datos viejos,
  // inferimos desde el placeholder `pending:`.
  return isPendingClerkId(params.clerkId) ? 'pending_invitation' : 'active'
}


export const canResendInvitation = (provisioningStatus?: AdminProvisioningStatus | null) =>
  provisioningStatus === 'pending_invitation' || provisioningStatus === 'sync_error'

export const hasClerkIdentity = (params: {
  clerkId?: string | null
  clerkIds?: string[] | null
  provisioningStatus?: AdminProvisioningStatus | null
}) => {
  if (Array.isArray(params.clerkIds) && params.clerkIds.length > 0) return true
  const provisioningStatus = resolveProvisioningStatus({
    clerkId: params.clerkId,
    provisioningStatus: params.provisioningStatus,
  })
  return provisioningStatus === 'active' && !isPendingClerkId(params.clerkId)
}
