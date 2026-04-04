'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listRequests } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const STATUS_COLORS = {
  pending: 'default',
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  completed: 'success',
  cancelled: 'default',
};

export default function VisaRequestsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRequests()
      .then((data) => setRows(data?.visaRequests ?? []))
      .catch((e) => console.error('Failed to load visa requests:', e))
      .finally(() => setLoading(false));
  }, []);

  const handleViewRow = useCallback(
    (id) => router.push(paths.dashboard.hr.employeeRequests.visa.details(id)),
    [router]
  );

  const columns = useMemo(
    () => [
      { field: 'id', headerName: '#', width: 70 },
      { field: 'employeeId', headerName: 'Employee ID', width: 110 },
      { field: 'requestType', headerName: 'Request Type', flex: 1 },
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
        field: 'submittedAt',
        headerName: 'Submitted',
        width: 130,
        valueFormatter: (value) => value?.split('T')[0] ?? '—',
      },
      {
        field: 'actions',
        type: 'actions',
        width: 60,
        getActions: ({ id }) => [
          <GridActionsCellItem
            key="view"
            icon={<Iconify icon="solar:eye-bold" />}
            label="View"
            onClick={() => handleViewRow(id)}
          />,
        ],
      },
    ],
    [handleViewRow]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Visa Requests"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Requests', href: paths.dashboard.hr.employeeRequests.root },
          { name: 'Visa Requests' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.employeeRequests.visa.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Request
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ minHeight: 480 }}
        />
      </Card>
    </DashboardContent>
  );
}
