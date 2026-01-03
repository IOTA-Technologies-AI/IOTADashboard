'use client';

import { useState, useEffect, useCallback } from 'react';

import { getOneDriveToken, seedOneDriveToken, refreshAccessToken } from 'src/utils/onedrive-helper';

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
        const refreshed = await refreshAccessToken(refreshToken);
        const newAccess = refreshed.access_token || refreshed.accessToken;
        const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

        if (newAccess) {
          seedOneDriveToken(newAccess, newRefresh);
          return fetchUsers(newAccess, newRefresh);
        }
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to fetch Microsoft users');
      }

      const data = await response.json();
      const mapped = Array.isArray(data.value) ? data.value.map(mapUser) : [];
      setUsers(mapped);
      return mapped;
    } catch (err) {
      setError(err);
      setUsers([]);
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

    if (!accessToken) return;

    fetchUsers(accessToken, refreshToken);
  }, [fetchUsers, user]);

  return { users, loading, error };
}
