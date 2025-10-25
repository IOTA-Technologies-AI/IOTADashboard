'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LeaveNewEditForm } from 'src/sections/hr/view/leave-new-edit-form';

export default function LeaveNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Leave Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Leave', href: paths.dashboard.hr.leave.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <LeaveNewEditForm />
    </DashboardContent>
  );
}
