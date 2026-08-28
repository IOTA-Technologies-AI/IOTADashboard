'use client';

import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getMsiRequest } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { MsiNewEditForm } from 'src/sections/hr/msi/msi-new-edit-form';

const SETTLED = ['approved', 'rejected', 'cancelled'];

export default function MsiEditPage({ params }) {
  const router = useRouter();
  const { id } = params;

  const [msi, setMsi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMsiRequest(id)
      .then(({ request }) => {
        if (!active) return;
        // Editing a settled increment is refused by the API too; bouncing here
        // keeps someone who deep-links to the edit URL from filling in a form
        // that cannot be saved.
        if (SETTLED.includes(request.status)) {
          toast.error(`This increment is ${request.status} and can no longer be edited.`);
          router.replace(paths.dashboard.hr.employee.finance.msi.details(id));
          return;
        }
        setMsi(request);
      })
      .catch((error) => {
        console.error('Failed to load increment', error);
        toast.error('Failed to load increment');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, router]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Salary Increment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'MSI', href: paths.dashboard.hr.employee.finance.msi.root },
          { name: msi?.letterRef || `#${id}` },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <Typography>Loading…</Typography>}
      {!loading && !msi && <Alert severity="error">Increment not found.</Alert>}
      {!loading && msi && <MsiNewEditForm currentMsi={msi} />}
    </DashboardContent>
  );
}
