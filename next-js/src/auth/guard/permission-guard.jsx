'use client';

import { useMemo, useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import {
  resolvePageAccess,
  hasPathPermission,
  fetchUserNavPermissions,
} from 'src/utils/pageAccess';

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
 * PermissionGuard - Blocks page rendering until permission check completes
 *
 * This guard:
 * 1. Shows loading screen while checking permissions
 * 2. Blocks rendering if user lacks permission
 * 3. Redirects to 403 page if unauthorized
 * 4. Only renders children if user has permission
 */
export function PermissionGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuthContext();

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [allowedPaths, setAllowedPaths] = useState([]);

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);
  const userEmail = user?.email;

  // Always allowed paths - dashboard home and access control
  const baseAlwaysAllowed = useMemo(
    () => [
      paths.dashboard.root,
      `${paths.dashboard.root}/`,
      paths.dashboard.general.app,
      `${paths.dashboard.general.app}/`,
      paths.dashboard.access.root,
      paths.dashboard.user.pageAccess,
    ],
    []
  );

  // Check if current path is in always-allowed list
  const isAlwaysAllowed = useMemo(() => {
    if (!pathname) return false;
    return baseAlwaysAllowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [pathname, baseAlwaysAllowed]);

  // Fetch permissions on mount and when user changes
  useEffect(() => {
    const loadPermissions = async () => {
      // SuperAdmin always has access
      if (role === 'superAdmin') {
        setAllowedPaths(['*']); // Special marker for all access
        setPermissionsLoading(false);
        return;
      }

      // Always-allowed paths don't need permission check
      if (isAlwaysAllowed) {
        setPermissionsLoading(false);
        return;
      }

      setPermissionsLoading(true);

      try {
        // Fetch user-specific permissions
        if (userEmail) {
          const userPaths = await fetchUserNavPermissions(userEmail);
          setAllowedPaths(userPaths || []);
        } else {
          // Fallback to cached role-based permissions
          const cachedPaths = resolvePageAccess(user?.id, role);
          setAllowedPaths(cachedPaths || []);
        }
      } catch (error) {
        console.error('[PermissionGuard] Failed to load permissions:', error);
        setAllowedPaths([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, [role, userEmail, user?.id, isAlwaysAllowed]);

  // Show loading screen while auth or permissions are loading
  if (authLoading || permissionsLoading) {
    return <SplashScreen />;
  }

  // SuperAdmin has access to everything
  if (role === 'superAdmin') {
    return <>{children}</>;
  }

  // Always-allowed paths don't need permission check
  if (isAlwaysAllowed) {
    return <>{children}</>;
  }

  // Check if user has permission for current path
  const hasPermission = hasPathPermission(allowedPaths, pathname);

  // If no permission, redirect to 403 and don't render
  if (!hasPermission) {
    console.warn('[PermissionGuard] Access denied to:', pathname);
    router.replace(`${paths.page403}?returnTo=${encodeURIComponent(pathname)}`);
    return <SplashScreen />; // Show loading while redirecting
  }

  // User has permission - render the page
  return <>{children}</>;
}
