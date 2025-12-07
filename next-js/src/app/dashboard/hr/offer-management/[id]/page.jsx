'use client';

import { use } from 'react';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function OfferManagementDetailsPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Offer Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Offer Management', href: paths.dashboard.hr.offerManagement.root },
          { name: `Offer #${id}` },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Details will go here */}
    </DashboardContent>
  );
}
