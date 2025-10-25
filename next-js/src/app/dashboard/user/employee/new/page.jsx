'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeNewEditForm } from 'src/sections/hr/employee-new-edit-form';

export default function EmployeeCreatePage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create Employee"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employees', href: paths.dashboard.hr.employee.root },
          { name: 'New Employee' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <EmployeeNewEditForm />
    </DashboardContent>
  );
}
