'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listEmployeeIds } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const STATUS_COLORS = {
  active: 'success',
  expired: 'error',
  under_renewal: 'warning',
  cancelled: 'default',
};

export default function IdManagementListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEmployeeIds()
      .then((data) => setRows(data?.employees ?? []))
      .catch((e) => console.error('Failed to load employee IDs:', e))
      .finally(() => setLoading(false));
  }, []);

  const handleViewRow = useCallback(
    (id) => router.push(paths.dashboard.hr.idManagement.details(id)),
    [router]
  );

  const columns = useMemo(
    () => [
      { field: 'employeeId', headerName: 'ID', width: 100 },
      {
        field: 'fullName',
        headerName: 'Name',
        flex: 1,
        valueGetter: (_, row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
      },
      { field: 'nationality', headerName: 'Nationality', width: 120 },
      { field: 'country', headerName: 'Country', width: 90 },
      { field: 'iqamaNumber', headerName: 'Iqama #', width: 140 },
      {
        field: 'iqamaStatus',
        headerName: 'Iqama Status',
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
      { field: 'iqamaExpiryDate', headerName: 'Iqama Expiry', width: 130 },
      { field: 'visaExpiryDate', headerName: 'Visa Expiry', width: 130 },
      { field: 'passportExpiryDate', headerName: 'Passport Expiry', width: 130 },
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
        heading="ID Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'ID Management' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.idManagement.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New Record
            </Button>
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.idManagement.expiring}
              variant="outlined"
              startIcon={<Iconify icon="solar:bell-bing-bold" />}
            >
              Expiring Documents
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
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
