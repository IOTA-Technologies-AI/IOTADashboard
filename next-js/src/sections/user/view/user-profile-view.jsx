'use client';

import Card from '@mui/material/Card';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftProfile } from 'src/auth/hooks/use-microsoft-profile';

import { ProfileHome } from '../profile-home';
import { ProfileCover } from '../profile-cover';

// ----------------------------------------------------------------------

export function UserProfileView() {
  const { user } = useAuthContext();
  const { profile } = useMicrosoftProfile();

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
          coverUrl={`${CONFIG.assetsDir}/assets/background/background-4.jpg`}
        />
      </Card>

      {/* Synced from Microsoft 365. */}
      <ProfileHome info={info} posts={[]} sx={{ mt: 3 }} />
    </DashboardContent>
  );
}
