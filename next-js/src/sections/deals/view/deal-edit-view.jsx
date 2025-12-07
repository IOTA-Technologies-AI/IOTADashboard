'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { DealNewEditForm } from '../deal-new-edit-form';

// ----------------------------------------------------------------------

export function DealEditView({ currentDeal }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit deal"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: currentDeal?.dealNumber || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <DealNewEditForm currentDeal={currentDeal} />
    </DashboardContent>
  );
}
