'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuthContext } from 'src/auth/hooks';
import { fetchBankAccounts, fetchBankTransactions } from 'src/actions/banking';

import { Iconify } from 'src/components/iconify/iconify';

import { BankingOverview } from '../../../overview/banking/banking-overview';
import { BankingCurrentBalance } from '../../../overview/banking/banking-current-balance';
import { BankingBalanceStatistics } from '../../../overview/banking/banking-balance-statistics';
import { BankingExpensesCategories } from '../../../overview/banking/banking-expenses-categories';
import { AccountsTransactionsList } from '../accounts-transactions-list';
import { AccountsCreateTransactionDialog } from '../accounts-create-transaction-dialog';
import { AccountsReconciliationPanel } from '../accounts-reconciliation-panel';

// ----------------------------------------------------------------------

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '**** **** **** ****';
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  if (cleaned.length <= 4) return `**** **** **** ${cleaned}`;
  const masked = cleaned.slice(0, -4).replace(/\d/g, '*');
  const last4 = cleaned.slice(-4);
  return (masked + last4).match(/.{1,4}/g)?.join(' ') || accountNumber;
};

function calculateIncomeExpenses(transactions) {
  const incoming = transactions
    .filter((t) => t.transactionType === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.credit || t.amount || 0), 0);
  const outgoing = transactions
    .filter((t) => t.transactionType === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.debit || t.amount || 0), 0);
  return { incoming, outgoing };
}

function calculateExpenseCategories(transactions) {
  const expenses = transactions.filter((t) => t.transactionType === 'debit');
  const totals = {};
  expenses.forEach((t) => {
    const cat = t.category || 'other';
    totals[cat] = (totals[cat] || 0) + parseFloat(t.debit || t.amount || 0);
  });

  const LABELS = {
    salary: 'Salary',
    rent: 'Rent',
    utilities: 'Utilities',
    vendor_payment: 'Vendor Payments',
    bank_fees: 'Bank Fees',
    vat: 'VAT',
    transfer_out: 'Transfers',
    maintenance_fee: 'Maintenance',
    other: 'Other',
  };

  const series = [];
  const icons = [];
  Object.entries(totals).forEach(([cat, val]) => {
    series.push({ label: LABELS[cat] || cat, value: Math.round(val) });
    icons.push(<Iconify icon="solar:widget-bold" />);
  });

  if (!series.length) {
    return {
      series: [{ label: 'No expenses', value: 0 }],
      icons: [<Iconify icon="solar:widget-bold" />],
    };
  }
  return { series, icons };
}

// ----------------------------------------------------------------------

