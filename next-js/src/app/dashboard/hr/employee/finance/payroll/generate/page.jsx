'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { getEmployees, getLeaveRequests } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// Calculate actual working days for employee based on joining date
const getEmployeeWorkingDays = (year, month, joiningDate) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0).getDate();

  const joinDate = new Date(joiningDate);

  // If joined after this month, return 0
  if (joinDate > new Date(year, month, 0)) {
    return 0;
  }

  // Determine the start day for counting
  let startDay = 1;
  if (joinDate.getFullYear() === year && joinDate.getMonth() === month - 1) {
    // Joined in this month - start from joining day
    startDay = joinDate.getDate();
  }

  // Count working days from start day to month end
  let workingDays = 0;
  const date = new Date(year, month - 1, 1);

  for (let day = startDay; day <= monthEnd; day += 1) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    // Exclude Friday (5) and Saturday (6)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays += 1;
    }
  }

  return workingDays;
};

// Calculate working days excluding Fri-Sat (Saudi weekend)
const getWorkingDays = (year, month) => {
  const date = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays += 1;
    }
  }
  return workingDays;
};

// Add this helper function at the top of the component
const calculateLeaveDataForMonth = (employeeId, year, month, leaveRequests) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Get approved leaves for this employee in the selected month
  const monthLeaves = leaveRequests.filter((req) => {
    if (req.employeeId !== employeeId) return false;
    if (req.status !== 'Approved') return false;

    const fromDate = new Date(req.fromDate);
    const toDate = new Date(req.toDate);

    // Check if leave overlaps with the payroll month
    return fromDate <= monthEnd && toDate >= monthStart;
  });

  // Calculate leave days in this specific month
  let totalLeaveDaysInMonth = 0;
  let paidLeaveDaysInMonth = 0;
  let unpaidLeaveDaysInMonth = 0;

  monthLeaves.forEach((leave) => {
    const fromDate = new Date(leave.fromDate);
    const toDate = new Date(leave.toDate);

    // Calculate overlap with payroll month
    const overlapStart = fromDate < monthStart ? monthStart : fromDate;
    const overlapEnd = toDate > monthEnd ? monthEnd : toDate;

    // Count days (inclusive)
    const days = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;

    if (leave.leaveType === 'Unpaid') {
      unpaidLeaveDaysInMonth += days;
    } else {
      paidLeaveDaysInMonth += days;
    }

    totalLeaveDaysInMonth += days;
  });

  // Calculate year-to-date leaves for balance
  const yearStart = new Date(year, 0, 1);
  const ytdLeaves = leaveRequests.filter((req) => {
    if (req.employeeId !== employeeId) return false;
    if (req.status !== 'Approved') return false;
    if (req.leaveType === 'Unpaid') return false; // Don't count unpaid in balance

    const fromDate = new Date(req.fromDate);
    return fromDate >= yearStart && fromDate < monthEnd;
  });

  const totalLeavesTakenYTD = ytdLeaves.reduce((sum, req) => sum + (req.daysCount || 0), 0);

  return {
    totalLeaveDaysInMonth,
    paidLeaveDaysInMonth,
    unpaidLeaveDaysInMonth,
    totalLeavesTakenYTD,
  };
};

// Calculate pro-rata salary
const calculateProRataSalary = (employee, totalWorkingDaysInMonth, employeeWorkingDays) => {
  const basicSalary = employee.basicSalary || 1500;
  const housingAllowance = employee.housingAllowance || 1500;
  const transportAllowance = employee.transportAllowance || 500;
  const otherAllowances = employee.otherAllowances || 0;

  // Total leaves taken in THIS month (both paid and unpaid)
  const totalLeavesTakenInMonth = employee.totalLeaveDaysInMonth || 0;

  // Only unpaid leaves cause LOP deduction
  const lopDays = employee.unpaidLeaveDaysInMonth || 0;

  // Actual days worked = employee's eligible working days - ALL leaves
  const actualDaysWorked = employeeWorkingDays - totalLeavesTakenInMonth;

  // Calculate pro-rata salary based on eligible working days
  // If employee joined mid-month, they get (employeeWorkingDays/totalWorkingDays) × monthly salary
  const proRataRatio = employeeWorkingDays / totalWorkingDaysInMonth;

  // Pro-rated monthly components
  const proRatedBasic = basicSalary * proRataRatio;
  const proRatedHousing = housingAllowance * proRataRatio;
  const proRatedTransport = transportAllowance * proRataRatio;
  const proRatedOther = otherAllowances * proRataRatio;

  // Calculate per-day rates (based on total working days in month)
  const perDayBasic = basicSalary / totalWorkingDaysInMonth;
  const perDayHousing = housingAllowance / totalWorkingDaysInMonth;
  const perDayTransport = transportAllowance / totalWorkingDaysInMonth;
  const perDayOther = otherAllowances / totalWorkingDaysInMonth;

  // LOP amount = ONLY unpaid leave days × daily rate
  const lopAmount = lopDays * (perDayBasic + perDayHousing + perDayTransport + perDayOther);

  // Final payable = Pro-rated amount - LOP
  const payableBasic = proRatedBasic - lopDays * perDayBasic;
  const payableHousing = proRatedHousing - lopDays * perDayHousing;
  const payableTransport = proRatedTransport - lopDays * perDayTransport;
  const payableOther = proRatedOther - lopDays * perDayOther;

  const grossSalary = payableBasic + payableHousing + payableTransport + payableOther;
  const deductions = lopAmount;
  const netSalary = grossSalary;

  return {
    actualDaysWorked,
    eligibleWorkingDays: employeeWorkingDays,
    lop: lopDays,
    lopAmount,
    basicSalary: payableBasic,
    housingAllowance: payableHousing,
    transportAllowance: payableTransport,
    otherAllowances: payableOther,
    grossSalary,
    deductions,
    netSalary,
  };
};

