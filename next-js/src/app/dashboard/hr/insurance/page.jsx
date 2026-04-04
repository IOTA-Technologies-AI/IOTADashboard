'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listInsuranceRecords, getInsuranceDashboard } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const STATUS_COLORS = {
  active: 'success',
  expired: 'error',
  pending_renewal: 'warning',
  cancelled: 'default',
};

export default function InsuranceListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    listInsuranceRecords()
      .then((data) => setRows(data?.records ?? []))
      .catch((e) => console.error('Failed to load insurance records:', e))
      .finally(() => setLoading(false));
    getInsuranceDashboard()
      .then(setStats)
      .catch((e) => console.error('Failed to load insurance dashboard:', e));
  }, []);

  const handleViewRow = useCallback(
    (id) => router.push(paths.dashboard.hr.insurance.details(id)),
    [router]
  );

  const handleEditRow = useCallback(
    (id) => router.push(paths.dashboard.hr.insurance.edit(id)),
    [router]
  );

  const columns = useMemo(
    () => [
      { field: 'id', headerName: '#', width: 70 },
      { field: 'employeeId', headerName: 'Employee ID', width: 110 },
      { field: 'policyNumber', headerName: 'Policy Number', flex: 1 },
      { field: 'providerName', headerName: 'Provider', width: 160 },
      {
        field: 'policyClass',
        headerName: 'Class',
        width: 90,
        renderCell: ({ value }) =>
          value ? <Chip label={value} size="small" variant="soft" /> : null,
      },
      { field: 'expiryDate', headerName: 'Expiry Date', width: 130 },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: ({ value }) =>
          value ? (
            <Chip
              label={value}
              color={STATUS_COLORS[value] ?? 'default'}
              size="small"
              variant="soft"
            />
          ) : null,
      },
      {
        field: 'actions',
        type: 'actions',
        width: 80,
        getActions: ({ id }) => [
          <GridActionsCellItem
            key="view"
            icon={<Iconify icon="solar:eye-bold" />}
            label="View"
            onClick={() => handleViewRow(id)}
          />,
          <GridActionsCellItem
            key="edit"
            icon={<Iconify icon="solar:pen-bold" />}
            label="Edit"
            onClick={() => handleEditRow(id)}
          />,
        ],
      },
    ],
    [handleViewRow, handleEditRow]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Insurance Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.insurance.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Record
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Coverage Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Records', value: stats.totalRecords },
            { label: 'Active', value: stats.activeRecords, color: 'success.main' },
            { label: 'Expired', value: stats.expiredRecords, color: 'error.main' },
            { label: 'Pending Renewal', value: stats.pendingRenewal, color: 'warning.main' },
            { label: 'Expiring in 30 Days', value: stats.expiringIn30Days, color: 'warning.main' },
            { label: 'Total Dependents', value: stats.totalDependents },
          ].map((s) => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color={s.color ?? 'text.primary'}>
                    {s.value ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ minHeight: 480 }}
        />
      </Card>
    </DashboardContent>
  );
}
