'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios from 'src/lib/axios';
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

const normalizeRoleString = (value) => {
  if (!value) return null;
  if (appRoleValueToName[value]) return appRoleValueToName[value];
  if (value.startsWith('Task.')) return value.slice('Task.'.length).toLowerCase();
  if (appRoleIdToName[value]) return appRoleIdToName[value];
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

const normalizeRole = (role, roleId, metadata, appRoles) => {
  if (role) return role;
  if (metadata?.role) return metadata.role;
  if (roleId && roleIdToName[roleId]) return roleIdToName[roleId];
  if (metadata?.roleId && roleIdToName[metadata.roleId]) return roleIdToName[metadata.roleId];

  const rolesArray = []
    .concat(appRoles || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            id: state.user?.id,
            accessToken: state.user?.access_token,
            displayName: displayNameFromMetadata(state.user),
            role: normalizeRole(
              state.user?.role,
              state.user?.roleId,
              state.user?.user_metadata,
              state.user?.app_metadata?.roles ||
                state.user?.roles ||
                state.user?.user_metadata?.roles
            ),
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
