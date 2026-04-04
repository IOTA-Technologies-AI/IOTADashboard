'use client';

import { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getRequestsDashboard } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

function StatCard({ title, total, pending, href }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4">{total}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        {pending > 0 && (
          <Typography variant="caption" color="warning.main">
            {pending} pending approval
          </Typography>
        )}
        <Stack direction="row" justifyContent="flex-end" mt={2}>
          <Button
            component={RouterLink}
            href={href}
            size="small"
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
          >
            View All
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function EmployeeRequestsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getRequestsDashboard()
      .then(setStats)
      .catch((e) => console.error('Failed to load requests dashboard:', e));
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Employee Requests"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Requests' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.employeeRequests.pendingApprovals}
            variant="outlined"
            startIcon={<Iconify icon="solar:bell-bing-bold" />}
          >
            Pending Approvals
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Visa Requests"
            total={stats?.totalVisaRequests ?? 0}
            pending={stats?.pendingVisaRequests ?? 0}
            href={paths.dashboard.hr.employeeRequests.visa.root}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Service Requests"
            total={stats?.totalServiceRequests ?? 0}
            pending={stats?.pendingServiceRequests ?? 0}
            href={paths.dashboard.hr.employeeRequests.service.root}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Reimbursements"
            total={stats?.totalReimbursements ?? 0}
            pending={stats?.pendingReimbursements ?? 0}
            href={paths.dashboard.hr.employeeRequests.reimbursement.root}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
