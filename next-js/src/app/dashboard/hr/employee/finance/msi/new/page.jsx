'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { MsiNewEditForm } from 'src/sections/hr/msi/msi-new-edit-form';

export default function MsiNewPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Salary Increment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'MSI', href: paths.dashboard.hr.employee.finance.msi.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <MsiNewEditForm />
    </DashboardContent>
  );
}
