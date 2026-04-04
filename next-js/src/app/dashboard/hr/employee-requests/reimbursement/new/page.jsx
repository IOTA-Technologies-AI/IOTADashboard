'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ReimbursementRequestForm } from 'src/sections/hr/view/reimbursement-request-form';

export default function ReimbursementNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Reimbursement Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          {
            name: 'Reimbursements',
            href: paths.dashboard.hr.employeeRequests.reimbursement.root,
          },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <ReimbursementRequestForm />
    </DashboardContent>
  );
}
