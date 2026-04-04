'use client';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { TravelRequestForm } from 'src/sections/hr/view/travel-request-form';

export default function NewTravelRequestPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Travel Ticket Request"
        links={[
          { name: 'HR', href: paths.dashboard.hr.employee.root },
          { name: 'Travel Tickets', href: paths.dashboard.hr.employeeRequests.travel.root },
          { name: 'New' },
        ]}
        sx={{ mb: 3 }}
      />
      <TravelRequestForm />
    </DashboardContent>
  );
}
