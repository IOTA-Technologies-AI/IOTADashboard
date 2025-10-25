'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { getBusinessVisaRequests, deleteBusinessVisaRequest } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function BusinessVisaListPage() {
  const router = useRouter();
  const [visaRequests, setVisaRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchVisaRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBusinessVisaRequests();
      setVisaRequests(data);
    } catch (error) {
      console.error('Error fetching business visa requests:', error);
      toast.error('Failed to load business visa requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisaRequests();
  }, [fetchVisaRequests]);

  const handleDeleteRow = useCallback((id) => {
    setSelectedId(id);
    setConfirmDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteBusinessVisaRequest(selectedId);
      toast.success('Business visa request deleted successfully');
      fetchVisaRequests();
      setConfirmDialog(false);
    } catch (error) {
      console.error('Error deleting business visa request:', error);
      toast.error('Failed to delete business visa request');
    }
  }, [selectedId, fetchVisaRequests]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.businessVisa.edit(id));
    },
    [router]
  );

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.businessVisa.details(id));
    },
    [router]
  );

  const columns = [
    {
      field: 'requestNumber',
      headerName: 'Request #',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'applicantName',
      headerName: 'Applicant Name',
      flex: 1.5,
      minWidth: 180,
    },
    {
      field: 'nationality',
      headerName: 'Nationality',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'purpose',
      headerName: 'Purpose',
      flex: 1.2,
      minWidth: 150,
    },
    {
      field: 'durationDays',
      headerName: 'Duration (Days)',
      flex: 0.7,
      minWidth: 100,
      type: 'number',
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      flex: 0.8,
      minWidth: 120,
      type: 'number',
      valueFormatter: (value) => (value ? `${Number(value).toFixed(2)}` : '0.00'),
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
        <GridActionsCellItem
          key="delete"
          showInMenu
          icon={<Iconify icon="solar:trash-bin-trash-bold" />}
          label="Delete"
          onClick={() => handleDeleteRow(params.id)}
          sx={{ color: 'error.main' }}
        />,
      ],
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Business Visa Requests"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Business Visa Requests' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.hr.businessVisa.new)}
          >
            New Request
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={visaRequests}
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

      <ConfirmDialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        title="Delete"
        content="Are you sure you want to delete this business visa request?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
