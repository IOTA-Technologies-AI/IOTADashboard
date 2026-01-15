'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UserCardList } from '../user-card-list';

// ----------------------------------------------------------------------

export function UserCardsView() {
  const { users, loading, error } = useMicrosoftUsers();

  // Map Microsoft 365 users to card format
  const userCards = users.map((user, index) => ({
    id: user.id,
    role: user.role || 'Member',
    name: user.name,
    coverUrl: `/assets/background/overlay-${(index % 4) + 1}.jpg`,
    avatarUrl: user.avatarUrl || `/assets/images/avatar/avatar-${(index % 25) + 1}.webp`,
    totalFollowers: 0,
    totalPosts: 0,
    totalFollowing: 0,
    email: user.email,
    phoneNumber: user.phoneNumber,
    company: user.company,
    location: user.location,
  }));

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Cards"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.root },
          { name: 'Cards' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.user.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add user
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error.message || 'Failed to load Microsoft 365 users. Please connect to Microsoft.'}
        </Alert>
      )}

      {!loading && !error && userCards.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No users found. Make sure you are connected to Microsoft 365.
        </Alert>
      )}

      {!loading && userCards.length > 0 && <UserCardList users={userCards} />}
    </DashboardContent>
  );
}
