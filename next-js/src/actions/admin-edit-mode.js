'use client';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------
// Record Edit Mode
//
// Invoices and expenses lock once they leave the pending stage. A super-admin
// can still correct them, but only while Record Edit Mode is switched on from
// Account > Admin Settings. The switch lives in the appConfig table and
// auto-expires; the backend re-checks both the role and the window on every
// write, so the hooks below only drive the UI.
// ----------------------------------------------------------------------

const EDIT_MODE_KEY = endpoints.admin.editMode;

const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

const swrOptions = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  // The window expires on its own — re-check often enough that the UI locks
  // back up without a manual refresh.
  refreshInterval: 60000,
};

const emptyStatus = {
  active: false,
  enabled: false,
  enabledBy: null,
  enabledByName: null,
  enabledAt: null,
  expiresAt: null,
  durationMinutes: 60,
  minutesRemaining: 0,
};

/**
 * @summary Current Record Edit Mode status, with the expiry already applied.
 * @returns {{ editMode: object, editModeActive: boolean, editModeLoading: boolean, editModeError: any }}
 */
export function useEditMode() {
  const { data, isLoading, error } = useSWR(EDIT_MODE_KEY, fetcher, swrOptions);

  return useMemo(() => {
    const editMode = data?.editMode ?? emptyStatus;
    return {
      editMode,
      editModeActive: !!editMode.active,
      editModeLoading: isLoading,
      editModeError: error,
    };
  }, [data, isLoading, error]);
}

/**
 * @summary Resolves whether the signed-in user may edit a record that has left
 *          the pending stage — super-admin AND an open edit-mode window.
 * @param {boolean} isPending Whether the record is still pending/draft.
 */
export function useCanEditLockedRecord(isPending = false) {
  const { user } = useAuthContext();
  const { editMode, editModeActive, editModeLoading } = useEditMode();

  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';

  return {
    isSuperAdmin,
    editMode,
    editModeActive,
    editModeLoading,
    // Pending records follow the existing owner/super-admin rules; only locked
    // records need the switch.
    canEditLocked: isSuperAdmin && (isPending || editModeActive),
  };
}

/**
 * @summary Turns Record Edit Mode on or off. Super-admins only (re-checked server-side).
 * @param {{ enabled: boolean, durationMinutes?: number, user?: object }} params
 */
export async function setEditMode({ enabled, durationMinutes, user }) {
  const payload = {
    enabled,
    durationMinutes,
    userEmail: user?.email,
    userName: user?.displayName || user?.name || user?.email,
    roleId: user?.roleId ?? (user?.role === 'superAdmin' ? 4 : 1),
  };

  const res = await axios.post(EDIT_MODE_KEY, payload);

  await mutate(EDIT_MODE_KEY);
  // The toggle itself is audited, so any open log view is now stale.
  await mutate((key) => typeof key === 'string' && key.startsWith(endpoints.admin.editAudit));

  return res.data?.editMode;
}

// ----------------------------------------------------------------------
// Audit trail
// ----------------------------------------------------------------------

const auditKey = ({ entityType, entityId, limit } = {}) => {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return query ? `${endpoints.admin.editAudit}?${query}` : endpoints.admin.editAudit;
};

/**
 * @summary Reads the edit audit trail — globally, or scoped to one record.
 * @param {{ entityType?: string, entityId?: string, limit?: number, enabled?: boolean }} params
 */
export function useEditAudit({ entityType, entityId, limit = 100, enabled = true } = {}) {
  const key = enabled ? auditKey({ entityType, entityId, limit }) : null;
  const { data, isLoading, error, isValidating } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    auditEntries: data?.entries ?? [],
    auditLoading: isLoading,
    auditValidating: isValidating,
    auditError: error,
    refreshAudit: () => mutate(key),
  };
}
