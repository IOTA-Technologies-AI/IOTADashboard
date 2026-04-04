'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ServiceRequestForm } from 'src/sections/hr/view/service-request-form';

export default function ServiceRequestNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Service Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Service Requests', href: paths.dashboard.hr.employeeRequests.service.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <ServiceRequestForm />
    </DashboardContent>
  );
}
