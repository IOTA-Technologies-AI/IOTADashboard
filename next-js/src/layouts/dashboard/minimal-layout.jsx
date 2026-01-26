'use client';

import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { useRouter, usePathname } from 'src/routes/hooks';

import {
  fetchUserNavPermissions,
  fetchNavPermissionsForRole,
  clearUserNavPermissionCache,
} from 'src/utils/pageAccess';

import { allLangs } from 'src/locales';
import { _notifications } from 'src/_mock';

import { Logo } from 'src/components/logo';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

import { NavMobile } from './nav-mobile';
import { _account } from '../nav-config-account';
import { MenuButton } from '../components/menu-button';
import { AccountDrawer } from '../components/account-drawer';
import { SettingsButton } from '../components/settings-button';
import { LanguagePopover } from '../components/language-popover';
import { MainSection, HeaderSection, LayoutSection } from '../core';
import { navData as dashboardNavData } from '../nav-config-dashboard';
import { NotificationsDrawer } from '../components/notifications-drawer';

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
 * MinimalLayout - Lightweight dashboard for low-level users accessing single modules
 * Features:
 * - Minimal navigation (only title bar with logo, logout)
 * - Hides full sidebar/menu
 * - Shows only current module focus
 * - Optimized for single-module access
 */
export function MinimalLayout({ children, slotProps }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();
  const settings = useSettingsContext();

  const [allowedPaths, setAllowedPaths] = useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const normalizedRole = useMemo(
    () => normalizeRole(user?.role, user?.roleId),
    [user?.role, user?.roleId]
  );
  const userEmail = user?.email;

  // Load user permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (normalizedRole === 'superAdmin') {
        setAllowedPaths(['*']);
        setPermissionsLoaded(true);
        return;
      }

      if (userEmail) {
        clearUserNavPermissionCache(userEmail);
        const userPaths = await fetchUserNavPermissions(userEmail);
        setAllowedPaths(userPaths || []);
        setPermissionsLoaded(true);
        return;
      }

      if (normalizedRole) {
        const rolePaths = await fetchNavPermissionsForRole(normalizedRole);
        setAllowedPaths(rolePaths || []);
        setPermissionsLoaded(true);
      }
    };

    loadPermissions();
  }, [normalizedRole, userEmail]);

  const layoutQuery = 'lg';
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  // Get current module name from pathname
  const getModuleName = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    return 'Dashboard';
  };

  const renderHeader = () => {
    const headerSlots = {
      topArea: null,
      bottomArea: null,
      leftArea: (
        <>
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile data={dashboardNavData} open={open} onClose={onClose} cssVars={{}} />

          <Logo
            sx={{
              display: 'inline-flex',
              mr: 2,
            }}
          />

          <Box sx={{ fontSize: '14px', fontWeight: 500, color: 'text.secondary' }}>
            {getModuleName()}
          </Box>
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          <LanguagePopover data={allLangs} />
          <NotificationsDrawer data={_notifications} />
          <SettingsButton />
          <AccountDrawer data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={{
          container: {
            maxWidth: false,
            sx: { px: { [layoutQuery]: 5 } },
          },
        }}
        sx={slotProps?.header?.sx}
      />
    );
  };

  return (
    <LayoutSection
      {...slotProps?.root}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        ...slotProps?.root?.sx,
      }}
    >
      {renderHeader()}

      <MainSection
        {...slotProps?.content}
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'auto',
          ...slotProps?.content?.sx,
        }}
      >
        {children}
      </MainSection>
    </LayoutSection>
  );
}
