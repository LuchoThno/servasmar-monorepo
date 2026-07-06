import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAdminUserCreateInput,
  buildAdminUserListFilter,
  buildAdminUserResendInvitationUpdate,
  buildAdminUserUpdateInput,
} from './admin-users'

test('buildAdminUserListFilter includes search, status, role and provisioning filters', () => {
  const filter = buildAdminUserListFilter({
    search: 'ana',
    role: 'gestor',
    status: 'active',
    provisioningStatus: 'pending_invitation',
  })

  assert.deepEqual(filter, {
    role: 'gestor',
    status: 'active',
    provisioningStatus: 'pending_invitation',
    $or: [
      { name: { $regex: 'ana', $options: 'i' } },
      { email: { $regex: 'ana', $options: 'i' } },
    ],
  })
})

test('buildAdminUserCreateInput creates pending internal users when clerkId is omitted', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserCreateInput({
    payload: {
      name: 'Ana Marina',
      email: ' ANA@SERVASMAR.CL ',
      role: 'gestor',
      status: 'active',
    },
    createdBy: 'user_admin',
    now,
  })

  assert.equal(result.email, 'ana@servasmar.cl')
  assert.equal(result.requestedClerkId, undefined)
  assert.equal(result.clerkId, 'pending:ana@servasmar.cl')
  assert.equal(result.provisioningStatus, 'pending_invitation')
  assert.deepEqual(result.document, {
    clerkId: 'pending:ana@servasmar.cl',
    clerkIds: [],
    name: 'Ana Marina',
    email: 'ana@servasmar.cl',
    role: 'gestor',
    status: 'active',
    provisioningStatus: 'pending_invitation',
    provisioningError: undefined,
    invitationSentAt: undefined,
    activatedAt: undefined,
    createdBy: 'user_admin',
    permissions: {
      clients: 'write',
      projects: 'write',
      tasks: 'write',
      quotes: 'write',
      finance: 'write',
      users: 'none',
    },
  })
})

test('buildAdminUserCreateInput keeps active users with explicit clerkId', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserCreateInput({
    payload: {
      clerkId: 'user_123',
      name: 'Ana Marina',
      email: 'ana@servasmar.cl',
      role: 'visor',
      status: 'inactive',
    },
    createdBy: 'user_admin',
    now,
  })

  assert.equal(result.clerkId, 'user_123')
  assert.equal(result.provisioningStatus, 'active')
  assert.deepEqual(result.document.clerkIds, ['user_123'])
  assert.equal(result.document.activatedAt, now)
})

test('buildAdminUserUpdateInput preserves sync_error while pending user changes email', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserUpdateInput({
    current: {
      clerkId: 'pending:old@servasmar.cl',
      clerkIds: [],
      provisioningStatus: 'sync_error',
      provisioningError: 'Clerk timeout',
      activatedAt: null,
      email: 'old@servasmar.cl',
    },
    payload: {
      name: 'Ana Marina',
      email: 'new@servasmar.cl',
      role: 'gestor',
      status: 'active',
    },
    now,
  })

  assert.equal(result.nextClerkId, 'pending:new@servasmar.cl')
  assert.equal(result.nextProvisioningStatus, 'sync_error')
  assert.equal(result.shouldSyncClerk, false)
  assert.equal(result.update.provisioningError, 'Clerk timeout')
  assert.equal(result.update.activatedAt, null)
})

test('buildAdminUserUpdateInput promotes explicit clerk identity to active and syncable', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserUpdateInput({
    current: {
      clerkId: 'pending:ana@servasmar.cl',
      clerkIds: [],
      provisioningStatus: 'pending_invitation',
      provisioningError: null,
      activatedAt: null,
      email: 'ana@servasmar.cl',
    },
    payload: {
      clerkId: 'user_999',
      name: 'Ana Marina',
      email: 'ana@servasmar.cl',
      role: 'admin',
      status: 'active',
    },
    now,
  })

  assert.equal(result.nextClerkId, 'user_999')
  assert.equal(result.nextProvisioningStatus, 'active')
  assert.equal(result.shouldSyncClerk, true)
  assert.deepEqual(result.update.clerkIds, ['user_999'])
  assert.equal(result.update.activatedAt, now)
})

test('buildAdminUserResendInvitationUpdate resets pending state and regenerates placeholder id when needed', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserResendInvitationUpdate({
    user: {
      clerkId: 'pending:ana@servasmar.cl',
      clerkIds: [],
      provisioningStatus: 'sync_error',
      provisioningError: 'Clerk timeout',
      activatedAt: null,
      email: 'ana.nueva@servasmar.cl',
    },
    now,
  })

  assert.deepEqual(result, {
    $set: {
      provisioningStatus: 'pending_invitation',
      provisioningError: undefined,
      invitationSentAt: now,
      clerkId: 'pending:ana.nueva@servasmar.cl',
    },
  })
})

test('buildAdminUserResendInvitationUpdate preserves real clerk ids when identity already exists', () => {
  const now = new Date('2026-07-06T12:00:00.000Z')
  const result = buildAdminUserResendInvitationUpdate({
    user: {
      clerkId: 'user_123',
      clerkIds: ['user_123'],
      provisioningStatus: 'active',
      provisioningError: null,
      activatedAt: now,
      email: 'ana@servasmar.cl',
    },
    now,
  })

  assert.equal(result.$set.clerkId, 'user_123')
})