export default function OverviewAccountsView() {
  const { user } = useAuthContext();
  const userEmail = user?.email || '';
  const userRole = user?.role || 'regular';

  const [currentTab, setCurrentTab] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadAccounts = useCallback(async () => {
    const result = await fetchBankAccounts({ status: 'active' });
    if (result.success) setAccounts(result.data || []);
  }, []);

  const loadTransactions = useCallback(async () => {
    const result = await fetchBankTransactions({ limit: 100 });
    if (result.success) setTransactions(result.data || []);
  }, []);

  useEffect(() => {
    Promise.all([loadAccounts(), loadTransactions()]);
  }, [loadAccounts, loadTransactions]);

  // ── Derived state ───────────────────────────────────────────────────────

  const filteredAccounts =
    currentTab === 'all' ? accounts : accounts.filter((a) => a.region === currentTab);

  const filteredTransactions =
    currentTab === 'all'
      ? transactions
      : transactions.filter((txn) => {
          const acc = accounts.find((a) => a.id === txn.bankAccountId);
          return acc?.region === currentTab;
        });

  const totalBalance = filteredAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const { incoming, outgoing } = calculateIncomeExpenses(filteredTransactions);
  const pendingReconciliation = filteredTransactions.filter((t) => !t.reconciled).length;

  const accountCards = filteredAccounts.map((acc) => ({
    id: acc.id,
    balance: acc.currentBalance || 0,
    cardType: null,
    cardHolder: (acc.accountName || acc.bankName || '').slice(0, 25),
    cardNumber: maskAccountNumber(acc.accountNumber),
    cardValid: acc.region === 'KSA' ? 'Saudi Arabia' : 'United Arab Emirates',
    bankName: acc.bankName,
    currency: acc.currency,
    region: acc.region,
  }));

  const expenseCategories = calculateExpenseCategories(filteredTransactions);

  const buildMonthlyData = () => {
    const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
    filteredTransactions.forEach((t) => {
      if (!t.transactionDate) return;
      const m = new Date(t.transactionDate).getMonth();
      if (t.transactionType === 'credit') months[m].income += t.amount || 0;
      else months[m].expense += t.amount || 0;
    });
    return {
      incomeData: months.map((m) => Math.round(m.income)),
      expenseData: months.map((m) => Math.round(m.expense)),
    };
  };
  const { incomeData, expenseData } = buildMonthlyData();
  const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const handleTransactionCreated = useCallback(
    (newTx) => {
      setSnackbar({
        open: true,
        message: `Transaction recorded: ${newTx?.description || ''}`,
        severity: 'success',
      });
      loadTransactions();
    },
    [loadTransactions]
  );

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Accounts</Typography>
          <Typography variant="body2" color="text.secondary">
            Track all incoming and outgoing transactions
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:refresh-bold" />}
            onClick={() => setReconcileOpen((v) => !v)}
            color={reconcileOpen ? 'primary' : 'inherit'}
          >
            {reconcileOpen ? 'Hide Reconciliation' : 'Reconcile'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setCreateOpen(true)}
          >
            New Transaction
          </Button>
        </Stack>
      </Stack>

      {/* Region Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab
            value="all"
            label="All Accounts"
            icon={<Iconify icon="solar:wallet-bold" width={20} />}
            iconPosition="start"
          />
          <Tab
            value="UAE"
            label="UAE"
            icon={<Iconify icon="flagpack:ae" width={20} />}
            iconPosition="start"
          />
          <Tab
            value="KSA"
            label="KSA"
            icon={<Iconify icon="flagpack:sa" width={20} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {/* ── Left column ─────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <BankingOverview
              totalBalance={totalBalance}
              income={incoming}
              expenses={outgoing}
              currency="SAR"
            />

            <BankingBalanceStatistics
              title="Transaction Statistics"
              subheader="Monthly incoming vs outgoing"
              chart={{
                series: [
                  {
                    name: 'Monthly',
                    categories: MONTH_LABELS,
                    data: [
                      { name: 'Incoming', data: incomeData },
                      { name: 'Outgoing', data: expenseData },
                    ],
                  },
                  {
                    name: 'Yearly',
                    categories: ['2022', '2023', '2024', '2025', '2026'],
                    data: [
                      { name: 'Incoming', data: [0, 0, 0, 0, Math.round(incoming)] },
                      { name: 'Outgoing', data: [0, 0, 0, 0, Math.round(outgoing)] },
                    ],
                  },
                ],
              }}
            />

            <BankingExpensesCategories
              title="Outgoing by Category"
              chart={{ series: expenseCategories.series, icons: expenseCategories.icons }}
            />

            <AccountsTransactionsList
              title="Transactions"
              subheader={`${filteredTransactions.length} total — ${pendingReconciliation} pending reconciliation`}
              tableData={filteredTransactions}
            />
          </Box>
        </Grid>

        {/* ── Right column ─────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <BankingCurrentBalance
              list={
                accountCards.length > 0
                  ? accountCards
                  : [
                      {
                        id: 'placeholder',
                        balance: 0,
                        cardType: null,
                        cardHolder: 'No accounts',
                        cardNumber: '**** **** **** ****',
                        cardValid: 'N/A',
                      },
                    ]
              }
            />

            {/* Quick action card */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify
                      icon="solar:transfer-horizontal-bold"
                      width={22}
                      sx={{ color: 'primary.main' }}
                    />
                    <Typography variant="subtitle1">Record a Transaction</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Manually record incoming or outgoing funds. Entries are reconciled against bank
                    statements automatically.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="success"
                      startIcon={<Iconify icon="solar:arrow-down-bold" />}
                      onClick={() => setCreateOpen(true)}
                    >
                      Incoming
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<Iconify icon="solar:arrow-up-bold" />}
                      onClick={() => setCreateOpen(true)}
                    >
                      Outgoing
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Reconciliation summary */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify
                        icon="solar:refresh-bold"
                        width={22}
                        sx={{ color: 'warning.main' }}
                      />
                      <Typography variant="subtitle1">Reconciliation</Typography>
                    </Stack>
                    {pendingReconciliation > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: 'warning.lighter',
                          color: 'warning.darker',
                          fontWeight: 700,
                        }}
                      >
                        {pendingReconciliation} pending
                      </Typography>
                    )}
                  </Stack>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Stack spacing={1}>
                    {[
                      {
                        label: 'Total Transactions',
                        value: filteredTransactions.length,
                        color: 'text.primary',
                      },
                      {
                        label: 'Reconciled',
                        value: filteredTransactions.filter((t) => t.reconciled).length,
                        color: 'success.main',
                      },
                      { label: 'Pending', value: pendingReconciliation, color: 'warning.main' },
                      {
                        label: 'Total Incoming',
                        value: fCurrency(incoming, { currencyCode: 'SAR' }),
                        color: 'success.main',
                      },
                      {
                        label: 'Total Outgoing',
                        value: fCurrency(outgoing, { currencyCode: 'SAR' }),
                        color: 'error.main',
                      },
                    ].map((row) => (
                      <Stack key={row.label} direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          {row.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: row.color, fontWeight: 600 }}>
                          {row.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Reconciliation Panel */}
      {reconcileOpen && (
        <AccountsReconciliationPanel
          userEmail={userEmail}
          userRole={userRole}
          onMatchSubmitted={loadTransactions}
          sx={{ mt: 3 }}
        />
      )}

      {/* Create Transaction Dialog */}
      <AccountsCreateTransactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accounts={accounts}
        onCreated={handleTransactionCreated}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
