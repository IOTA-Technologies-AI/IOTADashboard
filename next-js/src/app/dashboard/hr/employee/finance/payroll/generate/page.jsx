'use client';

import { useRouter } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import {
  getEmployees,
  getLeaveRequests,
  createPayrollRun,
  fetchPayrollRuns,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
  TableSelectedAction,
  emptyRows,
  rowInPage,
  useTable,
} from 'src/components/table';

// Calculate actual working days for employee based on joining date
const getEmployeeWorkingDays = (year, month, joiningDate) => {
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

  // GOSI is a fixed monthly amount held on the employee record, not a
  // pro-rated component: the contribution is assessed on the contractual wage
  // and does not shrink with unpaid leave.
  const gosiDeduction = Number(employee.gosiDeduction) || 0;

  const grossSalary = payableBasic + payableHousing + payableTransport + payableOther;
  const deductions = lopAmount + gosiDeduction;
  const netSalary = grossSalary - gosiDeduction;

  return {
    actualDaysWorked,
    eligibleWorkingDays: employeeWorkingDays,
    lop: lopDays,
    lopAmount,
    gosiDeduction,
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
  const [, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [runMeta, setRunMeta] = useState(null);
  const selectionInitialized = useRef(false);
  const table = useTable({ defaultOrderBy: 'fullName', defaultRowsPerPage: 10 });

  const selectedIdsArray = useMemo(
    () => table.selected.map(String).filter(Boolean),
    [table.selected]
  );

  useEffect(() => {}, [selectedIdsArray]);

  const getRowId = useCallback((item) => {
    if (!item) return '';
    const raw =
      item.__rowId ?? item.id ?? item.employeeId ?? item.employeeID ?? item.payrollLineItemId;
    return raw != null ? String(raw) : '';
  }, []);

  const workingDays = getWorkingDays(year, month);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      const employeeList = Array.isArray(data) ? data : [];
      const activeEmployees = employeeList.filter((emp) => emp.employmentStatus === 'Active');

      // Only include employees with a valid bank account (IBAN or bank account number)
      const bankEligibleEmployees = activeEmployees.filter(
        (emp) => emp?.iban || emp?.bankAccountNumber
      );

      const normalizedEmployees = bankEligibleEmployees.map((emp, idx) => {
        const baseId = getRowId(emp);
        const fallbackId = `emp-${idx}-${emp.employeeId || emp.email || emp.firstName || 'noid'}`;
        const __rowId = baseId && baseId.trim() ? baseId : fallbackId;
        return { ...emp, __rowId };
      });

      setEmployees(normalizedEmployees);

      // Start with no selection; users choose who to include
      if (!selectionInitialized.current) {
        table.setSelected([]);
        selectionInitialized.current = true;
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
      setEmployees([]);
      table.setSelected([]);
    } finally {
      setLoading(false);
    }
  }, [getRowId, table]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCalculatePayroll = async () => {
    setCalculating(true);
    try {
      const leaveRequests = await getLeaveRequests();
      const leaveList = Array.isArray(leaveRequests) ? leaveRequests : [];

      const calculated = employees
        .filter((emp) => selectedIdsArray.includes(getRowId(emp)))
        .map((employee) => {
          const employeeWorkingDays = getEmployeeWorkingDays(year, month, employee.joiningDate);
          if (employeeWorkingDays <= 0) {
            return null;
          }

          const leaveData = calculateLeaveDataForMonth(employee.id, year, month, leaveList);
          const annualLeaveEntitlement = employee.annualLeave || 30;
          const leaveBalance = annualLeaveEntitlement - leaveData.totalLeavesTakenYTD;

          const employeeWithLeaves = {
            ...employee,
            totalLeaveDaysInMonth: leaveData.totalLeaveDaysInMonth,
            paidLeaveDaysInMonth: leaveData.paidLeaveDaysInMonth,
            unpaidLeaveDaysInMonth: leaveData.unpaidLeaveDaysInMonth,
          };

          const proRata = calculateProRataSalary(
            employeeWithLeaves,
            workingDays,
            employeeWorkingDays
          );

          const rowId = getRowId(employee);

          return {
            id: rowId,
            employeeId: employee.employeeId,
            fullName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            designation: employee.designation,
            joiningDate: employee.joiningDate,
            leaveBalance,
            leavesTaken: leaveData.totalLeaveDaysInMonth,
            paidLeaves: leaveData.paidLeaveDaysInMonth,
            unpaidLeaves: leaveData.unpaidLeaveDaysInMonth,
            actualDaysWorked: proRata.actualDaysWorked,
            eligibleWorkingDays: proRata.eligibleWorkingDays,
            lop: proRata.lop,
            lopAmount: proRata.lopAmount,
            gosiDeduction: proRata.gosiDeduction,
            workingDays: employeeWorkingDays,
            totalWorkingDays: workingDays,
            basicSalary: proRata.basicSalary,
            housingAllowance: proRata.housingAllowance,
            transportAllowance: proRata.transportAllowance,
            otherAllowances: proRata.otherAllowances,
            grossSalary: proRata.grossSalary,
            deductions: proRata.deductions,
            netSalary: proRata.netSalary,
            manualDeductionAmount: 0,
            manualDeductionRemarks: '',
          };
        })
        .filter(Boolean);

      setRunMeta(null);
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
      setGenerating(true);
      // Prevent duplicate payroll runs for the same month/year
      const existing = await fetchPayrollRuns();
      const alreadyExists = Array.isArray(existing)
        ? existing.some((run) => run.periodMonth === month && run.periodYear === year)
        : false;
      if (alreadyExists) {
        toast.error('A payroll run already exists for this period. Please edit the existing run.');
        return;
      }
      // Filter to only selected employees from the calculated payroll data
      const selectedPayrollData = payrollData.filter((row) => selectedIdsArray.includes(row.id));
      const selectedEmployeeDbIds = selectedPayrollData
        .map((row) => {
          const emp = employees.find((e) => getRowId(e) === row.id);
          return emp?.id;
        })
        .filter(Boolean);

      // Build per-employee manual deduction overrides (keyed by DB id)
      const lineItemOverrides = {};
      selectedPayrollData.forEach((row) => {
        const emp = employees.find((e) => getRowId(e) === row.id);
        if (emp?.id && (row.manualDeductionAmount > 0 || row.manualDeductionRemarks)) {
          lineItemOverrides[emp.id] = {
            manualDeductionAmount: row.manualDeductionAmount || 0,
            ...(row.manualDeductionRemarks
              ? { manualDeductionRemarks: row.manualDeductionRemarks }
              : {}),
          };
        }
      });

      const response = await createPayrollRun({
        periodMonth: month,
        periodYear: year,
        generatedBy: 'system',
        notes: undefined,
        employeeIds: selectedEmployeeDbIds,
        ...(Object.keys(lineItemOverrides).length > 0 ? { lineItemOverrides } : {}),
      });

      if (response?.lineItems) {
        setPayrollData(
          response.lineItems.map((li) => {
            const normalizedId =
              getRowId(li) || `${li.employeeName || 'emp'}-${li.employeeId || ''}`;
            return { ...li, id: normalizedId };
          })
        );
      }
      if (response?.payrollRun) {
        setRunMeta(response.payrollRun);
      }

      toast.success('Payroll generated successfully');

      if (response?.payrollRun?.id) {
        router.push(
          `${paths.dashboard.hr.employee.root}/finance/payroll/${response.payrollRun.id}`
        );
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
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
      renderCell: (params) => {
        const row = params?.row || {};
        const val = params?.value ?? 0;
        const total = row.totalWorkingDays ?? 0;
        return `${val}/${total}`;
      },
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
      renderCell: (params) => {
        const row = params?.row || {};
        const val = params?.value ?? 0;
        const total = row.totalWorkingDays ?? 0;
        return `${val}/${total}`;
      },
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
      field: 'gosiDeduction',
      headerName: 'GOSI',
      width: 120,
      valueFormatter: (value) => (value > 0 ? `SAR ${Number(value).toFixed(2)}` : '—'),
      renderHeader: () => (
        <span title="GOSI employee contribution held on the employee record. Edit it on the employee profile.">
          GOSI
        </span>
      ),
    },
    {
      field: 'manualDeductionAmount',
      headerName: 'Extra Deductions',
      flex: 1,
      minWidth: 140,
      editable: true,
      type: 'number',
      valueFormatter: (value) => (value > 0 ? `SAR ${Number(value || 0).toFixed(2)}` : '—'),
      renderHeader: () => (
        <span title="Enter any additional deduction to apply on top of LOP (e.g. advance, loan repayment). Editable.">
          Extra Deductions ✎
        </span>
      ),
    },
    {
      field: 'manualDeductionRemarks',
      headerName: 'Deduction Reason',
      flex: 1.4,
      minWidth: 170,
      editable: true,
      renderHeader: () => (
        <span title="Describe the reason for the extra deduction (e.g. Advance repayment). Editable.">
          Deduction Reason ✎
        </span>
      ),
    },
    {
      field: 'netSalary',
      headerName: 'Net Salary',
      flex: 1.2,
      minWidth: 130,
      valueFormatter: (value) => `SAR ${value?.toFixed(2) || 0}`,
      renderCell: (params) => (
        <Typography variant="subtitle2" sx={{ color: 'success.main' }}>
          SAR {params?.value?.toFixed(2) || 0}
        </Typography>
      ),
    },
  ];

  const totalGross =
    runMeta?.totalGross ?? payrollData.reduce((sum, row) => sum + (row.grossSalary || 0), 0);
  const totalNet =
    runMeta?.totalNet ?? payrollData.reduce((sum, row) => sum + (row.netSalary || 0), 0);

  const employeeTableHead = [
    { id: 'employeeId', label: 'Employee ID', width: 140 },
    { id: 'fullName', label: 'Name', width: 200 },
    { id: 'department', label: 'Department', width: 160 },
    { id: 'designation', label: 'Designation', width: 160 },
    { id: 'joiningDate', label: 'Joining Date', width: 160 },
  ];

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
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader
            title="Select Employees"
            subheader={`${selectedIdsArray.length} of ${employees.length} active employees selected`}
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    table.onSelectAllRows(true, employees.map((e) => getRowId(e)).filter(Boolean))
                  }
                  disabled={employees.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    selectionInitialized.current = true; // prevent re-init on clear
                    table.onSelectAllRows(false, []);
                  }}
                  disabled={selectedIdsArray.length === 0}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCalculatePayroll}
                  disabled={employees.length === 0 || calculating || selectedIdsArray.length === 0}
                >
                  {calculating ? 'Calculating...' : 'Calculate Payroll'}
                </Button>
              </Stack>
            }
          />

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={selectedIdsArray.length}
              rowCount={employees.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  employees.map((row) => getRowId(row)).filter(Boolean)
                )
              }
              action={
                <Button size="small" color="error" onClick={() => table.setSelected([])}>
                  Clear
                </Button>
              }
            />

            <Box sx={{ overflow: 'auto' }}>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={employeeTableHead}
                  rowCount={employees.length}
                  numSelected={selectedIdsArray.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      employees.map((row) => getRowId(row)).filter(Boolean)
                    )
                  }
                />

                <TableBody>
                  {rowInPage(employees, table.page, table.rowsPerPage).map((row) => {
                    const id = getRowId(row);
                    const selected = table.selected.includes(id);
                    return (
                      <TableRow key={id} hover selected={selected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected}
                            onChange={() => {
                              selectionInitialized.current = true; // user interacted
                              table.onSelectRow(id);
                            }}
                          />
                        </TableCell>
                        <TableCell>{row.employeeId || '-'}</TableCell>
                        <TableCell>
                          {`${row.firstName || ''} ${row.lastName || ''}`.trim() || '-'}
                        </TableCell>
                        <TableCell>{row.department || '-'}</TableCell>
                        <TableCell>{row.designation || '-'}</TableCell>
                        <TableCell>
                          {row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableEmptyRows
                    height={table.dense ? 52 : 72}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, employees.length)}
                  />

                  {!employees.length && (
                    <TableRow>
                      <TableCell align="center" colSpan={employeeTableHead.length + 1}>
                        No active employees found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>

          <TablePaginationCustom
            dense={table.dense}
            page={table.page}
            component="div"
            count={employees.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            onChangeDense={table.onChangeDense}
          />
        </Card>

        {/* Payroll Summary */}
        {payrollData.length > 0 && (
          <>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h4">
                    {runMeta?.totalEmployees ?? payrollData.length}
                  </Typography>
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
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGeneratePayroll}
                    disabled={
                      generating || payrollData.length === 0 || selectedIdsArray.length === 0
                    }
                  >
                    {generating ? 'Generating…' : 'Generate & Send for Approval'}
                  </Button>
                }
              />
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={payrollData}
                  columns={columns}
                  getRowId={getRowId}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  processRowUpdate={(newRow) => {
                    const manualDeductionAmount =
                      typeof newRow.manualDeductionAmount === 'number'
                        ? newRow.manualDeductionAmount
                        : Number(newRow.manualDeductionAmount) || 0;
                    const manualDeductionRemarks = newRow.manualDeductionRemarks || '';

                    // Recalculate LOP-based values from leave data
                    const updated = calculateProRataSalary(
                      newRow,
                      newRow.totalWorkingDays || workingDays,
                      newRow.eligibleWorkingDays || newRow.workingDays || workingDays
                    );

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
                      // deductions = LOP + GOSI + manual deduction for display
                      deductions: updated.deductions + manualDeductionAmount,
                      // net = pro-rata net (already LOP- and GOSI-adjusted) minus any manual deduction
                      netSalary: updated.netSalary - manualDeductionAmount,
                      manualDeductionAmount,
                      manualDeductionRemarks,
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
