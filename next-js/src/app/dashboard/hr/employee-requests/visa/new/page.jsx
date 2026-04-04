'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { VisaRequestForm } from 'src/sections/hr/view/visa-request-form';

export default function VisaRequestNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Visa Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Visa Requests', href: paths.dashboard.hr.employeeRequests.visa.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <VisaRequestForm />
    </DashboardContent>
  );
}
