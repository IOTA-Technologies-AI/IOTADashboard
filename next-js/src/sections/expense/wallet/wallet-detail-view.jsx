'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';

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

const TX_TABLE_HEAD = [
  { id: 'createdAt', label: 'Date', width: 140, sortable: true },
  { id: 'type', label: 'Type', width: 160, sortable: false },
  { id: 'direction', label: 'Direction', width: 100, sortable: false },
  { id: 'amount', label: 'Amount', width: 120, align: 'right', sortable: true },
  { id: 'balanceAfter', label: 'Balance After', width: 140, align: 'right', sortable: false },
  { id: 'description', label: 'Description', sortable: false },
  { id: 'performedBy', label: 'By', width: 160, sortable: false },
];

const TX_TYPE_LABELS = {
  top_up: { label: 'Top-Up', color: 'success' },
  expense_deduction: { label: 'Expense Deduction', color: 'error' },
  adjustment: { label: 'Adjustment', color: 'warning' },
  refund: { label: 'Refund', color: 'info' },
};

// ──────────────────────────────────────────────────────────────

export function WalletDetailView({
  employeeId,
  wallet: initialWallet,
  transactions: initialTransactions = [],
}) {
  const { user } = useAuthContext();
  const table = useTable({ defaultRowsPerPage: 20 });

  const [wallet, setWallet] = useState(initialWallet);
  const [transactions, setTransactions] = useState(initialTransactions);

  // Dialogs
  const topUpDialog = useBoolean();
  const adjustDialog = useBoolean();

  // Top-up form
  const [topUpForm, setTopUpForm] = useState({ amount: '', currency: 'SAR', description: '' });
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Adjust form
  const [adjustForm, setAdjustForm] = useState({
    direction: 'credit',
    amount: '',
    currency: 'SAR',
    description: '',
  });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const notFound = !transactions.length;
  const currency = wallet?.currency || 'SAR';

  // ── Refresh ──────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    try {
      const [w, txs] = await Promise.all([
        apiHelper.getWallet(employeeId),
        apiHelper.getWalletTransactions(employeeId),
      ]);
      setWallet(w);
      setTransactions(txs);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [employeeId]);

  // ── Top-Up ───────────────────────────────────────────────────

  const handleTopUpSubmit = useCallback(async () => {
    if (!topUpForm.amount || Number(topUpForm.amount) <= 0) {
      toast.error('Enter a valid amount greater than 0.');
      return;
    }
    setTopUpLoading(true);
    try {
      const performedBy = user?.userEmail || user?.email || 'admin';
      await apiHelper.topUpWallet({
        employeeId: wallet.employeeId,
        employeeName: wallet.employeeName,
        employeeEmail: wallet.employeeEmail,
        amount: Number(topUpForm.amount),
        currency: topUpForm.currency,
        description: topUpForm.description || undefined,
        performedBy,
      });
      toast.success(`Added ${currency} ${fNumber(topUpForm.amount)} to wallet.`);
      topUpDialog.onFalse();
      setTopUpForm({ amount: '', currency, description: '' });
      await refreshData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Top-up failed.');
    } finally {
      setTopUpLoading(false);
    }
  }, [topUpForm, wallet, user, topUpDialog, currency, refreshData]);

  // ── Adjust ───────────────────────────────────────────────────

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustForm.amount || Number(adjustForm.amount) <= 0) {
      toast.error('Enter a valid amount greater than 0.');
      return;
    }
    setAdjustLoading(true);
    try {
      const performedBy = user?.userEmail || user?.email || 'admin';
      await apiHelper.adjustWallet({
        employeeId: wallet.employeeId,
        direction: adjustForm.direction,
        amount: Number(adjustForm.amount),
        currency: adjustForm.currency,
        description: adjustForm.description || undefined,
        performedBy,
      });
      toast.success(
        `Wallet ${adjustForm.direction === 'credit' ? 'credited' : 'debited'} by ${currency} ${fNumber(adjustForm.amount)}.`
      );
      adjustDialog.onFalse();
      setAdjustForm({ direction: 'credit', amount: '', currency, description: '' });
      await refreshData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Adjustment failed.');
    } finally {
      setAdjustLoading(false);
    }
  }, [adjustForm, wallet, user, adjustDialog, currency, refreshData]);

  // ── Render ───────────────────────────────────────────────────

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Wallet Detail"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: 'Wallet Management', href: paths.dashboard.expense.wallet.root },
          { name: wallet?.employeeName || employeeId },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Wallet Header Card */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5">{wallet?.employeeName || employeeId}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {wallet?.employeeEmail}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ID: {employeeId}
            </Typography>
          </Box>

          <Box sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Available Balance
            </Typography>
            <Typography
              variant="h3"
              sx={{ color: Number(wallet?.balance) > 0 ? 'success.main' : 'text.primary' }}
            >
              {currency} {fNumber(wallet?.balance ?? 0)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={topUpDialog.onTrue}
            >
              Top-Up
            </Button>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={adjustDialog.onTrue}
            >
              Adjust
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2 }}
        >
          <Typography variant="h6">Transaction History</Typography>
          <Button
            size="small"
            startIcon={<Iconify icon="eva:refresh-fill" />}
            onClick={refreshData}
          >
            Refresh
          </Button>
        </Stack>

        <Divider />

        <Scrollbar>
          <TableContainer sx={{ minWidth: 800 }}>
            <Table size={table.dense ? 'small' : 'medium'}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TX_TABLE_HEAD}
                rowCount={transactions.length}
                onSort={table.onSort}
              />

              <TableBody>
                {transactions
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} currency={currency} />
                  ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, transactions.length)}
                />
                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={transactions.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {/* Top-Up Dialog */}
      <Dialog open={topUpDialog.value} onClose={topUpDialog.onFalse} maxWidth="xs" fullWidth>
        <DialogTitle>Top-Up Wallet</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Adding funds to <strong>{wallet?.employeeName}</strong>
            </Typography>
            <TextField
              label="Amount"
              value={topUpForm.amount}
              onChange={(e) => setTopUpForm((p) => ({ ...p, amount: e.target.value }))}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }}
            />
            <TextField
              label="Description (optional)"
              value={topUpForm.description}
              onChange={(e) => setTopUpForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={topUpDialog.onFalse} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleTopUpSubmit} variant="contained" disabled={topUpLoading}>
            {topUpLoading ? 'Processing…' : 'Add Funds'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialog.value} onClose={adjustDialog.onFalse} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust Wallet Balance</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Manually credit or debit <strong>{wallet?.employeeName}</strong>&apos;s wallet.
            </Typography>
            <ToggleButtonGroup
              exclusive
              color="primary"
              value={adjustForm.direction}
              onChange={(_, val) => val && setAdjustForm((p) => ({ ...p, direction: val }))}
              fullWidth
              size="small"
            >
              <ToggleButton value="credit">Credit (+)</ToggleButton>
              <ToggleButton value="debit">Debit (-)</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Amount"
              value={adjustForm.amount}
              onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }}
            />
            <TextField
              label="Reason / Description"
              value={adjustForm.description}
              onChange={(e) => setAdjustForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={adjustDialog.onFalse} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleAdjustSubmit}
            variant="contained"
            color={adjustForm.direction === 'credit' ? 'primary' : 'error'}
            disabled={adjustLoading}
          >
            {adjustLoading
              ? 'Processing…'
              : `Confirm ${adjustForm.direction === 'credit' ? 'Credit' : 'Debit'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

// ── Transaction Row ─────────────────────────────────────────────

function TransactionRow({ tx, currency }) {
  const txMeta = TX_TYPE_LABELS[tx.type] || { label: tx.type, color: 'default' };
  const isCredit = tx.direction === 'credit';

  return (
    <TableRow hover>
      <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
      </TableCell>
      <TableCell>
        <Label variant="soft" color={txMeta.color}>
          {txMeta.label}
        </Label>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={isCredit ? '▲ Credit' : '▼ Debit'}
          color={isCredit ? 'success' : 'error'}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right">
        <Typography variant="subtitle2" sx={{ color: isCredit ? 'success.main' : 'error.main' }}>
          {isCredit ? '+' : '-'} {currency} {fNumber(tx.amount)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">
          {currency} {fNumber(tx.balanceAfter)}
        </Typography>
      </TableCell>
      <TableCell sx={{ typography: 'body2', color: 'text.secondary', maxWidth: 240 }}>
        {tx.description || (tx.expenseReferenceId ? `Expense #${tx.expenseReferenceId}` : '—')}
      </TableCell>
      <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
        {tx.performedBy}
      </TableCell>
    </TableRow>
  );
}
