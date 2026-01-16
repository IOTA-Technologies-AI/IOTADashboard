'use client';

import { merge } from 'es-toolkit';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import {
  resolvePageAccess,
  fetchUserNavPermissions,
  fetchNavPermissionsForRole,
} from 'src/utils/pageAccess';

import { allLangs } from 'src/locales';
import { _contacts, _notifications } from 'src/_mock';

import { Logo } from 'src/components/logo';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

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

  // Debug: Log user info for troubleshooting - log immediately and on changes
  useEffect(() => {
    console.log('[DashboardLayout] Component mounted/updated');
    console.log('[DashboardLayout] User object:', user ? 'present' : 'null');
    if (user) {
      console.log('[DashboardLayout] User info:', {
        email: user?.email,
        id: user?.id,
        azureOid: user?.azureOid,
        role: normalizedRole,
        rawRole: user?.role,
      });
    }
  }, [user, normalizedRole]);

  // Track if permissions have been loaded
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // State for dynamic allowed paths
  const [allowedPaths, setAllowedPaths] = useState(() =>
    resolvePageAccess(userEmailForPerms, normalizedRole)
  );

  // Fetch nav permissions from backend when role/user changes
  useEffect(() => {
    if (normalizedRole === 'superAdmin') {
      console.log('[DashboardLayout] SuperAdmin detected, skipping permission fetch');
      setPermissionsLoaded(true);
      return; // superAdmin has access to all
    }

    const loadPermissions = async () => {
      setPermissionsLoaded(false);
      console.log('[DashboardLayout] Loading permissions for:', {
        email: userEmailForPerms,
        role: normalizedRole,
      });

      // Fetch user-specific permissions using email
      if (userEmailForPerms) {
        console.log('[DashboardLayout] Fetching permissions for email:', userEmailForPerms);
        const userPaths = await fetchUserNavPermissions(userEmailForPerms);
        console.log('[DashboardLayout] Permission result:', {
          pathCount: userPaths?.length || 0,
          paths: userPaths?.slice(0, 5),
        });
        if (userPaths && userPaths.length > 0) {
          console.log('[DashboardLayout] User permissions loaded:', userPaths.length, 'paths');
          setAllowedPaths(userPaths);
          setPermissionsLoaded(true);
          return;
        }
        console.log('[DashboardLayout] No user permissions found, falling back to role-based');
      }

      // Fall back to role-based permissions
      if (normalizedRole) {
        const cachedPaths = resolvePageAccess(userEmailForPerms, normalizedRole);
        console.log('[DashboardLayout] Cached paths check:', cachedPaths.length, 'paths');
        if (cachedPaths.length > 0) {
          setAllowedPaths(cachedPaths);
          setPermissionsLoaded(true);
        } else {
          console.log(
            '[DashboardLayout] No cached paths, fetching role-based permissions for:',
            normalizedRole
          );
          const rolePaths = await fetchNavPermissionsForRole(normalizedRole);
          console.log('[DashboardLayout] Role-based paths:', rolePaths.length, 'paths');
          if (rolePaths.length > 0) {
            setAllowedPaths(rolePaths);
          }
          setPermissionsLoaded(true);
        }
      } else {
        console.log('[DashboardLayout] No role found, marking permissions as loaded');
        setPermissionsLoaded(true);
      }
    };

    loadPermissions();
  }, [normalizedRole, userEmailForPerms]);

  // Log when allowedPaths changes
  useEffect(() => {
    console.log('[DashboardLayout] allowedPaths updated:', {
      count: allowedPaths?.length || 0,
      permissionsLoaded,
      paths: allowedPaths?.slice(0, 5),
    });
  }, [allowedPaths, permissionsLoaded]);

  const baseAlwaysAllowed = [
    paths.dashboard.root,
    `${paths.dashboard.root}/`,
    paths.dashboard.general.app,
    `${paths.dashboard.general.app}/`,
    paths.dashboard.access.root,
    `${paths.dashboard.access.root}/`,
    paths.dashboard.user.pageAccess,
  ];

  const isDashboardHome = baseAlwaysAllowed.some((p) => pathname?.startsWith(p));

  // Block direct URL access only after permissions have loaded
  const isBlockedByPath =
    permissionsLoaded &&
    !isDashboardHome &&
    normalizedRole !== 'superAdmin' &&
    pathname &&
    Array.isArray(allowedPaths) &&
    allowedPaths.length > 0 &&
    !allowedPaths.some((allowedPath) => pathname.startsWith(allowedPath));

  useEffect(() => {
    if (isBlockedByPath) {
      router.replace(paths.page403);
    }
  }, [isBlockedByPath, router]);

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles, path) => {
    // SuperAdmin can see everything
    if (normalizedRole === 'superAdmin') return false;

    // Check if blocked by role
    const blockedByRole = allowedRoles?.length && !allowedRoles.includes(normalizedRole);

    // If permissions haven't loaded yet, don't block by allowlist (show all until loaded)
    if (!permissionsLoaded) {
      return blockedByRole;
    }

    // If user has specific permissions assigned, check against those
    if (Array.isArray(allowedPaths) && allowedPaths.length > 0) {
      const blockedByAllowlist =
        path && !allowedPaths.some((allowedPath) => path.startsWith(allowedPath));

      // Debug: Log permission check for non-allowed paths
      if (blockedByAllowlist && path) {
        console.log('[DashboardLayout] Blocking path:', path, '- not in allowed list');
      }

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
          data={navData}
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
            data={navData}
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
          <Searchbar data={navData} />

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
      data={navData}
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

  if (isBlockedByPath) {
    return null;
  }

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

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
