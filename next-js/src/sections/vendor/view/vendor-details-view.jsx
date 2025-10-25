'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { VendorDetails } from '../vendor-details';

// ----------------------------------------------------------------------

export function VendorDetailsView({ vendor }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={vendor?.vendorName}
        backHref={paths.dashboard.vendor.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Vendor', href: paths.dashboard.vendor.root },
          { name: vendor?.vendorName },
        ]}
        sx={{ mb: 3 }}
      />

      <VendorDetails vendor={vendor} />
    </DashboardContent>
  );
}
