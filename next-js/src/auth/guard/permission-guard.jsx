'use client';

import { useMemo, useState, useEffect, useRef } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { hasPathPermission, fetchUserNavPermissions } from 'src/utils/pageAccess';

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
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);

  // Cache to track which user's permissions we've already loaded
  const loadedUserRef = useRef(null);

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);
  const userEmail = user?.email;

  console.log('[PermissionGuard] Current state:', {
    pathname,
    userEmail,
    role,
    authLoading,
    permissionsLoading,
    allowedPathsCount: allowedPaths.length,
  });

  // Always allowed paths - only specific pages, not all subpaths
  const baseAlwaysAllowed = useMemo(() => [paths.dashboard.root, paths.dashboard.general.app], []);

  // Check if current path is in always-allowed list (EXACT MATCH ONLY)
  const isAlwaysAllowed = useMemo(() => {
    if (!pathname) return false;

    // Normalize paths by removing trailing slash
    const normalizedPathname =
      pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

    return baseAlwaysAllowed.some((p) => {
      const normalizedAllowed = p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p;
      return normalizedPathname === normalizedAllowed;
    });
  }, [pathname, baseAlwaysAllowed]);

  // Fetch permissions on mount and when user changes
  useEffect(() => {
    const loadPermissions = async () => {
      // Skip if no user or still loading auth
      if (!user || authLoading) return;

      console.log('[PermissionGuard] Loading permissions for:', { userEmail, role });

      // SuperAdmin always has access
      if (role === 'superAdmin') {
        console.log('[PermissionGuard] User is superAdmin - granting full access');
        setAllowedPaths(['*']); // Special marker for all access
        loadedUserRef.current = userEmail;
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      // Check if we already loaded permissions for this user (prevent re-fetch loop)
      if (loadedUserRef.current === userEmail && allowedPaths.length > 0) {
        console.log('[PermissionGuard] ✅ Using already-loaded permissions for:', userEmail);
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      setPermissionsLoading(true);

      try {
        // Fetch user-specific permissions using email
        if (userEmail) {
          console.log('[PermissionGuard] 🔄 Fetching permissions for email:', userEmail);
          const userPaths = await fetchUserNavPermissions(userEmail);
          console.log('[PermissionGuard] Fetched paths:', userPaths);
          setAllowedPaths(userPaths || []);
          loadedUserRef.current = userEmail; // Mark as loaded

          // If no permissions found, explicitly set empty array to BLOCK access
          if (!userPaths || userPaths.length === 0) {
            console.warn('[PermissionGuard] No permissions found for user:', userEmail);
            setAllowedPaths([]);
          }
        } else {
          console.warn('[PermissionGuard] No user email available');
          setAllowedPaths([]);
        }
      } catch (error) {
        console.error('[PermissionGuard] Failed to load permissions:', error);
        setAllowedPaths([]);
      } finally {
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
      }
    };

    loadPermissions();
  }, [userEmail, authLoading, role, allowedPaths.length]); // Stable dependencies

  // Check if user has permission for current path
  const hasPermission = hasPathPermission(allowedPaths, pathname);

  console.log('[PermissionGuard] Permission check result:', {
    pathname,
    hasPermission,
    allowedPaths,
  });

  // If no permission, redirect to 403 and BLOCK RENDERING
  useEffect(() => {
    if (!hasPermission && permissionCheckComplete && !authLoading && !permissionsLoading) {
      console.error('[PermissionGuard] ACCESS DENIED to:', pathname);
      console.error('[PermissionGuard] User has no permission. Redirecting to 403.');
      router.replace(`${paths.page403}?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [hasPermission, pathname, router, authLoading, permissionsLoading, permissionCheckComplete]);

  // Show loading screen while auth or permissions are loading
  if (authLoading || permissionsLoading || !permissionCheckComplete) {
    console.log('[PermissionGuard] Loading...');
    return <SplashScreen />;
  }

  // SuperAdmin has access to everything
  if (role === 'superAdmin') {
    console.log('[PermissionGuard] SuperAdmin access granted');
    return <>{children}</>;
  }

  // Always-allowed paths don't need permission check
  if (isAlwaysAllowed) {
    console.log('[PermissionGuard] Always-allowed path:', pathname);
    return <>{children}</>;
  }

  // NEVER render children if no permission - always show splash screen
  if (!hasPermission) {
    console.warn('[PermissionGuard] Blocking render - no permission for:', pathname);
    return <SplashScreen />; // Keep showing loading until redirect completes
  }

  // User has permission - render the page
  console.log('[PermissionGuard] Access granted to:', pathname);
  return <>{children}</>;
}
