'use client';

import { useEffect, useState, useCallback } from 'react';

import { getOneDriveToken, seedOneDriveToken, refreshAccessToken } from 'src/utils/onedrive-helper';
import { supabase } from 'src/lib/supabase';

import { useAuthContext } from './use-auth-context';

const GRAPH_ENDPOINT =
  'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,jobTitle,officeLocation,businessPhones,mobilePhone,city,state,country,department';
const GRAPH_MANAGER_ENDPOINT =
  'https://graph.microsoft.com/v1.0/me/manager?$select=displayName,jobTitle,mail';

const buildLocation = (me) => {
  const parts = [me?.officeLocation, me?.city, me?.state, me?.country].filter(Boolean);
  return parts.join(', ');
};

const buildProfileFromUser = (user) => {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    displayName:
      user.displayName || meta.display_name || meta.name || meta.full_name || user.email || 'User',
    email: user.email,
    jobTitle: user.role || meta.role || meta.jobTitle,
    department: meta.department,
    managerName: meta.managerName,
    managerTitle: meta.managerTitle,
    managerEmail: meta.managerEmail,
    phone: meta.phone || meta.mobilePhone,
    userPrincipalName: user.email,
    officeLocation: meta.officeLocation,
    location: [meta.city, meta.state, meta.country].filter(Boolean).join(', '),
    city: meta.city,
    state: meta.state,
    country: meta.country,
  };
};

export function useMicrosoftProfile() {
  const { user } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runProfileFetch = useCallback(
    async (token) => {
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

      let manager = null;
      if (managerRes.ok) {
        manager = await managerRes.json();
      }

      setProfile({
        displayName: me?.displayName || user?.displayName || user?.email,
        email: me?.mail || me?.userPrincipalName || user?.email,
        jobTitle: me?.jobTitle || user?.role,
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

  const fetchProfileFromSupabase = useCallback(async () => {
    try {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select(
          'full_name, email, role, department, manager_name, manager_title, manager_email, phone, city, state, country, office_location'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const supaProfile = {
        displayName: data.full_name || user.email || 'User',
        email: data.email || user.email,
        jobTitle: data.role,
        department: data.department,
        managerName: data.manager_name,
        managerTitle: data.manager_title,
        managerEmail: data.manager_email,
        phone: data.phone,
        userPrincipalName: data.email || user.email,
        officeLocation: data.office_location,
        location: [data.city, data.state, data.country].filter(Boolean).join(', '),
        city: data.city,
        state: data.state,
        country: data.country,
      };

      setProfile((prev) => prev || supaProfile);
      return supaProfile;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    const stored = getOneDriveToken();
    const accessToken = stored.accessToken || user?.provider_token || user?.providerToken;
    const refreshToken =
      stored.refreshToken || user?.provider_refresh_token || user?.providerRefreshToken;

    // Fallback: populate from local user or Supabase if no Graph token is present
    if (!accessToken) {
      await fetchProfileFromSupabase();
      setProfile((prev) => prev || buildProfileFromUser(user));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await runProfileFetch(accessToken);
    } catch (err) {
      if (err?.status === 401 && refreshToken) {
        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const newAccess = refreshed.access_token || refreshed.accessToken;
          const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

          if (newAccess) {
            seedOneDriveToken(newAccess, newRefresh);
            await runProfileFetch(newAccess);
          }
        } catch (refreshError) {
          setError(refreshError);
        }
      } else {
        setError(err);
        await fetchProfileFromSupabase();
        setProfile((prev) => prev || buildProfileFromUser(user));
      }
    } finally {
      setLoading(false);
    }
  }, [fetchProfileFromSupabase, runProfileFetch, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error };
}
