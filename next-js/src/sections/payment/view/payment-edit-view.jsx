'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PaymentCreateEditForm } from '../payment-create-edit-form';

// ----------------------------------------------------------------------

export function PaymentEditView({ id }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Payment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.finance.root },
          { name: 'Payments', href: paths.dashboard.finance.payments.root },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <PaymentCreateEditForm currentPaymentId={id} />
    </DashboardContent>
  );
}
