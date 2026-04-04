'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listRequests } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

const STATUS_COLORS = {
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  completed: 'success',
  cancelled: 'default',
  pending: 'default',
};

export default function TravelRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRequests({});
      setRows(data.travelRequests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'employeeId', headerName: 'Employee ID', width: 120 },
    { field: 'requestType', headerName: 'Type', width: 200 },
    { field: 'travelDestination', headerName: 'Destination', width: 160 },
    { field: 'departureDate', headerName: 'Departure', width: 130 },
    { field: 'returnDate', headerName: 'Return', width: 130 },
    { field: 'numberOfTravelers', headerName: 'Travelers', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip label={params.value} color={STATUS_COLORS[params.value] || 'default'} size="small" />
      ),
    },
    {
      field: 'slaDeadlineAt',
      headerName: 'SLA Deadline',
      width: 180,
      renderCell: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() =>
            router.push(paths.dashboard.hr.employeeRequests.travel.details(params.row.id))
          }
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Travel Ticket Requests"
        links={[
          { name: 'HR', href: paths.dashboard.hr.employee.root },
          { name: 'Employee Requests', href: paths.dashboard.hr.employeeRequests.root },
          { name: 'Travel Tickets' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.employeeRequests.travel.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Request
          </Button>
        }
        sx={{ mb: 3 }}
      />
      <Card>
        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(r) => r.id}
            pageSizeOptions={[25, 50]}
          />
        </Box>
      </Card>
    </DashboardContent>
  );
}
