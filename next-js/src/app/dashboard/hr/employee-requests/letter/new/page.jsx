'use client';

import { DashboardContent } from 'src/layouts/dashboard';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { LetterRequestForm } from 'src/sections/hr/view/letter-request-form';

export default function NewLetterRequestPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Letter Request"
        links={[
          { name: 'HR', href: paths.dashboard.hr.employee.root },
          { name: 'Letter Requests', href: paths.dashboard.hr.employeeRequests.letter.root },
          { name: 'New' },
        ]}
        sx={{ mb: 3 }}
      />
      <LetterRequestForm />
    </DashboardContent>
  );
}
