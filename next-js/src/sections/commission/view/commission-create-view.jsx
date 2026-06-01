'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CommissionNewEditForm } from '../commission-new-edit-form';

// ----------------------------------------------------------------------

export function CommissionCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new commission"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Commission', href: paths.dashboard.commission.root },
          { name: 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <CommissionNewEditForm />
    </DashboardContent>
  );
}
