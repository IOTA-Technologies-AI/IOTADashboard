'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { apiHelper } from 'src/utils/apiHelper';
import { fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

// ──────────────────────────────────────────────────────────────

const TABLE_HEAD = [
  { id: 'employeeName', label: 'Employee', sortable: true },
  { id: 'employeeEmail', label: 'Email', sortable: false },
  { id: 'balance', label: 'Balance', width: 140, align: 'right', sortable: true },
  { id: 'currency', label: 'Currency', width: 100, sortable: false },
  { id: 'updatedAt', label: 'Last Updated', width: 140, sortable: true },
  { id: '', width: 160 },
];

// ──────────────────────────────────────────────────────────────

export function WalletListView({ wallets: initialWallets = [] }) {
  const { user } = useAuthContext();
  const router = useRouter();
  const table = useTable({ defaultRowsPerPage: 25 });

  const [wallets, setWallets] = useState(initialWallets);

  // Top-up dialog state
  const topUpDialog = useBoolean();
  const [topUpForm, setTopUpForm] = useState({
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    amount: '',
    currency: 'SAR',
    description: '',
  });
  const [topUpLoading, setTopUpLoading] = useState(false);

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance ?? 0), 0);
  const totalWallets = wallets.length;
  const positiveWallets = wallets.filter((w) => Number(w.balance) > 0).length;

  const dataFiltered = wallets;
  const notFound = !dataFiltered.length;

  // ── Handlers ──────────────────────────────────────────────────

  const handleOpenTopUp = useCallback(
    (wallet) => {
      setTopUpForm({
        employeeId: wallet.employeeId,
        employeeName: wallet.employeeName,
        employeeEmail: wallet.employeeEmail,
        amount: '',
        currency: wallet.currency || 'SAR',
        description: '',
      });
      topUpDialog.onTrue();
    },
    [topUpDialog]
  );

  const handleTopUpSubmit = useCallback(async () => {
    if (!topUpForm.amount || Number(topUpForm.amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }
    setTopUpLoading(true);
    try {
      const performedBy = user?.userEmail || user?.email || 'admin';
      const result = await apiHelper.topUpWallet({
        ...topUpForm,
        amount: Number(topUpForm.amount),
        performedBy,
      });
      toast.success(
        `Successfully added ${topUpForm.currency} ${fNumber(topUpForm.amount)} to ${topUpForm.employeeName}'s wallet.`
      );
      // Update the local wallet balance
      setWallets((prev) =>
        prev.map((w) =>
          w.employeeId === topUpForm.employeeId
            ? { ...w, balance: result.wallet?.balance ?? w.balance }
            : w
        )
      );
      topUpDialog.onFalse();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Top-up failed.');
    } finally {
      setTopUpLoading(false);
    }
  }, [topUpForm, user, topUpDialog]);

  const handleViewDetail = useCallback(
    (wallet) => {
      router.push(paths.dashboard.expense.wallet.employee(wallet.employeeId));
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    try {
      const fresh = await apiHelper.getWallets();
      setWallets(fresh);
      toast.success('Wallets refreshed.');
    } catch {
      toast.error('Failed to refresh wallets.');
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Wallet Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: 'Wallet Management' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:refresh-fill" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Summary Cards */}
      <Box
        sx={{
          mb: 3,
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
        }}
      >
        <SummaryCard
          icon="solar:wallet-bold"
          color="primary.main"
          label="Total Wallets"
          value={totalWallets}
          isCurrency={false}
        />
        <SummaryCard
          icon="solar:wallet-money-bold"
          color="success.main"
          label="Total Balance (SAR)"
          value={totalBalance}
          isCurrency
        />
        <SummaryCard
          icon="solar:users-group-two-rounded-bold"
          color="warning.main"
          label="Active Balances"
          value={positiveWallets}
          isCurrency={false}
        />
      </Box>

      {/* Wallets Table */}
      <Card>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2 }}
        >
          <Typography variant="h6">Employee Wallets</Typography>
          <Tooltip title="Add funds to an employee wallet by clicking 'Top-Up' on the row.">
            <Iconify icon="eva:info-outline" sx={{ color: 'text.secondary' }} />
          </Tooltip>
        </Stack>

        <Scrollbar>
          <TableContainer sx={{ minWidth: 720 }}>
            <Table size={table.dense ? 'small' : 'medium'}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
              />

              <TableBody>
                {dataFiltered
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => (
                    <WalletTableRow
                      key={row.id || row.employeeId}
                      row={row}
                      onTopUp={() => handleOpenTopUp(row)}
                      onViewDetail={() => handleViewDetail(row)}
                    />
                  ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />
                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={dataFiltered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {/* Top-Up Dialog */}
      <TopUpDialog
        open={topUpDialog.value}
        onClose={topUpDialog.onFalse}
        form={topUpForm}
        onChange={(field, val) => setTopUpForm((p) => ({ ...p, [field]: val }))}
        onSubmit={handleTopUpSubmit}
        loading={topUpLoading}
      />
    </DashboardContent>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function SummaryCard({ icon, color, label, value, isCurrency }) {
  return (
    <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          borderRadius: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: color,
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={28} />
      </Box>
      <Box>
        <Typography variant="h5">{isCurrency ? `SAR ${fNumber(value)}` : value}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Card>
  );
}

function WalletTableRow({ row, onTopUp, onViewDetail }) {
  const balance = Number(row.balance ?? 0);

  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ typography: 'subtitle2' }}>{row.employeeName}</Box>
        <Box sx={{ typography: 'caption', color: 'text.secondary' }}>{row.employeeId}</Box>
      </TableCell>
      <TableCell sx={{ typography: 'body2', color: 'text.secondary' }}>
        {row.employeeEmail}
      </TableCell>
      <TableCell align="right">
        <Label
          variant="soft"
          color={balance > 0 ? 'success' : balance < 0 ? 'error' : 'default'}
          sx={{ typography: 'subtitle2', px: 1.5 }}
        >
          {fNumber(balance)}
        </Label>
      </TableCell>
      <TableCell sx={{ typography: 'body2' }}>{row.currency || 'SAR'}</TableCell>
      <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
        {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={onTopUp}
          >
            Top-Up
          </Button>
          <Button size="small" variant="outlined" onClick={onViewDetail}>
            Detail
          </Button>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function TopUpDialog({ open, onClose, form, onChange, onSubmit, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Top-Up Wallet</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Employee Name"
            value={form.employeeName}
            fullWidth
            InputProps={{ readOnly: true }}
            size="small"
          />
          <TextField
            label="Employee Email"
            value={form.employeeEmail}
            fullWidth
            InputProps={{ readOnly: true }}
            size="small"
          />
          <TextField
            label="Amount"
            value={form.amount}
            onChange={(e) => onChange('amount', e.target.value)}
            fullWidth
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start">{form.currency}</InputAdornment>,
            }}
          />
          <TextField
            label="Description (optional)"
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={loading}>
          {loading ? 'Processing…' : 'Confirm Top-Up'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
