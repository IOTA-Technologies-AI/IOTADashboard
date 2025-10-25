'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function OfferManagementPage() {
  const router = useRouter();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.offerManagement.details(id));
    },
    [router]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.offerManagement.edit(id));
    },
    [router]
  );
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const columns = [
    {
      field: 'candidateName',
      headerName: 'Candidate Name',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'position',
      headerName: 'Position',
      flex: 1.2,
      minWidth: 150,
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'salary',
      headerName: 'Salary',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="view"
          showInMenu
          icon={<Iconify icon="solar:eye-bold" />}
          label="View"
          onClick={() => handleViewRow(params.id)}
        />,
        <GridActionsCellItem
          key="edit"
          showInMenu
          icon={<Iconify icon="solar:pen-bold" />}
          label="Edit"
          onClick={() => handleEditRow(params.id)}
        />,
      ],
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Employee Offer Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Offer Management' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.hr.offerManagement.new)}
          >
            New Offer
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={offers}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
        />
      </Box>
    </DashboardContent>
  );
}
