'use client';

import { useMemo, useState, useEffect } from 'react';

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

// Module-level cache so navigating between pages doesn't make an API call every time.
// TTL of 30 s — stale enough to be fast, fresh enough to catch revocations quickly.
const _permCache = new Map(); // userEmail → { allowedPaths, fetchedAt }
const PERM_CACHE_TTL = 30_000;

const getCache = (email) => {
  const entry = _permCache.get(email);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > PERM_CACHE_TTL) {
    _permCache.delete(email);
    return null;
  }
  return entry;
};
const setCache = (email, allowedPaths) =>
  _permCache.set(email, { allowedPaths, fetchedAt: Date.now() });
export const clearPermissionCache = (email) => {
  if (email) _permCache.delete(email);
  else _permCache.clear();
};

/**
 * PermissionGuard - Blocks page rendering until permission check completes.
 *
 * Priority order:
 *   1. superAdmin → always allowed
 *   2. Per-user permissions from userNavPermissions table (set by admin)
 *   3. Role-default permissions from navPermissions boolean columns
 *   4. No match → redirect to 403
 *
 * Re-checks on every pathname change so direct URL access is always validated.
 * Uses a 30-second in-memory cache to avoid an API call on every navigation.
 */
export function PermissionGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuthContext();

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [allowedPaths, setAllowedPaths] = useState([]);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);
  const userEmail = user?.email;

  // Always-allowed paths (exact match only — never grants access to sub-paths)
  const baseAlwaysAllowed = useMemo(() => [paths.dashboard.root, paths.dashboard.general.app], []);

  const isAlwaysAllowed = useMemo(() => {
    if (!pathname) return false;
    const n = (p) => (p?.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
    return baseAlwaysAllowed.some((p) => n(pathname) === n(p));
  }, [pathname, baseAlwaysAllowed]);

  // Re-runs on every pathname change so URL-typed navigation is always checked.
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user || authLoading) return;

      // 1. SuperAdmin: full access, no DB call needed
      if (role === 'superAdmin') {
        setAllowedPaths(['*']);
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      // 2. Serve from in-memory cache if still fresh (avoids SplashScreen flash on navigation)
      const cached = getCache(userEmail);
      if (cached) {
        setAllowedPaths(cached.allowedPaths);
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
        return;
      }

      // 3. Cache miss — fetch fresh permissions
      setPermissionsLoading(true);

      try {
        // Per-user permissions take priority (admin-assigned overrides)
        if (userEmail) {
          const { paths: enabledPaths, hasExplicitPermissions } =
            await fetchUserEnabledPaths(userEmail);

          if (hasExplicitPermissions) {
            // Admin has explicitly configured this user — respect exactly.
            // enabledPaths may be [] if admin revoked everything (intentional).
            setCache(userEmail, enabledPaths);
            setAllowedPaths(enabledPaths);
            setPermissionsLoading(false);
            setPermissionCheckComplete(true);
            return;
          }
          // No rows yet — fall through to role-based defaults below
        }

        // Fall back to role-based defaults from navPermissions boolean columns
        const rolePaths = await fetchRoleBasedNavPermissions(role);
        const resolved = rolePaths || [];
        setCache(userEmail, resolved);
        setAllowedPaths(resolved);
      } catch (error) {
        console.error('[PermissionGuard] Failed to load permissions:', error);
        setAllowedPaths([]);
      } finally {
        setPermissionsLoading(false);
        setPermissionCheckComplete(true);
      }
    };

    loadPermissions();
  }, [userEmail, authLoading, role, pathname]); // pathname ensures every URL change is checked

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
