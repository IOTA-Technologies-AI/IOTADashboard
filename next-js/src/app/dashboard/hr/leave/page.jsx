'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { getEmployees, getLeaveRequests, deleteLeaveRequest } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function LeaveListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    Promise.all([getLeaveRequests(), getEmployees()])
      .then(([requests, emps]) => {
        setEmployees(emps || []);
        setRows(requests || []);
      })
      .catch((e) => console.error('Failed to load leave requests:', e));
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map();
    (employees || []).forEach((e) =>
      map.set(e.id, `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim())
    );
    return map;
  }, [employees]);

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.leave.details(id));
    },
    [router]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.hr.leave.edit(id));
    },
    [router]
  );

  const handleDeleteRow = useCallback(async (id) => {
    try {
      await deleteLeaveRequest(id);
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
      toast.success('Leave request deleted successfully!');
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      toast.error('Failed to delete leave request');
    }
  }, []);

  const columns = [
    { field: 'requestNumber', headerName: 'Request #', flex: 1, minWidth: 160 },
    {
      field: 'employeeId',
      headerName: 'Employee',
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => {
        const employeeId = params?.row?.employeeId;
        if (!employeeId) return '';
        return employeeMap.get(employeeId) || employeeId;
      },
    },
    { field: 'leaveType', headerName: 'Leave Type', flex: 0.8, minWidth: 120 },
    { field: 'fromDate', headerName: 'From Date', flex: 0.8, minWidth: 110 },
    { field: 'toDate', headerName: 'To Date', flex: 0.8, minWidth: 110 },
    { field: 'daysCount', headerName: 'Days', flex: 0.5, minWidth: 70 },
    { field: 'status', headerName: 'Status', flex: 0.7, minWidth: 100 },
    {
      type: 'actions',
      field: 'actions',
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
        heading="Leave Requests"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Leave' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.leave.summary}
              variant="outlined"
              startIcon={<Iconify icon="solar:chart-bold" />}
            >
              Leave Summary
            </Button>
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.leave.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New Leave Request
            </Button>
          </Stack>
        }
      />

      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
        />
      </Card>
    </DashboardContent>
  );
}
