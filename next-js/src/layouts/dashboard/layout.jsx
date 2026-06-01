'use client';

import { merge } from 'es-toolkit';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import {
  resolvePageAccess,
  fetchUserNavPermissions,
  fetchNavPermissionsForRole,
  clearUserNavPermissionCache,
  isVersionCheckDue,
  markVersionCheckDone,
} from 'src/utils/pageAccess';
import { filterNavByPermissions } from 'src/utils/filterNavByPermissions';

import { allLangs } from 'src/locales';
import { _contacts, _notifications } from 'src/_mock';

import { Logo } from 'src/components/logo';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/supabase/action';
import { PermissionGuard } from 'src/auth/guard';

import { NavMobile } from './nav-mobile';
import { VerticalDivider } from './content';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { _account } from '../nav-config-account';
import { Searchbar } from '../components/searchbar';
import { _workspaces } from '../nav-config-workspace';
import { MenuButton } from '../components/menu-button';
import { AccountDrawer } from '../components/account-drawer';
import { SettingsButton } from '../components/settings-button';
import { LanguagePopover } from '../components/language-popover';
import { ContactsPopover } from '../components/contacts-popover';
import { WorkspacesPopover } from '../components/workspaces-popover';
import { navData as dashboardNavData } from '../nav-config-dashboard';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { NotificationsDrawer } from '../components/notifications-drawer';
import { MainSection, layoutClasses, HeaderSection, LayoutSection } from '../core';

// ----------------------------------------------------------------------

