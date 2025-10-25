'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getEmployees, getLeaveRequests } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function LeaveSummaryPage() {
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEmployees(), getLeaveRequests()])
      .then(([emps, requests]) => {
        setEmployees(emps || []);
        setLeaveRequests(requests || []);
      })
      .catch((e) => console.error('Failed to load data:', e))
      .finally(() => setLoading(false));
  }, []);

  // Calculate leave statistics per employee
  const employeeLeaveStats = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return employees.map((emp) => {
      // Get all approved leaves for this employee in current year
      const empLeaves = leaveRequests.filter((req) => {
        if (req.employeeId !== emp.id) return false;
        if (req.status !== 'Approved') return false;

        const reqYear = new Date(req.fromDate).getFullYear();
        return reqYear === currentYear;
      });

      // Calculate days by leave type
      const annualDays = empLeaves
        .filter((l) => l.leaveType === 'Annual')
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);

      const sickDays = empLeaves
        .filter((l) => l.leaveType === 'Sick')
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);

      const otherDays = empLeaves
        .filter((l) => !['Annual', 'Sick'].includes(l.leaveType))
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);

      // Default leave balances (you should store these in employee table)
      const annualEntitlement = emp.annualLeaveBalance || 22;
      const sickEntitlement = emp.sickLeaveBalance || 5;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department || 'N/A',
        annualTaken: annualDays,
        annualBalance: annualEntitlement - annualDays,
        annualEntitlement,
        sickTaken: sickDays,
        sickBalance: sickEntitlement - sickDays,
        sickEntitlement,
        otherLeaves: otherDays,
        totalLeaves: annualDays + sickDays + otherDays,
      };
    });
  }, [employees, leaveRequests]);

  // Summary cards
  const totalEmployees = employees.length;
  const employeesOnLeave = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return leaveRequests.filter((req) => {
      if (req.status !== 'Approved') return false;
      return req.fromDate <= today && req.toDate >= today;
    }).length;
  }, [leaveRequests]);

  const totalLeavesThisYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return leaveRequests
      .filter((req) => {
        if (req.status !== 'Approved') return false;
        const reqYear = new Date(req.fromDate).getFullYear();
        return reqYear === currentYear;
      })
      .reduce((sum, req) => sum + (req.daysCount || 0), 0);
  }, [leaveRequests]);

  const columns = [
    {
      field: 'employeeId',
      headerName: 'Employee ID',
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'employeeName',
      headerName: 'Employee Name',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'annualTaken',
      headerName: 'Annual Taken',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Label variant="soft" color="info">
          {params.value} / {params.row.annualEntitlement}
        </Label>
      ),
    },
    {
      field: 'annualBalance',
      headerName: 'Annual Balance',
      flex: 0.8,
      minWidth: 130,
      renderCell: (params) => (
        <Label
          variant="soft"
          color={params.value <= 5 ? 'error' : params.value <= 10 ? 'warning' : 'success'}
        >
          {params.value} days
        </Label>
      ),
    },
    {
      field: 'sickTaken',
      headerName: 'Sick Taken',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params) => (
        <Label variant="soft" color="warning">
          {params.value} / {params.row.sickEntitlement}
        </Label>
      ),
    },
    {
      field: 'sickBalance',
      headerName: 'Sick Balance',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Label variant="soft" color={params.value === 0 ? 'error' : 'default'}>
          {params.value} days
        </Label>
      ),
    },
    {
      field: 'totalLeaves',
      headerName: 'Total Leaves',
      flex: 0.8,
      minWidth: 120,
    },
  ];

  const renderSummaryCards = () => (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
      }}
    >
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3">{totalEmployees}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
              Total Employees
            </Typography>
          </Box>
          <Box
            sx={{
              width: 64,
              height: 64,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.lighter',
            }}
          >
            <Iconify icon="solar:users-group-rounded-bold-duotone" width={32} />
          </Box>
        </Box>
      </Card>

      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3">{employeesOnLeave}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
              On Leave Today
            </Typography>
          </Box>
          <Box
            sx={{
              width: 64,
              height: 64,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'warning.lighter',
            }}
          >
            <Iconify icon="solar:user-rounded-bold-duotone" width={32} />
          </Box>
        </Box>
      </Card>

      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3">{totalLeavesThisYear}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
              Total Days This Year
            </Typography>
          </Box>
          <Box
            sx={{
              width: 64,
              height: 64,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'info.lighter',
            }}
          >
            <Iconify icon="solar:calendar-bold-duotone" width={32} />
          </Box>
        </Box>
      </Card>

      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3">{new Date().getFullYear()}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>
              Current Year
            </Typography>
          </Box>
          <Box
            sx={{
              width: 64,
              height: 64,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'success.lighter',
            }}
          >
            <Iconify icon="solar:calendar-mark-bold-duotone" width={32} />
          </Box>
        </Box>
      </Card>
    </Box>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Leave Summary"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Leave Summary' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.leave.root}
            variant="outlined"
            startIcon={<Iconify icon="solar:list-bold" />}
          >
            View All Requests
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {renderSummaryCards()}

        <Card>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">
              Employee Leave Balance ({new Date().getFullYear()})
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Track leave taken and remaining balance for all employees
            </Typography>
          </Box>

          <DataGrid
            rows={employeeLeaveStats}
            columns={columns}
            loading={loading}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        </Card>
      </Stack>
    </DashboardContent>
  );
}
