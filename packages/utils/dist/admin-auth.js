export const permissionRank = {
    none: 0,
    read: 1,
    write: 2,
    admin: 3,
};
export const rolePermissions = {
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
};
export const normalizeEmail = (email) => (email === null || email === void 0 ? void 0 : email.trim().toLowerCase()) || '';
export const resolveDefaultPermissions = (role) => rolePermissions[(role || '')] || rolePermissions.gestor;
export const getPrimaryEmail = (user) => {
    var _a, _b;
    const primaryId = (user === null || user === void 0 ? void 0 : user.primaryEmailAddressId) || (user === null || user === void 0 ? void 0 : user.primary_email_address_id);
    const addresses = (user === null || user === void 0 ? void 0 : user.emailAddresses) || (user === null || user === void 0 ? void 0 : user.email_addresses) || [];
    const primary = addresses.find((entry) => entry.id === primaryId);
    return normalizeEmail((primary === null || primary === void 0 ? void 0 : primary.emailAddress) ||
        (primary === null || primary === void 0 ? void 0 : primary.email_address) ||
        ((_a = addresses[0]) === null || _a === void 0 ? void 0 : _a.emailAddress) ||
        ((_b = addresses[0]) === null || _b === void 0 ? void 0 : _b.email_address));
};
export const createFetchPrimaryEmail = (fetchUserById) => async (clerkId) => getPrimaryEmail(await fetchUserById(clerkId));
export async function resolveAdminRecordByIdentity({ clerkId, emailHint, findByClerkId, findAndLinkByEmail, fetchClerkEmail, onClerkEmailLookupFailed, onAdminReconciled, }) {
    const existing = await findByClerkId(clerkId);
    if (existing)
        return existing;
    let email = normalizeEmail(emailHint);
    if (!email && fetchClerkEmail) {
        try {
            email = normalizeEmail(await fetchClerkEmail(clerkId));
        }
        catch (error) {
            onClerkEmailLookupFailed === null || onClerkEmailLookupFailed === void 0 ? void 0 : onClerkEmailLookupFailed({ clerkId, error });
            email = '';
        }
    }
    if (!email)
        return null;
    const reconciled = await findAndLinkByEmail({ clerkId, email });
    if (reconciled) {
        onAdminReconciled === null || onAdminReconciled === void 0 ? void 0 : onAdminReconciled({ clerkId, email });
    }
    return reconciled;
}