export function DashboardLayout({ sx, cssVars, children, slotProps, layoutQuery = 'lg' }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const { user } = useAuthContext();

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

  const normalizedRole = normalizeRole(user?.role, user?.roleId);

  // Use email for permission lookups (consistent across Microsoft Graph and login)
  const userEmailForPerms = user?.email;

  // Track if permissions have been loaded
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // State for dynamic allowed paths
  const [allowedPaths, setAllowedPaths] = useState(() =>
    resolvePageAccess(userEmailForPerms, normalizedRole)
  );

  // Fetch nav permissions from backend when role/user changes
  useEffect(() => {
    if (normalizedRole === 'superAdmin') {
      setPermissionsLoaded(true);
      return; // superAdmin has access to all
    }

    const loadPermissions = async () => {
      // ── Step 1: Use any valid cached data immediately (no visible flash) ────
      const cachedPaths = resolvePageAccess(userEmailForPerms, normalizedRole);
      if (cachedPaths.length > 0) {
        setAllowedPaths(cachedPaths);
        setPermissionsLoaded(true);

        // ── Step 2: Background version check every 5 minutes ────────────────
        // Skip if the version hasn't expired yet — no network call needed.
        if (userEmailForPerms && !isVersionCheckDue(userEmailForPerms)) return;
      }

      // ── Step 3: Fetch fresh permissions (first load OR background check) ───
      if (userEmailForPerms) {
        const { paths: freshPaths, hasExplicitPermissions } = await fetchUserNavPermissions(
          userEmailForPerms,
          true
        ); // force bypass cache

        if (hasExplicitPermissions) {
          // If we already had cached paths, compare for changes
          if (cachedPaths.length > 0) {
            const sort = (arr) => [...arr].sort().join(',');
            if (sort(freshPaths) !== sort(cachedPaths)) {
              // Permissions were changed by an admin — sign the user out so they
              // re-login and get a clean, up-to-date session.
              console.log('[Permissions] Change detected — signing out for fresh session');
              await signOut();
              return;
            }
            // Paths unchanged — stamp the version check and keep existing state
            markVersionCheckDone(userEmailForPerms);
            return;
          }

          // First load with no cache
          setAllowedPaths(freshPaths);
          markVersionCheckDone(userEmailForPerms);
          setPermissionsLoaded(true);
          return;
        }

        // No rows in DB — user hasn't been configured. Fall back to role defaults.
      }

      // ── Step 4: Role-based fallback ──────────────────────────────────────────
      if (normalizedRole) {
        const rolePaths = await fetchNavPermissionsForRole(normalizedRole);
        setAllowedPaths(rolePaths.length > 0 ? rolePaths : []);
      }
      setPermissionsLoaded(true);
    };

    loadPermissions();
  }, [normalizedRole, userEmailForPerms]);

  const baseAlwaysAllowed = [
    paths.dashboard.root,
    `${paths.dashboard.root}/`,
    paths.dashboard.general.app,
    `${paths.dashboard.general.app}/`,
    paths.dashboard.access.root,
    `${paths.dashboard.access.root}/`,
    paths.dashboard.user.pageAccess,
  ];

  const isDashboardHome = baseAlwaysAllowed.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  // Helper to check if pathname is allowed
  const isPathnameAllowed = () => {
    if (!pathname || !Array.isArray(allowedPaths) || allowedPaths.length === 0) return true;

    // Filter out base dashboard paths that shouldn't grant access to all sub-paths
    const basePathsToExclude = ['/dashboard', '/dashboard/'];
    const specificAllowedPaths = allowedPaths.filter((p) => !basePathsToExclude.includes(p));

    // Check if pathname is allowed:
    // 1. Exact match with any allowed path
    // 2. Pathname starts with an allowed path followed by '/' (for sub-pages like /dashboard/invoice/123)
    return (
      allowedPaths.includes(pathname) ||
      specificAllowedPaths.some((allowedPath) => pathname.startsWith(`${allowedPath}/`))
    );
  };

  // Note: Permission blocking is now handled by PermissionGuard component
  // which wraps the page content and prevents rendering before permission check

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  // Filter nav items based on user permissions
  const filteredNavData =
    normalizedRole === 'superAdmin' ? navData : filterNavByPermissions(navData, allowedPaths);

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles, path, hasChildren = false) => {
    // SuperAdmin can see everything
    if (normalizedRole === 'superAdmin') return false;

    // Check if blocked by role
    const blockedByRole = allowedRoles?.length && !allowedRoles.includes(normalizedRole);

    // If permissions haven't loaded yet, don't block by allowlist (show all until loaded)
    if (!permissionsLoaded) {
      return blockedByRole;
    }

    // If permissions have loaded and allowedPaths is an empty array,
    // it means the user has NO permissions - block ALL menu items
    if (Array.isArray(allowedPaths) && allowedPaths.length === 0) {
      return true; // Block this menu item
    }

    // If user has specific permissions assigned, check against those
    if (Array.isArray(allowedPaths) && allowedPaths.length > 0) {
      // Filter out base dashboard paths that shouldn't grant access to all sub-paths
      const basePathsToExclude = ['/dashboard', '/dashboard/'];
      const specificAllowedPaths = allowedPaths.filter((p) => !basePathsToExclude.includes(p));

      // Check if path is allowed:
      // 1. Exact match with any allowed path
      const isExactMatch = allowedPaths.includes(path);

      // 2. Any allowed path starts with this path (this is a parent menu of an allowed child)
      //    ONLY apply this check if the menu item actually has children
      //    e.g., if /dashboard/user/list is allowed, show "User" parent menu
      const isParentOfAllowed =
        hasChildren &&
        specificAllowedPaths.some((allowedPath) => path && allowedPath.startsWith(`${path}/`));

      const isAllowed = isExactMatch || isParentOfAllowed;

      const blockedByAllowlist = path && !isAllowed;

      return blockedByRole || blockedByAllowlist;
    }

    // If no specific permissions, fall back to role-based check only
    return blockedByRole;
  };

  const renderHeader = () => {
    const headerSlotProps = {
      container: {
        maxWidth: false,
        sx: {
          ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
          ...(isNavHorizontal && {
            bgcolor: 'var(--layout-nav-bg)',
            height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
            [`& .${iconButtonClasses.root}`]: { color: 'var(--layout-nav-text-secondary-color)' },
          }),
        },
      },
    };

    const headerSlots = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      bottomArea: isNavHorizontal ? (
        <NavHorizontal
          data={filteredNavData}
          layoutQuery={layoutQuery}
          cssVars={navVars.section}
          checkPermissions={canDisplayItemByRole}
        />
      ) : null,
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile
            data={filteredNavData}
            open={open}
            onClose={onClose}
            cssVars={navVars.section}
            checkPermissions={canDisplayItemByRole}
          />

          {/** @slot Logo */}
          {isNavHorizontal && (
            <Logo
              sx={{
                display: 'none',
                [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
              }}
            />
          )}

          {/** @slot Divider */}
          {isNavHorizontal && (
            <VerticalDivider sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }} />
          )}

          {/** @slot Workspace popover */}
          <WorkspacesPopover
            data={_workspaces}
            sx={{ ...(isNavHorizontal && { color: 'var(--layout-nav-text-primary-color)' }) }}
          />
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          {/** @slot Searchbar */}
          <Searchbar data={filteredNavData} />

          {/** @slot Language popover */}
          <LanguagePopover data={allLangs} />

          {/** @slot Notifications popover */}
          <NotificationsDrawer data={_notifications} />

          {/** @slot Contacts popover */}
          <ContactsPopover data={_contacts} />

          {/** @slot Settings button */}
          <SettingsButton />

          {/** @slot Account drawer */}
          <AccountDrawer data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={slotProps?.header?.sx}
      />
    );
  };

  const renderSidebar = () => (
    <NavVertical
      data={filteredNavData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  // Show loading state while checking permissions (only for non-superAdmin)
  if (!permissionsLoaded && normalizedRole !== 'superAdmin') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Box sx={{ color: 'text.secondary', typography: 'body2' }}>Loading permissions...</Box>
      </Box>
    );
  }

  // Block access if user doesn't have permission
  const renderFooter = () => null;

  const renderMain = () => (
    <PermissionGuard>
      <MainSection {...slotProps?.main}>{children}</MainSection>
    </PermissionGuard>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
