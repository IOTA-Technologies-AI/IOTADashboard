'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BusinessVisaNewEditForm } from 'src/sections/hr/view/business-visa-new-edit-form';

export default function BusinessVisaNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create New Business Visa Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Business Visa Requests', href: paths.dashboard.hr.businessVisa.root },
          { name: 'New Request' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <BusinessVisaNewEditForm />
    </DashboardContent>
  );
}