export default function GeneratePayrollPage() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const workingDays = getWorkingDays(year, month);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      const employeeList = Array.isArray(data) ? data : [];
      setEmployees(employeeList.filter((emp) => emp.employmentStatus === 'Active'));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCalculatePayroll = async () => {
    setCalculating(true);
    try {
      // Fetch leave requests
      const leaveRequests = await getLeaveRequests();

      const calculated = employees
        .map((employee) => {
          // Calculate employee's actual working days based on joining date
          const employeeWorkingDays = getEmployeeWorkingDays(year, month, employee.joiningDate);

          // If employee hasn't joined yet or left, skip
          if (employeeWorkingDays === 0) {
            return null;
          }

          // Calculate leave data for the selected month
          const leaveData = calculateLeaveDataForMonth(employee.id, year, month, leaveRequests);

          // Annual leave entitlement (default 30 days/year for Saudi)
          const annualLeaveEntitlement = employee.annualLeave || 30;

          // Leave balance = Total granted - Taken YTD
          const leaveBalance = annualLeaveEntitlement - leaveData.totalLeavesTakenYTD;

          // Add leave data to employee object
          const employeeWithLeaves = {
            ...employee,
            totalLeaveDaysInMonth: leaveData.totalLeaveDaysInMonth,
            paidLeaveDaysInMonth: leaveData.paidLeaveDaysInMonth,
            unpaidLeaveDaysInMonth: leaveData.unpaidLeaveDaysInMonth,
          };

          // Calculate pro-rata salary (passing both total month working days and employee's eligible days)
          const proRata = calculateProRataSalary(
            employeeWithLeaves,
            workingDays,
            employeeWorkingDays
          );

          return {
            id: employee.id,
            employeeId: employee.employeeId,
            fullName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            designation: employee.designation,
            joiningDate: employee.joiningDate,
            leaveBalance, // Remaining leaves for the year
            leavesTaken: leaveData.totalLeaveDaysInMonth, // Leaves in THIS month
            paidLeaves: leaveData.paidLeaveDaysInMonth,
            unpaidLeaves: leaveData.unpaidLeaveDaysInMonth,
            actualDaysWorked: proRata.actualDaysWorked,
            eligibleWorkingDays: proRata.eligibleWorkingDays,
            lop: proRata.lop,
            lopAmount: proRata.lopAmount,
            workingDays: employeeWorkingDays, // Employee's eligible days
            totalWorkingDays: workingDays, // Total working days in month
            basicSalary: proRata.basicSalary,
            housingAllowance: proRata.housingAllowance,
            transportAllowance: proRata.transportAllowance,
            otherAllowances: proRata.otherAllowances,
            grossSalary: proRata.grossSalary,
            deductions: proRata.deductions,
            netSalary: proRata.netSalary,
          };
        })
        .filter(Boolean); // Remove null entries (employees not yet joined)

      setPayrollData(calculated);
      toast.success(`Payroll calculated for ${calculated.length} employees`);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      toast.error('Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      console.log('Generating payroll:', { month, year, payrollData });
      toast.success('Payroll generated successfully');
      router.push(paths.dashboard.hr.employee.finance.payroll.root);
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Failed to generate payroll');
    }
  };

  const columns = [
    { field: 'employeeId', headerName: 'Employee ID', flex: 1, minWidth: 120 },
    { field: 'fullName', headerName: 'Name', flex: 1.5, minWidth: 180 },
    { field: 'department', headerName: 'Department', flex: 1.2, minWidth: 150 },
    {
      field: 'joiningDate',
      headerName: 'Joining Date',
      flex: 1,
      minWidth: 120,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      field: 'eligibleWorkingDays',
      headerName: 'Eligible Days',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => `${params.value}/${params.row.totalWorkingDays}`,
    },
    {
      field: 'leavesTaken',
      headerName: 'Leaves',
      flex: 0.6,
      minWidth: 80,
    },
    {
      field: 'actualDaysWorked',
      headerName: 'Days Worked',
      flex: 0.8,
      minWidth: 100,
    },
    {
      field: 'workingDays',
      headerName: 'Working Days',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => `${params.value}/${params.row.totalWorkingDays}`,
    },
    {
      field: 'basicSalary',
      headerName: 'Basic Salary',
      flex: 1,
      minWidth: 120,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
    },
    {
      field: 'housingAllowance',
      headerName: 'Housing',
      flex: 1,
      minWidth: 100,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
    },
    {
      field: 'transportAllowance',
      headerName: 'Transport',
      flex: 1,
      minWidth: 100,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
    },
    {
      field: 'paidLeaves',
      headerName: 'Paid Leaves',
      width: 120,
    },
    {
      field: 'unpaidLeaves',
      headerName: 'Unpaid Leaves',
      width: 120,
    },
    {
      field: 'leaveBalance',
      headerName: 'Leave Balance',
      width: 120,
      editable: true,
      type: 'number',
    },
    {
      field: 'leavesTaken',
      headerName: 'Leaves Taken',
      width: 120,
      editable: true,
      type: 'number',
    },
    {
      field: 'actualDaysWorked',
      headerName: 'Days Worked',
      width: 120,
    },
    {
      field: 'lop',
      headerName: 'LOP Days',
      width: 100,
    },
    {
      field: 'lopAmount',
      headerName: 'LOP Amount',
      width: 120,
      valueFormatter: (value) => `${value?.toFixed(2) || '0.00'} SAR`,
    },
    {
      field: 'grossSalary',
      headerName: 'Gross Salary',
      flex: 1.2,
      minWidth: 130,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
    },
    {
      field: 'netSalary',
      headerName: 'Net Salary',
      flex: 1.2,
      minWidth: 130,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
      renderCell: (params) => (
        <Typography variant="subtitle2" sx={{ color: 'success.main' }}>
          SAR {params.value?.toFixed(2) || 0}
        </Typography>
      ),
    },
  ];

  const totalGross = payrollData.reduce((sum, row) => sum + (row.grossSalary || 0), 0);
  const totalNet = payrollData.reduce((sum, row) => sum + (row.netSalary || 0), 0);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Generate Payroll"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Payroll', href: paths.dashboard.hr.employee.finance.payroll.root },
          { name: 'Generate' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* Period Selection */}
        <Card>
          <CardHeader title="Select Payroll Period" />
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                select
                label="Month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value={1}>January</MenuItem>
                <MenuItem value={2}>February</MenuItem>
                <MenuItem value={3}>March</MenuItem>
                <MenuItem value={4}>April</MenuItem>
                <MenuItem value={5}>May</MenuItem>
                <MenuItem value={6}>June</MenuItem>
                <MenuItem value={7}>July</MenuItem>
                <MenuItem value={8}>August</MenuItem>
                <MenuItem value={9}>September</MenuItem>
                <MenuItem value={10}>October</MenuItem>
                <MenuItem value={11}>November</MenuItem>
                <MenuItem value={12}>December</MenuItem>
              </TextField>

              <TextField
                select
                label="Year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value={2024}>2024</MenuItem>
                <MenuItem value={2025}>2025</MenuItem>
                <MenuItem value={2026}>2026</MenuItem>
              </TextField>

              <TextField
                label="Working Days"
                value={workingDays}
                disabled
                helperText="Excluding Fri-Sat (Saudi weekend)"
                sx={{ minWidth: 200 }}
              />
            </Stack>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleCalculatePayroll}
                disabled={employees.length === 0 || calculating}
              >
                Calculate Payroll
              </Button>
              <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                {employees.length} active employees found
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Payroll Summary */}
        {payrollData.length > 0 && (
          <>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h4">{payrollData.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h4">SAR {totalGross.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gross Payroll
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h4" sx={{ color: 'success.main' }}>
                    SAR {totalNet.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Net Payroll
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Payroll Details Table */}
            <Card>
              <CardHeader
                title="Payroll Details"
                action={
                  <Button variant="contained" color="primary" onClick={handleGeneratePayroll}>
                    Generate & Send for Approval
                  </Button>
                }
              />
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={payrollData}
                  columns={columns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  processRowUpdate={(newRow) => {
                    // Recalculate when leaves are edited
                    const updated = calculateProRataSalary(newRow, workingDays);
                    const recalculated = {
                      ...newRow,
                      actualDaysWorked: updated.actualDaysWorked,
                      lop: updated.lop,
                      lopAmount: updated.lopAmount,
                      basicSalary: updated.basicSalary,
                      housingAllowance: updated.housingAllowance,
                      transportAllowance: updated.transportAllowance,
                      otherAllowances: updated.otherAllowances,
                      grossSalary: updated.grossSalary,
                      deductions: updated.deductions,
                      netSalary: updated.netSalary,
                    };

                    setPayrollData((prev) =>
                      prev.map((row) => (row.id === recalculated.id ? recalculated : row))
                    );
                    return recalculated;
                  }}
                  onProcessRowUpdateError={(error) => {
                    console.error('Row update error:', error);
                    toast.error('Failed to update row');
                  }}
                />
              </Box>
            </Card>
          </>
        )}
      </Stack>
    </DashboardContent>
  );
}
