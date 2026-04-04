'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InsuranceNewEditForm } from 'src/sections/hr/view/insurance-new-edit-form';

export default function InsuranceNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Insurance Record"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance', href: paths.dashboard.hr.insurance.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <InsuranceNewEditForm />
    </DashboardContent>
  );
}
