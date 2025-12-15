'use client';

import { useMemo } from 'react';

import { useRouter, usePathname } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { SplashScreen } from 'src/components/loading-screen';
import { resolvePageAccess } from 'src/utils/pageAccess';

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

export function RoleGuard({ children, allowedRoles = [], redirectTo = paths.page403 }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthContext();

  const role = useMemo(() => normalizeRole(user?.role, user?.roleId), [user?.role, user?.roleId]);
  const allowedPaths = useMemo(() => resolvePageAccess(user?.id, role), [role, user?.id]);

  const baseAlwaysAllowed = useMemo(
    () => [
      paths.dashboard.root,
      `${paths.dashboard.root}/`,
      paths.dashboard.access.root,
      paths.dashboard.user.pageAccess,
    ],
    []
  );

  if (loading) {
    return <SplashScreen />;
  }

  const isAllowedByRole = allowedRoles.length === 0 || allowedRoles.includes(role);

  const isBlockedByPath =
    role !== 'superAdmin' &&
    pathname &&
    !baseAlwaysAllowed.some((p) => pathname.startsWith(p)) &&
    (!Array.isArray(allowedPaths) ||
      allowedPaths.length === 0 ||
      !allowedPaths.some((allowedPath) => pathname.startsWith(allowedPath)));

  const isAllowed = isAllowedByRole && !isBlockedByPath;

  if (!isAllowed) {
    router.replace(
      redirectTo ? `${redirectTo}?returnTo=${encodeURIComponent(pathname)}` : paths.page403
    );
    return null;
  }

  return <>{children}</>;
}
