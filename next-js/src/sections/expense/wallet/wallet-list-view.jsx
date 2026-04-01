'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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
import LinearProgress from '@mui/material/LinearProgress';

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
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';

// ──────────────────────────────────────────────────────────────

const TABLE_HEAD = [
  { id: 'employeeName', label: 'Employee', sortable: true },
  { id: 'balance', label: 'Balance', width: 140, align: 'right', sortable: true },
  { id: 'currency', label: 'Currency', width: 100, sortable: false },
  { id: 'updatedAt', label: 'Last Updated', width: 140, sortable: true },
  { id: '', width: 220 },
];

// ──────────────────────────────────────────────────────────────

export function WalletListView({ wallets: initialWallets = [] }) {
  const { user } = useAuthContext();
  const router = useRouter();
  const table = useTable({ defaultRowsPerPage: 25 });

  // Existing wallet records from DB
  const [walletMap, setWalletMap] = useState(() => {
    const map = {};
    initialWallets.forEach((w) => {
      map[w.employeeId] = w;
    });
    return map;
  });

  // Microsoft user list — source of truth for "all employees"
  const { users: msUsers, loading: loadingUsers } = useMicrosoftUsers();

  // Merge: every MS user gets a row; DB wallet data overlaid where it exists
  const dataFiltered = useMemo(() => {
    if (!msUsers.length) {
      // Fall back to DB rows only while MS users are loading
      return Object.values(walletMap).sort((a, b) =>
        (a.employeeName || '').localeCompare(b.employeeName || '')
      );
    }
    return msUsers
      .filter((u) => u.email) // skip accounts without an email
      .map((u) => {
        const existing = walletMap[u.id] || walletMap[u.email];
        return {
          employeeId: existing?.employeeId ?? u.id,
          employeeName: existing?.employeeName ?? u.name,
          employeeEmail: existing?.employeeEmail ?? u.email,
          balance: existing?.balance ?? 0,
          currency: existing?.currency ?? 'SAR',
          updatedAt: existing?.updatedAt ?? null,
          hasWallet: !!existing,
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [msUsers, walletMap]);

  const totalBalance = useMemo(
    () => dataFiltered.reduce((sum, w) => sum + Number(w.balance ?? 0), 0),
    [dataFiltered]
  );
  const activeCount = useMemo(
    () => dataFiltered.filter((w) => Number(w.balance) > 0).length,
    [dataFiltered]
  );

  const notFound = !loadingUsers && !dataFiltered.length;

  // ── Top-up dialog ──────────────────────────────────────────────

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

  const handleOpenTopUp = useCallback(
    (row) => {
      setTopUpForm({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        employeeEmail: row.employeeEmail,
        amount: '',
        currency: row.currency || 'SAR',
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
        `Added ${topUpForm.currency} ${fNumber(topUpForm.amount)} to ${topUpForm.employeeName}'s wallet.`
      );
      // Upsert the returned wallet into our map
      const updated = result.wallet;
      if (updated) {
        setWalletMap((prev) => ({ ...prev, [updated.employeeId]: updated }));
      }
      topUpDialog.onFalse();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Top-up failed.');
    } finally {
      setTopUpLoading(false);
    }
  }, [topUpForm, user, topUpDialog]);

  const handleViewDetail = useCallback(
    (row) => {
      router.push(paths.dashboard.expense.wallet.employee(row.employeeId));
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    try {
      const fresh = await apiHelper.getWallets();
      const map = {};
      fresh.forEach((w) => {
        map[w.employeeId] = w;
      });
      setWalletMap(map);
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
          icon="solar:users-group-two-rounded-bold"
          color="primary.main"
          label="Total Employees"
          value={dataFiltered.length}
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
          icon="solar:wallet-bold"
          color="warning.main"
          label="Active Wallets"
          value={activeCount}
          isCurrency={false}
        />
      </Box>

      {/* Employees Table */}
      <Card>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2 }}
        >
          <Box>
            <Typography variant="h6">Employee Wallets</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All employees are listed. Click <strong>Top-Up</strong> to load funds into any wallet.
            </Typography>
          </Box>
        </Stack>

        {loadingUsers && <LinearProgress />}

        <Scrollbar>
          <TableContainer sx={{ minWidth: 720 }}>
            <Table size={table.dense ? 'small' : 'medium'}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
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
                      key={row.employeeId}
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

      <TableCell align="right">
        <Label
          variant="soft"
          color={balance > 0 ? 'success' : 'default'}
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
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={onTopUp}
          >
            Top-Up
          </Button>
          <Button variant="outlined" onClick={onViewDetail} disabled={!row.hasWallet}>
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
            label="Employee"
            value={`${form.employeeName} (${form.employeeEmail})`}
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
