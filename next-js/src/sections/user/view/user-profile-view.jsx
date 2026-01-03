'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { usePathname, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { _userAbout, _userFriends, _userGallery, _userFollowers } from 'src/_mock';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useMockedUser } from 'src/auth/hooks';
import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftProfile } from 'src/auth/hooks/use-microsoft-profile';

import { ProfileHome } from '../profile-home';
import { ProfileCover } from '../profile-cover';
import { ProfileFriends } from '../profile-friends';
import { ProfileGallery } from '../profile-gallery';
import { ProfileFollowers } from '../profile-followers';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    value: '',
    label: 'Profile',
    icon: <Iconify width={24} icon="solar:user-id-bold" />,
  },
  {
    value: 'followers',
    label: 'Followers',
    icon: <Iconify width={24} icon="solar:heart-bold" />,
  },
  {
    value: 'friends',
    label: 'Friends',
    icon: <Iconify width={24} icon="solar:users-group-rounded-bold" />,
  },
  {
    value: 'gallery',
    label: 'Gallery',
    icon: <Iconify width={24} icon="solar:gallery-wide-bold" />,
  },
];

// ----------------------------------------------------------------------

const TAB_PARAM = 'tab';

export function UserProfileView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get(TAB_PARAM) ?? '';

  const { user } = useAuthContext();
  const { profile } = useMicrosoftProfile();

  const [searchFriends, setSearchFriends] = useState('');

  const info = {
    displayName: profile?.displayName || user?.displayName || 'User',
    email: profile?.email || user?.email,
    role: profile?.jobTitle || user?.role || 'Role unavailable',
    department: profile?.department,
    managerName: profile?.managerName,
    managerTitle: profile?.managerTitle,
    managerEmail: profile?.managerEmail,
    location: profile?.location || 'Location unavailable',
    phone: profile?.phone,
    userPrincipalName: profile?.userPrincipalName,
    officeLocation: profile?.officeLocation,
    quote: 'Profile synced from Microsoft 365',
    company: '',
    socialLinks: { facebook: '', instagram: '', linkedin: '', twitter: '' },
  };

  const createRedirectPath = (currentPath, query) => {
    const queryString = new URLSearchParams({ [TAB_PARAM]: query }).toString();
    return query ? `${currentPath}?${queryString}` : currentPath;
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Profile"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.root },
          { name: info.displayName },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ height: 290 }}>
        <ProfileCover
          role={info.role}
          name={info.displayName}
          avatarUrl={user?.photoURL}
          coverUrl={_userAbout.coverUrl}
        />

        <Box
          sx={{
            width: 1,
            bottom: 0,
            zIndex: 9,
            px: { md: 3 },
            display: 'flex',
            position: 'absolute',
            bgcolor: 'background.paper',
            justifyContent: { xs: 'center', md: 'flex-end' },
          }}
        >
          <Tabs value={selectedTab}>
            {NAV_ITEMS.map((tab) => (
              <Tab
                component={RouterLink}
                key={tab.value}
                value={tab.value}
                icon={tab.icon}
                label={tab.label}
                href={createRedirectPath(pathname, tab.value)}
              />
            ))}
          </Tabs>
        </Box>
      </Card>

      {selectedTab === '' && <ProfileHome info={info} posts={[]} sx={{ mt: 3 }} />}

      {selectedTab === 'followers' && <ProfileFollowers followers={_userFollowers} />}

      {selectedTab === 'friends' && (
        <ProfileFriends
          friends={_userFriends}
          searchFriends={searchFriends}
          onSearchFriends={(event) => setSearchFriends(event.target.value)}
        />
      )}
      {selectedTab === 'gallery' && <ProfileGallery gallery={_userGallery} />}
    </DashboardContent>
  );
}
