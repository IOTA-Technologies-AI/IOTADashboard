'use client';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UserCreateEditForm } from '../user-create-edit-form';

// ----------------------------------------------------------------------

export function UserEditView({ userId }) {
  const { users, loading, error } = useMicrosoftUsers();

  // Find the user by ID from Microsoft 365 users
  const currentUser = users.find((user) => user.id === userId);

  // Map to the expected format for the form
  const mappedUser = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber || '',
        company: currentUser.company || '',
        role: currentUser.role || 'Member',
        status: currentUser.status || 'active',
        address: currentUser.location || '',
        country: '',
        state: '',
        city: '',
        zipCode: '',
        avatarUrl: currentUser.avatarUrl || '',
        isVerified: true,
      }
    : null;

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error.message || 'Failed to load Microsoft 365 users. Please connect to Microsoft.'}
        </Alert>
      </DashboardContent>
    );
  }

  if (!mappedUser) {
    return (
      <DashboardContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          User not found. The user may not exist in Microsoft 365.
        </Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        backHref={paths.dashboard.user.list}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.root },
          { name: mappedUser?.name },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <UserCreateEditForm currentUser={mappedUser} />
    </DashboardContent>
  );
}
