'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { DealNewEditForm } from '../deal-new-edit-form';

// ----------------------------------------------------------------------

export function DealCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new deal"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <DealNewEditForm />
    </DashboardContent>
  );
}
