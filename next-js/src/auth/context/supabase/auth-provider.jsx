'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback, useState } from 'react';

import axios from 'src/lib/axios';
import { seedOneDriveToken } from 'src/utils/onedrive-helper';
import { supabase } from 'src/lib/supabase';

import { AuthContext } from '../auth-context';

const roleIdToName = {
  1: 'regular',
  2: 'manager',
  3: 'admin',
  4: 'superAdmin',
};

// Map Azure AD appRole GUIDs to friendly roles. Defaults are the current App Registration IDs;
// env vars can override but are optional now that we normalize Task.* values too.
const appRoleIdToName = {
  'e86d21ea-be40-41a0-8f3d-3df66965f3c5': 'regular',
  '0beb17cc-7663-43a2-97d3-dcb5176914be': 'manager',
  '37d3b66a-2659-4e33-b8a0-27825ef72593': 'admin',
  '69a563e8-d75e-47bd-b720-eaf301c91738': 'superAdmin',
  ...(process.env.NEXT_PUBLIC_AZURE_ROLE_REGULAR
    ? { [process.env.NEXT_PUBLIC_AZURE_ROLE_REGULAR]: 'regular' }
    : {}),
  ...(process.env.NEXT_PUBLIC_AZURE_ROLE_MANAGER
    ? { [process.env.NEXT_PUBLIC_AZURE_ROLE_MANAGER]: 'manager' }
    : {}),
  ...(process.env.NEXT_PUBLIC_AZURE_ROLE_ADMIN
    ? { [process.env.NEXT_PUBLIC_AZURE_ROLE_ADMIN]: 'admin' }
    : {}),
  ...(process.env.NEXT_PUBLIC_AZURE_ROLE_SUPERADMIN
    ? { [process.env.NEXT_PUBLIC_AZURE_ROLE_SUPERADMIN]: 'superAdmin' }
    : {}),
};

const appRoleValueToName = {
  Task: 'regular',
  'Task.User': 'regular',
  'Task.Manager': 'manager',
  'Task.Admin': 'admin',
  'Task.SuperAdmin': 'superAdmin',
};

const SUPER_ADMIN_IDS = ['69a563e8-d75e-47bd-b720-eaf301c91738'];
const SUPER_ADMIN_VALUES = ['Task.SuperAdmin', 'task.superadmin', 'superAdmin', 'superadmin'];

const normalizeRoleString = (value) => {
  if (!value) return null;
  const val = String(value);
  if (appRoleValueToName[val]) return appRoleValueToName[val];
  if (SUPER_ADMIN_VALUES.includes(val)) return 'superAdmin';
  if (SUPER_ADMIN_IDS.includes(val)) return 'superAdmin';
  if (val.toLowerCase().startsWith('task.')) return val.slice('Task.'.length).toLowerCase();
  if (appRoleIdToName[val]) return appRoleIdToName[val];
  return null;
};

const displayNameFromMetadata = (user) => {
  const meta = user?.user_metadata || {};
  return (
    meta.display_name ||
    meta.name ||
    meta.full_name ||
    meta.given_name ||
    meta.first_name ||
    (meta.given_name && meta.family_name && `${meta.given_name} ${meta.family_name}`) ||
    user?.email ||
    'User'
  );
};

const isPlaceholderRole = (value) => value === 'authenticated' || value === 'unauthenticated';

const azureIdentityData = (user) => {
  if (!user?.identities || !Array.isArray(user.identities)) return {};
  const azureIdentity = user.identities.find((i) => i?.provider === 'azure');
  return azureIdentity?.identity_data || {};
};

const identityRoles = (user) => {
  const identityData = azureIdentityData(user);
  const customClaims = identityData?.custom_claims || {};
  return customClaims?.roles || identityData?.roles || [];
};

