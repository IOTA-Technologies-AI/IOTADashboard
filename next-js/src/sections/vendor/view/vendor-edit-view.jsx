'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { VendorCreateEditForm } from '../vendor-create-edit-form';

// ----------------------------------------------------------------------

export function VendorEditView({ vendor }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Vendor', href: paths.dashboard.vendor.root },
          { name: vendor?.vendorName },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <VendorCreateEditForm currentVendor={vendor} />
    </DashboardContent>
  );
}
