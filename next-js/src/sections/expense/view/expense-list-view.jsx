'use client';

import dynamic from 'next/dynamic';
import { sumBy } from 'es-toolkit';
import { useState, useEffect, useCallback } from 'react';
import { usePopover, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { apiHelper } from 'src/utils/apiHelper';
import { fDate, fIsAfter } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { ExpenseAnalytic } from '../expense-analytic';
import { ExpenseTableRow } from '../expense-table-row';
import { ExpenseTableToolbar } from '../expense-table-toolbar';

// ----------------------------------------------------------------------

const ExpensePDFDownload = dynamic(
  () => import('./expense-pdf').then((mod) => mod.ExpensePDFDownload),
  { ssr: false }
);

const TABLE_HEAD = [
  { id: 'id', label: 'ID', width: 80, sortable: true },
  { id: 'expenseDate', label: 'Date', width: 100, sortable: true },
  { id: 'expenseTypeDesc', label: 'Type', width: 100, sortable: false },
  { id: 'description', label: 'Description', width: 380, sortable: false },
  { id: 'expenseAmount', label: 'Amount (SAR)', width: 140, sortable: false },
  { id: 'expenseApprovalStatus', label: 'Status', width: 80, sortable: false },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function ExpenseListView({ expenses: initialExpenses = [], permissionError = null }) {
  const { user } = useAuthContext();
  const roleIdToName = {
    1: 'regular',
    2: 'manager',
    3: 'admin',
    4: 'superAdmin',
  };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canEdit = normalizedRole === 'superAdmin';

  const [permissionDenied, setPermissionDenied] = useState(!!permissionError);

  // Update permission denied state when prop changes
  useEffect(() => {
    if (permissionError) {
      console.log('🔒 Permission denied state set:', permissionError);
      setPermissionDenied(true);
    }
  }, [permissionError]);

  const table = useTable({ defaultRowsPerPage: 25 });
  const router = useRouter();
  const [expenses, setExpenses] = useState(() => initialExpenses);

  // Function to refresh a specific expense from the backend
  const handleRefreshExpense = useCallback(
    async (referenceId) => {
      try {
        console.log('[ExpenseList] Refreshing expense:', referenceId);
        // Fetch the updated expense from backend using apiHelper
        const updatedExpense = await apiHelper.getExpense(referenceId);

        if (updatedExpense) {
          // Update the expense in local state
          setExpenses((prevExpenses) =>
            prevExpenses.map((exp) =>
              exp.referenceId === referenceId ? { ...updatedExpense } : exp
            )
          );

          console.log('[ExpenseList] Expense refreshed successfully:', referenceId, updatedExpense);
        } else {
          console.warn('[ExpenseList] No expense data returned for:', referenceId);
          // Fallback to full page refresh
          router.refresh();
        }
      } catch (error) {
        console.error('[ExpenseList] Failed to refresh expense:', error);
        // Fallback to full page refresh if individual refresh fails
        router.refresh();
      }
    },
    [router]
  );
  const filters = useSetState({
    name: '',
    status: 'all',
    currencies: [],
    startDate: null,
    endDate: null,
    sortOrder: 'desc', // 'asc' or 'desc'
  });
  const { state: currentFilters } = filters;
  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: expenses,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
    dateError,
  });

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const canReset = !!filters.state.name;

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const getExpenseLength = (status) => {
    if (status === true)
      return expenses.filter((item) => item.expenseApprovalStatus === true).length;
    if (status === false)
      return expenses.filter((item) => item.expenseApprovalStatus === false).length;
    if (status === null)
      return expenses.filter((item) => item.expenseApprovalStatus === null).length;
    return expenses.length;
  };

  const getTotalAmount = (status) => {
    let filtered = expenses;
    if (status === true) filtered = expenses.filter((item) => item.expenseApprovalStatus === true);
    if (status === false)
      filtered = expenses.filter((item) => item.expenseApprovalStatus === false);
    if (status === null) filtered = expenses.filter((item) => item.expenseApprovalStatus === null);
    return sumBy(filtered, (expense) => expense.expenseAmount || 0);
  };

  const getPercentByStatus = (status) => {
    if (expenses.length === 0) return 0;
    return (getExpenseLength(status) / expenses.length) * 100;
  };

  const theme = useTheme();

  {
    /* Add this AFTER CustomBreadcrumbs and BEFORE the table Card */
  }

  const handleEditRow = useCallback(
    (id) => {
      if (!canEdit) {
        toast.error('Only admins and super admins can edit expenses');
        return;
      }
      router.push(paths.dashboard.expense.edit(id));
    },
    [canEdit, router]
  );

  // Export functions
  const handleExportExcel = useCallback(() => {
    const headers = [
      'ID',
      'Date',
      'Type',
      'Description',
      'Amount (SAR)',
      'Currency',
      'Status',
      'Approved By',
    ];

    const csvData = dataFiltered.map((expense) => [
      expense.id,
      fDate(expense.expenseDate),
      expense.expenseTypeDesc,
      expense.expenseSettlementNotes || '-',
      expense.expenseAmount || 0,
      expense.originalExpenseCurrency || 'SAR',
      expense.expenseApprovalStatus === true
        ? 'Approved'
        : expense.expenseApprovalStatus === false
          ? 'Rejected'
          : 'Pending',
      expense.expenseApprovedBy || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [dataFiltered]);

  const handleExportJSON = useCallback(() => {
    const jsonData = dataFiltered.map((expense) => ({
      id: expense.id,
      referenceId: expense.referenceId,
      date: expense.expenseDate,
      type: expense.expenseTypeDesc,
      description: expense.expenseSettlementNotes,
      amount: expense.expenseAmount,
      currency: expense.originalExpenseCurrency || 'SAR',
      status:
        expense.expenseApprovalStatus === true
          ? 'Approved'
          : expense.expenseApprovalStatus === false
            ? 'Rejected'
            : 'Pending',
      approvedBy: expense.expenseApprovedBy,
      expenseBy: expense.expenseBy,
    }));

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }, [dataFiltered]);

  const popover = usePopover();

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.expense.details(id));
    },
    [router]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Expense List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: 'List' },
        ]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:download-outline" />}
              onClick={popover.onOpen}
            >
              Export
            </Button>

            <Button
              component={RouterLink}
              href={paths.dashboard.expense.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New Expense
            </Button>

            <CustomPopover
              open={popover.open}
              anchorEl={popover.anchorEl}
              onClose={popover.onClose}
              slotProps={{ arrow: { placement: 'top-right' } }}
            >
              <MenuList>
                <MenuItem
                  onClick={() => {
                    handleExportExcel();
                    popover.onClose();
                  }}
                >
                  <Iconify icon="vscode-icons:file-type-excel" />
                  Export to Excel (CSV)
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    popover.onClose();
                  }}
                >
                  <Iconify icon="vscode-icons:file-type-pdf2" />
                  <ExpensePDFDownload
                    expenses={dataFiltered}
                    summary={{
                      total: dataFiltered.length,
                      totalAmount: sumBy(dataFiltered, (e) => e.expenseAmount || 0),
                      approved: dataFiltered.filter((e) => e.expenseApprovalStatus).length,
                      approvedAmount: sumBy(
                        dataFiltered.filter((e) => e.expenseApprovalStatus),
                        (e) => e.expenseAmount || 0
                      ),
                      notApproved: dataFiltered.filter((e) => !e.expenseApprovalStatus).length,
                      notApprovedAmount: sumBy(
                        dataFiltered.filter((e) => !e.expenseApprovalStatus),
                        (e) => e.expenseAmount || 0
                      ),
                    }}
                  />
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleExportJSON();
                    popover.onClose();
                  }}
                >
                  <Iconify icon="vscode-icons:file-type-json" />
                  Export to JSON
                </MenuItem>
              </MenuList>
            </CustomPopover>
          </Box>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Card sx={{ mb: { xs: 3, md: 5 } }}>
        <Scrollbar sx={{ minHeight: 108 }}>
          <Stack
            divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
            sx={{ py: 2, flexDirection: 'row' }}
          >
            <ExpenseAnalytic
              title="Total"
              total={expenses.length}
              percent={100}
              price={sumBy(expenses, (expense) => expense.expenseAmount || 0)}
              icon="solar:bill-list-bold-duotone"
              color={theme.vars.palette.info.main}
            />

            <ExpenseAnalytic
              title="Approved"
              total={getExpenseLength(true)}
              percent={getPercentByStatus(true)}
              price={getTotalAmount(true)}
              icon="solar:file-check-bold-duotone"
              color={theme.vars.palette.success.main}
            />

            <ExpenseAnalytic
              title="Pending"
              total={getExpenseLength(null)}
              percent={getPercentByStatus(null)}
              price={getTotalAmount(null)}
              icon="solar:sort-by-time-bold-duotone"
              color={theme.vars.palette.warning.main}
            />

            <ExpenseAnalytic
              title="Rejected"
              total={getExpenseLength(false)}
              percent={getPercentByStatus(false)}
              price={getTotalAmount(false)}
              icon="solar:close-circle-bold-duotone"
              color={theme.vars.palette.error.main}
            />
          </Stack>
        </Scrollbar>
      </Card>
      <Card>
        <ExpenseTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          dateError={dateError}
          dataFiltered={dataFiltered}
        />
        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table
              size={table.dense ? 'small' : 'medium'}
              sx={{ minWidth: 960, '& .MuiTableCell-root': { whitespace: 'nowrap' } }}
            >
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
                onSort={table.onSort}
              />

              <TableBody>
                {dataInPage.map((row) => (
                  <ExpenseTableRow
                    key={row.referenceId}
                    row={row}
                    canEdit={canEdit}
                    onEditRow={() => handleEditRow(row.referenceId)}
                    onViewRow={() => handleViewRow(row.referenceId)}
                    onRefresh={() => handleRefreshExpense(row.referenceId)}
                  />
                ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                {permissionDenied ? (
                  <TableNoData
                    notFound
                    title="Permission Denied"
                    subTitle="You don't have permission to view expenses. Please contact your administrator."
                    sx={{
                      '& .MuiTypography-h6': { color: 'error.main' },
                    }}
                  />
                ) : (
                  <TableNoData notFound={notFound} />
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={dataFiltered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          rowsPerPageOptions={[50, 100, 500]} // <-- ADD THIS LINE
        />
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { name, status, currencies, startDate, endDate, sortOrder } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  // Filter by name
  if (name) {
    inputData = inputData.filter(
      (expense) =>
        expense.id.toString().toLowerCase().includes(name.toLowerCase()) ||
        (expense.expenseSettlementNotes &&
          expense.expenseSettlementNotes.toLowerCase().includes(name.toLowerCase())) ||
        (expense.expenseTypeDesc &&
          expense.expenseTypeDesc.toLowerCase().includes(name.toLowerCase()))
    );
  }

  // Filter by status
  if (status !== 'all') {
    inputData = inputData.filter((expense) => {
      if (status === 'approved') return expense.expenseApprovalStatus === true;
      if (status === 'rejected') return expense.expenseApprovalStatus === false;
      if (status === 'pending')
        return (
          expense.expenseApprovalStatus === null || expense.expenseApprovalStatus === undefined
        );
      return true;
    });
  }

  // Filter by currencies
  if (currencies.length > 0) {
    inputData = inputData.filter((expense) =>
      currencies.includes(expense.originalExpenseCurrency || 'SAR')
    );
  }

  // Filter by date range
  if (startDate && endDate && !dateError) {
    inputData = inputData.filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Normalize to compare dates only (not times)
      expenseDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999); // Include entire end date

      return expenseDate >= start && expenseDate <= end;
    });
  }

  return inputData;
}
