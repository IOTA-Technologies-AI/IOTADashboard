'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios, { endpoints } from 'src/lib/axios';

import { AuthContext } from '../auth-context';
import { setSession, isValidToken } from './utils';
import { USER_ID, JWT_STORAGE_KEY } from './constant';

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
      const accessToken = sessionStorage.getItem(JWT_STORAGE_KEY);

      const userId = sessionStorage.getItem(USER_ID);

      if (accessToken && isValidToken(accessToken)) {
        setSession(accessToken, userId);

        const res = await axios.get(endpoints.auth.me + userId);

        const { user } = res.data;

        const { fullName: displayName } = res.data[0];

        setState({ user: { ...user, accessToken, displayName }, loading: false });
      } else {
        sessionStorage.removeItem(JWT_STORAGE_KEY);
        sessionStorage.removeItem(USER_ID);
        setState({ user: null, loading: false });
      }
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? { ...state.user, role: state.user?.role ?? 'admin', displayName: state.user.displayName }
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
