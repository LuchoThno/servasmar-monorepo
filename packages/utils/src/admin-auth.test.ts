import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createFetchPrimaryEmail,
  getPrimaryEmail,
  normalizeEmail,
  resolveAdminRecordByIdentity,
  resolveDefaultPermissions,
} from './admin-auth'

test('normalizeEmail trims and lowercases values', () => {
  assert.equal(normalizeEmail('  Admin@Servasmar.CL '), 'admin@servasmar.cl')
  assert.equal(normalizeEmail(undefined), '')
})

test('resolveDefaultPermissions falls back to gestor for unknown roles', () => {
  assert.deepEqual(resolveDefaultPermissions('admin'), {
    clients: 'admin',
    projects: 'admin',
    tasks: 'admin',
    quotes: 'admin',
    finance: 'admin',
    users: 'admin',
  })

  assert.deepEqual(resolveDefaultPermissions('desconocido'), {
    clients: 'write',
    projects: 'write',
    tasks: 'write',
    quotes: 'write',
    finance: 'write',
    users: 'none',
  })
})

test('getPrimaryEmail resolves the primary Clerk address across payload shapes', () => {
  assert.equal(
    getPrimaryEmail({
      primaryEmailAddressId: 'mail_2',
      emailAddresses: [
        { id: 'mail_1', emailAddress: 'other@servasmar.cl' },
        { id: 'mail_2', emailAddress: 'primary@servasmar.cl' },
      ],
    }),
    'primary@servasmar.cl'
  )

  assert.equal(
    getPrimaryEmail({
      primary_email_address_id: 'mail_1',
      email_addresses: [{ id: 'mail_1', email_address: 'legacy@servasmar.cl' }],
    }),
    'legacy@servasmar.cl'
  )
})

test('createFetchPrimaryEmail delegates to Clerk user fetch and normalizes the result', async () => {
  const fetchPrimaryEmail = createFetchPrimaryEmail(async () => ({
    primaryEmailAddressId: 'mail_1',
    emailAddresses: [{ id: 'mail_1', emailAddress: ' Team@Servasmar.CL ' }],
  }))

  const email = await fetchPrimaryEmail('user_123')
  assert.equal(email, 'team@servasmar.cl')
})

test('resolveAdminRecordByIdentity returns existing admin before trying email reconciliation', async () => {
  const existingUser = { id: 'mongo_1' }
  let findAndLinkCalls = 0

  const resolved = await resolveAdminRecordByIdentity({
    clerkId: 'user_123',
    emailHint: 'admin@servasmar.cl',
    findByClerkId: async () => existingUser,
    findAndLinkByEmail: async () => {
      findAndLinkCalls += 1
      return null
    },
  })

  assert.equal(resolved, existingUser)
  assert.equal(findAndLinkCalls, 0)
})

test('resolveAdminRecordByIdentity reconciles by normalized email hint', async () => {
  const reconciledUser = { id: 'mongo_2' }
  let linkedWith: { clerkId: string; email: string } | null = null

  const resolved = await resolveAdminRecordByIdentity({
    clerkId: 'user_456',
    emailHint: '  Admin@Servasmar.CL ',
    findByClerkId: async () => null,
    findAndLinkByEmail: async (params) => {
      linkedWith = params
      return reconciledUser
    },
  })

  assert.equal(resolved, reconciledUser)
  assert.deepEqual(linkedWith, { clerkId: 'user_456', email: 'admin@servasmar.cl' })
})

test('resolveAdminRecordByIdentity fetches Clerk email when emailHint is missing', async () => {
  const reconciledUser = { id: 'mongo_3' }
  let lookedUpClerkId = ''
  let reconciledContext: { clerkId: string; email: string } | null = null

  const resolved = await resolveAdminRecordByIdentity({
    clerkId: 'user_789',
    findByClerkId: async () => null,
    findAndLinkByEmail: async ({ clerkId, email }) => {
      reconciledContext = { clerkId, email }
      return reconciledUser
    },
    fetchClerkEmail: async (clerkId) => {
      lookedUpClerkId = clerkId
      return 'owner@servasmar.cl'
    },
  })

  assert.equal(resolved, reconciledUser)
  assert.equal(lookedUpClerkId, 'user_789')
  assert.deepEqual(reconciledContext, { clerkId: 'user_789', email: 'owner@servasmar.cl' })
})

test('resolveAdminRecordByIdentity handles Clerk email lookup failures without throwing', async () => {
  let lookupFailed = false

  const resolved = await resolveAdminRecordByIdentity({
    clerkId: 'user_error',
    findByClerkId: async () => null,
    findAndLinkByEmail: async () => {
      throw new Error('should not reconcile without email')
    },
    fetchClerkEmail: async () => {
      throw new Error('lookup_failed')
    },
    onClerkEmailLookupFailed: ({ clerkId, error }) => {
      lookupFailed = clerkId === 'user_error' && error instanceof Error && error.message === 'lookup_failed'
    },
  })

  assert.equal(resolved, null)
  assert.equal(lookupFailed, true)
})
