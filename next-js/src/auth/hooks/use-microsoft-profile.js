'use client';

import { useEffect, useState, useCallback } from 'react';

import { getOneDriveToken, seedOneDriveToken, refreshAccessToken } from 'src/utils/onedrive-helper';

import { useAuthContext } from './use-auth-context';

const GRAPH_ENDPOINT =
  'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,jobTitle,officeLocation,businessPhones,mobilePhone,city,state,country,department';
const GRAPH_MANAGER_ENDPOINT =
  'https://graph.microsoft.com/v1.0/me/manager?$select=displayName,jobTitle,mail';

const buildLocation = (me) => {
  const parts = [me?.officeLocation, me?.city, me?.state, me?.country].filter(Boolean);
  return parts.join(', ');
};

const decodeJwt = (token) => {
  try {
    const payload = token?.split?.('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch (err) {
    console.warn('Unable to decode JWT payload for role inspection', err);
    return null;
  }
};

export function useMicrosoftProfile() {
  const { user } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runProfileFetch = useCallback(
    async (token, inferredRole) => {
      const headers = { Authorization: `Bearer ${token}` };

      const [meRes, managerRes] = await Promise.all([
        fetch(GRAPH_ENDPOINT, { headers }),
        fetch(GRAPH_MANAGER_ENDPOINT, { headers }),
      ]);

      if (!meRes.ok) {
        const err = new Error('Failed to load Microsoft profile');
        err.status = meRes.status;
        throw err;
      }

      const me = await meRes.json();

      console.info('Microsoft profile role fields', {
        graphJobTitle: me?.jobTitle,
        graphDepartment: me?.department,
        inferredRole,
        userRole: user?.role,
        userRoleId: user?.roleId,
        supabaseRole: user?.user_metadata?.role,
      });

      let manager = null;
      if (managerRes.ok) {
        manager = await managerRes.json();
      }

      const resolvedRole = inferredRole || me?.jobTitle || me?.department || user?.role;

      console.info('Microsoft profile resolved role selection', {
        resolvedRole,
      });

      setProfile({
        displayName: me?.displayName || user?.displayName || user?.email,
        email: me?.mail || me?.userPrincipalName || user?.email,
        jobTitle: resolvedRole,
        department: me?.department,
        managerName: manager?.displayName,
        managerTitle: manager?.jobTitle,
        managerEmail: manager?.mail,
        phone: me?.mobilePhone || (me?.businessPhones || [])[0],
        userPrincipalName: me?.userPrincipalName,
        officeLocation: me?.officeLocation,
        location: buildLocation(me),
        city: me?.city,
        state: me?.state,
        country: me?.country,
      });
    },
    [user]
  );

  const fetchProfile = useCallback(async () => {
    const stored = getOneDriveToken();
    const accessToken = stored.accessToken || user?.provider_token || user?.providerToken;
    const refreshToken =
      stored.refreshToken || user?.provider_refresh_token || user?.providerRefreshToken;

    const claims = decodeJwt(accessToken);
    const tokenRoles = claims?.roles || claims?.wids || [];
    const appRole = Array.isArray(tokenRoles) ? tokenRoles[0] : tokenRoles;

    console.info('Profile fetch: token claims for role resolution', {
      tokenRoles,
      appRole,
      oid: claims?.oid,
      tid: claims?.tid,
      upn: claims?.upn || claims?.preferred_username,
    });

    console.info('Profile fetch: tokens', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      fromStored: !!stored.accessToken,
      fromProvider: !!user?.provider_token || !!user?.providerToken,
    });

    // If we don't have a Graph access token, we cannot fetch Microsoft 365 data.
    if (!accessToken) {
      console.warn('Microsoft profile: no access token available (provider_token missing)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await runProfileFetch(accessToken, appRole);
    } catch (err) {
      if (err?.status === 401 && refreshToken) {
        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const newAccess = refreshed.access_token || refreshed.accessToken;
          const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

          if (newAccess) {
            seedOneDriveToken(newAccess, newRefresh);
            const refreshedClaims = decodeJwt(newAccess);
            const refreshedRoles = refreshedClaims?.roles || refreshedClaims?.wids || [];
            const refreshedRole = Array.isArray(refreshedRoles)
              ? refreshedRoles[0]
              : refreshedRoles;

            console.info('Profile fetch: refreshed token claims', {
              refreshedRoles,
              refreshedRole,
              oid: refreshedClaims?.oid,
              tid: refreshedClaims?.tid,
              upn: refreshedClaims?.upn || refreshedClaims?.preferred_username,
            });

            await runProfileFetch(newAccess, refreshedRole);
          }
        } catch (refreshError) {
          setError(refreshError);
        }
      } else {
        setError(err);
        console.error('Microsoft profile fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  }, [runProfileFetch, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error };
}
