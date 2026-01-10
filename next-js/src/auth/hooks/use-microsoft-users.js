'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  getOneDriveToken,
  seedOneDriveToken,
  refreshAccessToken,
  clearOneDriveToken,
  getStoredRedirectUri,
} from 'src/utils/onedrive-helper';

import { useAuthContext } from './use-auth-context';

const USERS_ENDPOINT =
  'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone,businessPhones,companyName,officeLocation,city,state,country&$top=999';

const mapUser = (user) => {
  const phone = user?.mobilePhone || (user?.businessPhones || [])[0] || '';
  return {
    id: user?.id,
    name: user?.displayName || user?.userPrincipalName || 'Unknown',
    phoneNumber: phone,
    company: user?.companyName || '',
    role: user?.jobTitle || user?.department || 'Member',
    status: 'active',
    email: user?.mail || user?.userPrincipalName,
    username: user?.userPrincipalName,
    location: [user?.city, user?.state, user?.country].filter(Boolean).join(', '),
  };
};

const buildError = (params = {}) => ({
  code: params.code || 'INTERNAL_ERROR',
  message: params.message || 'An internal error occurred',
  status: params.status,
  graphCode: params.graphCode,
  requestId: params.requestId,
  raw: params.raw,
});

export function useMicrosoftUsers() {
  const { user } = useAuthContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (accessToken, refreshToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(USERS_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401 && refreshToken) {
        try {
          const storedRedirectUri = getStoredRedirectUri();
          const refreshed = await refreshAccessToken(refreshToken, storedRedirectUri);
          const newAccess = refreshed?.access_token || refreshed?.accessToken;
          const newRefresh = refreshed?.refresh_token || refreshed?.refreshToken || refreshToken;

          if (newAccess) {
            seedOneDriveToken(newAccess, newRefresh);
            return fetchUsers(newAccess, newRefresh);
          }
        } catch (refreshErr) {
          console.error('Microsoft users token refresh failed', refreshErr);
          clearOneDriveToken();
          setError(new Error('Microsoft session expired. Please reconnect to Microsoft.'));
          setUsers([]);
          return [];
        }
      }

      if (!response.ok) {
        let graphError;
        try {
          graphError = await response.json();
        } catch (jsonErr) {
          graphError = null;
        }

        const code = graphError?.error?.code;
        const requestId = graphError?.error?.innerError?.['request-id'];

        if (code === 'Authorization_RequestDenied') {
          const errObj = buildError({
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Authorization_RequestDenied',
            status: response.status,
            graphCode: code,
            requestId,
            raw: graphError,
          });
          setError(errObj);
          setUsers([]);
          console.error('Microsoft users fetch failed: insufficient privileges', errObj);
          return [];
        }

        const errObj = buildError({
          code: 'GRAPH_ERROR',
          message: graphError?.error?.message || 'Failed to fetch Microsoft users',
          status: response.status,
          graphCode: code,
          requestId,
          raw: graphError,
        });
        setError(errObj);
        setUsers([]);
        console.error('Microsoft users fetch failed', errObj);
        return [];
      }

      const data = await response.json();
      const mapped = Array.isArray(data.value) ? data.value.map(mapUser) : [];
      setUsers(mapped);
      return mapped;
    } catch (err) {
      const errObj = buildError({ code: 'FETCH_FAILED', message: err?.message, raw: err });
      setError(errObj);
      setUsers([]);
      console.error('Microsoft users fetch failed', errObj);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = getOneDriveToken();
    const accessToken = stored.accessToken || user?.provider_token || user?.providerToken;
    const refreshToken =
      stored.refreshToken || user?.provider_refresh_token || user?.providerRefreshToken;

    console.info('Users fetch: tokens', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      fromStored: !!stored.accessToken,
      fromProvider: !!user?.provider_token || !!user?.providerToken,
    });

    if (!accessToken) {
      console.warn('Microsoft users: no access token available (provider_token missing)');
      setError(buildError({ code: 'NO_TOKEN', message: 'Connect Microsoft to load users' }));
      setUsers([]);
      return;
    }

    fetchUsers(accessToken, refreshToken);
  }, [fetchUsers, user]);

  return { users, loading, error };
}
