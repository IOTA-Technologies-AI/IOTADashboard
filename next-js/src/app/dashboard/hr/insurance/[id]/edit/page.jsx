'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { getInsuranceRecord } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InsuranceNewEditForm } from 'src/sections/hr/view/insurance-new-edit-form';

export default function InsuranceEditPage({ params }) {
  const { id } = params;
  const [currentRecord, setCurrentRecord] = useState(null);

  useEffect(() => {
    getInsuranceRecord(id)
      .then((data) => setCurrentRecord(data.record))
      .catch((e) => console.error('Failed to load insurance record:', e));
  }, [id]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Insurance Record"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance', href: paths.dashboard.hr.insurance.root },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <InsuranceNewEditForm currentRecord={currentRecord} />
    </DashboardContent>
  );
}
