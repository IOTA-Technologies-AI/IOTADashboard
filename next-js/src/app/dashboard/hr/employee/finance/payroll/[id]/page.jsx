'use client';

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const mockPayrolls = [
  {
    id: 1,
    period: 'October 2025',
    month: 10,
    year: 2025,
    totalEmployees: 15,
    totalAmount: 75000,
    status: 'Pending Approval',
    generatedBy: 'Admin',
    generatedAt: '2025-10-25T10:30:00',
  },
  {
    id: 2,
    period: 'September 2025',
    month: 9,
    year: 2025,
    totalEmployees: 15,
    totalAmount: 78000,
    status: 'Approved',
    generatedBy: 'Admin',
    generatedAt: '2025-09-25T10:30:00',
  },
];

export default function PayrollDetailPage({ params }) {
  const router = useRouter();
  const payrollId = Number(params?.id);

  const payroll = useMemo(
    () => mockPayrolls.find((item) => item.id === payrollId),
    [payrollId]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Payroll Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'Payroll', href: paths.dashboard.hr.employee.finance.payroll.root },
          { name: payroll ? payroll.period : 'Not found' },
        ]}
        action={
          <Button variant="contained" onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}>
            Back to List
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!payroll ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payroll not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The requested payroll entry does not exist. Please return to the list.
          </Typography>
          <Button variant="outlined" onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}>
            Go to Payroll List
          </Button>
        </Card>
      ) : (
        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5">{payroll.period}</Typography>
            <Typography variant="body2" color="text.secondary">
              Generated on {new Date(payroll.generatedAt).toLocaleString()} by {payroll.generatedBy}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <InfoItem label="Status" value={payroll.status} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <InfoItem label="Total Employees" value={payroll.totalEmployees} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <InfoItem label="Total Amount" value={`SAR ${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <InfoItem label="Month" value={payroll.month} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <InfoItem label="Year" value={payroll.year} />
              </Grid>
            </Grid>
          </Stack>
        </Card>
      )}
    </DashboardContent>
  );
}

PayrollDetailPage.propTypes = {
  params: PropTypes.shape({ id: PropTypes.string }),
};

function InfoItem({ label, value }) {
  return (
    <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

InfoItem.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
