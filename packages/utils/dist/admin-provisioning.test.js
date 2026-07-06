import test from 'node:test';
import assert from 'node:assert/strict';
import { canResendInvitation, hasClerkIdentity, isPendingClerkId, makePendingClerkId, resolveProvisioningStatus, } from './admin-provisioning';
test('makePendingClerkId normalizes email and marks it as pending', () => {
    const clerkId = makePendingClerkId('  Admin@Servasmar.CL ');
    assert.equal(clerkId, 'pending:admin@servasmar.cl');
    assert.equal(isPendingClerkId(clerkId), true);
    assert.equal(isPendingClerkId('user_123'), false);
});
test('resolveProvisioningStatus prefers explicit provisioningStatus', () => {
    assert.equal(resolveProvisioningStatus({
        clerkId: 'pending:admin@servasmar.cl',
        provisioningStatus: 'sync_error',
    }), 'sync_error');
});
test('resolveProvisioningStatus keeps compatibility with legacy pending clerk ids', () => {
    assert.equal(resolveProvisioningStatus({
        clerkId: 'pending:legacy@servasmar.cl',
        provisioningStatus: undefined,
    }), 'pending_invitation');
    assert.equal(resolveProvisioningStatus({
        clerkId: 'user_123',
        provisioningStatus: undefined,
    }), 'active');
});
test('canResendInvitation only allows pending or sync errors', () => {
    assert.equal(canResendInvitation('pending_invitation'), true);
    assert.equal(canResendInvitation('sync_error'), true);
    assert.equal(canResendInvitation('active'), false);
    assert.equal(canResendInvitation(undefined), false);
});
test('hasClerkIdentity returns true when clerkIds are present', () => {
    assert.equal(hasClerkIdentity({
        clerkId: 'pending:admin@servasmar.cl',
        clerkIds: ['user_123'],
        provisioningStatus: 'pending_invitation',
    }), true);
});
test('hasClerkIdentity depends on active provisioning for single clerkId flows', () => {
    assert.equal(hasClerkIdentity({
        clerkId: 'user_123',
        provisioningStatus: 'active',
    }), true);
    assert.equal(hasClerkIdentity({
        clerkId: 'pending:admin@servasmar.cl',
        provisioningStatus: 'pending_invitation',
    }), false);
    assert.equal(hasClerkIdentity({
        clerkId: 'user_123',
        provisioningStatus: 'sync_error',
    }), false);
});