const resolveAzureUserId = (user, claims) => {
  const metadataOid = user?.user_metadata?.azure_oid || user?.user_metadata?.oid;
  const identityData = azureIdentityData(user);
  const customClaims = identityData?.custom_claims || {};

  return (
    customClaims?.oid ||
    identityData?.oid ||
    claims?.oid ||
    metadataOid ||
    identityData?.sub ||
    claims?.sub ||
    null
  );
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

const normalizeRole = (role, roleId, metadata, appRoles, tokenRoles) => {
  const roleCandidate = isPlaceholderRole(role) ? null : role;
  const metaRole = isPlaceholderRole(metadata?.role) ? null : metadata?.role;

  if (SUPER_ADMIN_VALUES.includes(roleCandidate) || SUPER_ADMIN_IDS.includes(roleCandidate))
    return 'superAdmin';
  if (SUPER_ADMIN_VALUES.includes(metaRole) || SUPER_ADMIN_IDS.includes(metaRole))
    return 'superAdmin';

  if (roleCandidate) return roleCandidate;
  if (metaRole) return metaRole;
  if (roleId && roleIdToName[roleId]) return roleIdToName[roleId];
  if (metadata?.roleId && roleIdToName[metadata.roleId]) return roleIdToName[metadata.roleId];

  const rolesArray = []
    .concat(appRoles || [])
    .concat(tokenRoles || [])
    .filter(Boolean)
    .map((r) => String(r));

  const mapped = rolesArray.map((r) => normalizeRoleString(r)).find(Boolean);
  if (mapped) return mapped;

  return 'regular';
};

// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

export function AuthProvider({ children }) {
  const { state, setState } = useSetState({ user: null, loading: true });
  const [apiAppRoles, setApiAppRoles] = useState([]);

  const checkUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setState({ user: null, loading: false });
        console.error(error);
        throw error;
      }

      if (session) {
        const accessToken = session?.access_token;

        setState({ user: { ...session, ...session?.user }, loading: false });
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        setState({ user: null, loading: false });
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();

    // Listen for auth state changes to capture provider tokens from OAuth flow
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Capture provider_token immediately when user signs in via OAuth
        const providerToken = session?.provider_token;
        const providerRefreshToken = session?.provider_refresh_token;

        if (providerToken) {
          console.log('[Auth] Captured provider token from OAuth sign-in');
          seedOneDriveToken(providerToken, providerRefreshToken);
        }

        // Update user state with full session including provider tokens
        setState({ user: { ...session, ...session?.user }, loading: false });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed OneDrive tokens from the authenticated session (provider tokens), so we don't force
  // users to re-login to Microsoft for OneDrive actions.
  useEffect(() => {
    if (!state.user) return;

    const token = state.user?.provider_token || state.user?.providerToken;
    const refresh = state.user?.provider_refresh_token || state.user?.providerRefreshToken;

    if (token) {
      seedOneDriveToken(token, refresh);
    }
  }, [state.user]);

  useEffect(() => {
    const fetchAppRoles = async () => {
      if (!state.user) {
        setApiAppRoles([]);
        return;
      }
      try {
        const claims = decodeJwt(state.user?.access_token || state.user?.accessToken);
        let inlineRoles = identityRoles(state.user);

        // If roles are not in the session payload, fetch the fresh user (identities) from Supabase.
        if (!inlineRoles.length) {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data?.user) {
            inlineRoles = identityRoles(data.user);
          }
        }

        if (inlineRoles.length) {
          setApiAppRoles(inlineRoles);
          return;
        }

        // No inline roles found; skip calling the approle API per current requirement.
        console.warn('No inline roles found in identity claims; approle API skipped');
        setApiAppRoles([]);
      } catch (err) {
        console.warn('App role assignments fetch failed; falling back to token/metadata', err);
        setApiAppRoles([]);
      }
    };

    fetchAppRoles();
  }, [state.user]);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(() => {
    const appRoles =
      state.user?.app_metadata?.roles || state.user?.roles || state.user?.user_metadata?.roles;

    const claims = decodeJwt(state.user?.access_token || state.user?.accessToken);
    const identityData = azureIdentityData(state.user);
    const inlineRoles = identityRoles(state.user);
    const oid = resolveAzureUserId(state.user, claims);

    const tokenRoles = inlineRoles.length ? inlineRoles : claims?.roles || claims?.wids || [];

    const role = state.user
      ? normalizeRole(
          state.user?.role,
          state.user?.roleId,
          state.user?.user_metadata,
          [...(appRoles || []), ...apiAppRoles],
          tokenRoles
        )
      : null;

    // Debug: Log the Azure OID being used for permissions

    return {
      user: state.user
        ? {
            ...state.user,
            id: state.user?.id,
            // Microsoft 365 / Azure AD Object ID - use this for user permissions lookup
            azureOid: oid,
            // Ensure email is always available - check multiple sources
            email:
              state.user?.email ||
              state.user?.user_metadata?.email ||
              identityData?.email ||
              claims?.upn ||
              claims?.preferred_username ||
              state.user?.user_metadata?.preferred_username,
            accessToken: state.user?.access_token,
            displayName: displayNameFromMetadata(state.user),
            role,
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    };
  }, [apiAppRoles, checkUserSession, state.user, status]);

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
