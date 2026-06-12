'use client';

import { useMemo, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { hasPathPermission } from 'src/utils/pageAccess';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

const roleIdToName = {
  1: 'regular',
  2: 'manager',
  3: 'admin',
  4: 'superAdmin',
};

const normalizeRole = (role, roleId) => {
  if (role) return role;
  if (roleId && roleIdToName[roleId]) return roleIdToName[roleId];
  return 'regular';
};

// Kept for API compatibility — no-op. Permissions are now fetched once at
// login and stored in auth context. Changes take effect on the affected
// user's next page reload or sign-in.
export const clearPermissionCache = () => {};

// ----------------------------------------------------------------------

/**
 * PermissionGuard — blocks page rendering until permissions are loaded.
 *
 * Permissions are fetched ONCE at login in AuthProvider and stored in context.
 * Navigation between pages is instant — no API call per route change.
 *
 * Priority order:
 *   1. superAdmin → always allowed
 *   2. Always-allowed paths (dashboard root, app home)
 *   3. Per-user explicit permissions (admin-assigned)
 *   4. Role-default permissions from navPermissions boolean columns
 *   5. No match → redirect to 403
 */
export function PermissionGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, allowedPaths, permissionsLoading } = useAuthContext();

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);

  const baseAlwaysAllowed = useMemo(
    () => [
      paths.dashboard.root,
      paths.dashboard.general.app,
      // TOTP authenticator setup must always be reachable — any authenticated user
      // needs to complete 2FA setup before they have other permissions assigned.
      `${paths.dashboard.user.account}/authenticator`,
    ],
    []
  );

  const isAlwaysAllowed = useMemo(() => {
    if (!pathname) return false;
    const normalize = (p) => (p?.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
    return baseAlwaysAllowed.some((p) => normalize(pathname) === normalize(p));
  }, [pathname, baseAlwaysAllowed]);

  const hasPermission =
    role === 'superAdmin' || isAlwaysAllowed || hasPathPermission(allowedPaths, pathname);

  useEffect(() => {
    if (!authLoading && !permissionsLoading && user && !hasPermission) {
      router.replace(`${paths.page403}?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [hasPermission, pathname, router, authLoading, permissionsLoading, user]);

  if (authLoading || permissionsLoading) {
    return <SplashScreen />;
  }

  if (!hasPermission) {
    // Brief SplashScreen while the redirect fires
    return <SplashScreen />;
  }

  return <>{children}</>;
}
