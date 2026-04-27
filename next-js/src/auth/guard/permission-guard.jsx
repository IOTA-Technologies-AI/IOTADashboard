'use client';

import { useRef, useMemo, useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { hasPathPermission, fetchRoleBasedNavPermissions } from 'src/utils/pageAccess';
import { fetchUserEnabledPaths } from 'src/utils/apiHelper';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

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

/**
 * PermissionGuard - Blocks page rendering until permission check completes.
 *
 * Priority order:
 *   1. superAdmin → always allowed
 *   2. Per-user permissions from userNavPermissions table (set by admin)
 *   3. Role-default permissions from navPermissions boolean columns
 *   4. No match → redirect to 403
 */
export function PermissionGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuthContext();

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [allowedPaths, setAllowedPaths] = useState([]);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);

  const loadedUserRef = useRef(null);

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);
  const userEmail = user?.email;

  // Always-allowed paths (exact match only — never grants access to sub-paths)
  const baseAlwaysAllowed = useMemo(() => [paths.dashboard.root, paths.dashboard.general.app], []);

  const isAlwaysAllowed = useMemo(() => {
    if (!pathname) return false;
    const n = (p) => (p?.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
    return baseAlwaysAllowed.some((p) => n(pathname) === n(p));
  }, [pathname, baseAlwaysAllowed]);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user || authLoading) return;

      // 1. SuperAdmin: full access, no DB call needed
      if (role === 'superAdmin') {
        setAllowedPaths(['*']);
        loadedUserRef.current = userEmail;
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      // Already loaded for this user — skip refetch
      if (loadedUserRef.current === userEmail && allowedPaths.length > 0) {
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      setPermissionsLoading(true);

      try {
        // 2. Try per-user permissions first (admin-assigned overrides)
        if (userEmail) {
          const { paths: enabledPaths, hasExplicitPermissions } =
            await fetchUserEnabledPaths(userEmail);

          if (hasExplicitPermissions) {
            // Admin has explicitly configured this user — respect their decision exactly.
            // enabledPaths may be [] if admin revoked everything (that's intentional).
            setAllowedPaths(enabledPaths);
            loadedUserRef.current = userEmail;
            setPermissionsLoading(false);
            setPermissionCheckComplete(true);
            return;
          }
          // No rows yet — fall through to role-based defaults below
        }

        // 3. Fall back to role-based defaults from navPermissions boolean columns
        const rolePaths = await fetchRoleBasedNavPermissions(role);
        setAllowedPaths(rolePaths || []);
        loadedUserRef.current = userEmail;
      } catch (error) {
        console.error('[PermissionGuard] Failed to load permissions:', error);
        setAllowedPaths([]);
      } finally {
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
      }
    };

    loadPermissions();
  }, [userEmail, authLoading, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPermission = hasPathPermission(allowedPaths, pathname);

  useEffect(() => {
    if (!hasPermission && permissionCheckComplete && !authLoading && !permissionsLoading) {
      router.replace(`${paths.page403}?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [hasPermission, pathname, router, authLoading, permissionsLoading, permissionCheckComplete]);

  if (authLoading || permissionsLoading || !permissionCheckComplete) {
    return <SplashScreen />;
  }

  if (role === 'superAdmin') {
    return <>{children}</>;
  }

  if (isAlwaysAllowed) {
    return <>{children}</>;
  }

  if (!hasPermission) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
