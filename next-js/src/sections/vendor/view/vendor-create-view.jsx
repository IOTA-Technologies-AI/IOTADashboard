'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { VendorCreateEditForm } from '../vendor-create-edit-form';

// ----------------------------------------------------------------------

export function VendorCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new vendor"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Vendor', href: paths.dashboard.vendor.root },
          { name: 'New vendor' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <VendorCreateEditForm />
    </DashboardContent>
  );
}
