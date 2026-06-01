'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CommissionNewEditForm } from '../commission-new-edit-form';

// ----------------------------------------------------------------------

export function CommissionEditView({ currentCommission }) {
  return (
    <DashboardContent sx={{ minHeight: '100vh', overflowY: 'auto', pb: { xs: 3, md: 4 } }}>
      <CustomBreadcrumbs
        heading="Edit commission"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Commission', href: paths.dashboard.commission.root },
          { name: currentCommission?.dealNumber || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <CommissionNewEditForm currentCommission={currentCommission} />
    </DashboardContent>
  );
}
