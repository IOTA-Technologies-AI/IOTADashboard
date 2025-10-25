'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { getEmployees, deleteEmployee } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function EmployeeListPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDeleteRow = useCallback((id) => {
    setSelectedId(id);
    setConfirmDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteEmployee(selectedId);
      toast.success('Employee deleted successfully');
      fetchEmployees();
      setConfirmDialog(false);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  }, [selectedId, fetchEmployees]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.employee.edit(id));
    },
    [router]
  );

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.employee.details(id));
    },
    [router]
  );

  const columns = [
    {
      field: 'employeeId',
      headerName: 'Employee ID',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'fullName',
      headerName: 'Full Name',
      flex: 1.5,
      minWidth: 200,
      valueGetter: (value, row) => `${row.firstName || ''} ${row.lastName || ''}`.trim(),
    },
    {
      field: 'employeeType',
      headerName: 'Type',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'designation',
      headerName: 'Designation',
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
      field: 'employmentStatus',
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
        heading="Employee Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employees' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.hr.employee.new)}
          >
            New Employee
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={employees}
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
        title="Delete Employee"
        content="Are you sure you want to delete this employee?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
