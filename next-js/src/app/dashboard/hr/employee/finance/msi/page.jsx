'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listMsiRequests } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// An approved increment whose effective date has passed and which the daily job
// has written onto the employee record reads as "Applied" — a distinct state
// from "Approved", and the one HR actually wants to see at a glance.
const statusLabel = (row) => {
  if (row.status === 'approved') return row.appliedAt ? 'Applied' : 'Approved';
  if (row.status === 'under_review') return 'Under Review';
  if (row.status === 'submitted') return 'Pending Approval';
  return row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-';
};

const statusColor = (row) => {
  if (row.status === 'approved') return row.appliedAt ? 'success' : 'info';
  if (row.status === 'rejected') return 'error';
  if (row.status === 'cancelled') return 'default';
  return 'warning';
};

export default function MsiListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listMsiRequests();
      setRows(data);
    } catch (error) {
      console.error('Error fetching increments:', error);
      toast.error('Failed to load salary increments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      field: 'employeeName',
      headerName: 'Employee',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) =>
        `${params.row.employeeName || '-'}${
          params.row.employeeCode ? ` (${params.row.employeeCode})` : ''
        }`,
    },
    {
      field: 'currentGross',
      headerName: 'Current',
      flex: 0.8,
      minWidth: 120,
      valueFormatter: (value) => Number(value || 0).toFixed(2),
    },
    {
      field: 'revisedGross',
      headerName: 'Revised',
      flex: 0.8,
      minWidth: 120,
      valueFormatter: (value) => Number(value || 0).toFixed(2),
    },
    {
      field: 'increasePercent',
      headerName: 'Increase',
      flex: 0.7,
      minWidth: 110,
      valueFormatter: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      field: 'effectiveDate',
      headerName: 'Effective',
      flex: 0.9,
      minWidth: 130,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '-'),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <Label color={statusColor(params.row)} variant="soft" sx={{ textTransform: 'none' }}>
          {statusLabel(params.row)}
        </Label>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => router.push(paths.dashboard.hr.employee.finance.msi.details(params.id))}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Monthly Salary Increment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'MSI' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.hr.employee.finance.msi.new)}
          >
            New Increment
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardHeader title="Salary Increments" />
        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          />
        </Box>
      </Card>
    </DashboardContent>
  );
}
