'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { CONFIG } from 'src/global-config';
// Mock data for components that still need it
import { _bankingContacts } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBankAccounts, fetchBankTransactions } from 'src/actions/banking';

import { Iconify } from 'src/components/iconify/iconify';

import { BankingContacts } from '../banking-contacts';
import { BankingOverview } from '../banking-overview';
import { BankingQuickTransfer } from '../banking-quick-transfer';
import { BankingInviteFriends } from '../banking-invite-friends';
import { BankingCurrentBalance } from '../banking-current-balance';
import { BankingStatementUpload } from '../banking-statement-upload';
import { BankingBalanceStatistics } from '../banking-balance-statistics';
import { BankingRecentTransitions } from '../banking-recent-transitions';
import { BankingExpensesCategories } from '../banking-expenses-categories';

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * Convert amount from one currency to another using fixed exchange rate
 */
function convertCurrency(amount, fromCurrency, toCurrency = 'SAR') {
  if (fromCurrency === toCurrency) return amount;

  // Fixed exchange rate: 1 AED = 1.02 SAR (approximate)
  const AED_TO_SAR = 1.02;

  if (fromCurrency === 'AED' && toCurrency === 'SAR') {
    return amount * AED_TO_SAR;
  }
  if (fromCurrency === 'SAR' && toCurrency === 'AED') {
    return amount / AED_TO_SAR;
  }

  return amount;
}

// Helper function to mask account number
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '**** **** **** ****';
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  if (cleaned.length <= 4) return `**** **** **** ${cleaned}`;
  const masked = cleaned.slice(0, -4).replace(/\d/g, '*');
  const last4 = cleaned.slice(-4);
  // Format with spaces every 4 characters
  const formatted = (masked + last4).match(/.{1,4}/g)?.join(' ') || accountNumber;
  return formatted;
};

/**
 * Calculate total balance across all accounts converted to SAR
 */
function calculateTotalBalance(accounts, targetCurrency = 'SAR') {
  return accounts.reduce((total, account) => {
    const convertedBalance = convertCurrency(
      account.currentBalance || 0,
      account.currency,
      targetCurrency
    );
    return total + convertedBalance;
  }, 0);
}

/**
 * Calculate income and expenses from transactions
 */
function calculateIncomeExpenses(transactions) {
  const income = transactions
    .filter((t) => t.transactionType === 'credit')
    .reduce((sum, t) => sum + (t.credit || t.amount || 0), 0);

  const expenses = transactions
    .filter((t) => t.transactionType === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.debit || t.amount || 0), 0);

  return { income, expenses };
}

// ----------------------------------------------------------------------

export function OverviewBankingView() {
  const [currentTab, setCurrentTab] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch bank accounts
  const loadAccounts = useCallback(async () => {
    const result = await fetchBankAccounts({ status: 'active' });
    if (result.success) {
      setAccounts(result.data || []);
    }
  }, []);

  // Fetch transactions
  const loadTransactions = useCallback(async (filters = {}) => {
    const result = await fetchBankTransactions({
      ...filters,
      limit: 20,
    });
    if (result.success) {
      setTransactions(result.data || []);
    }
  }, []);

  // Filter accounts by current tab
  const filteredAccounts =
    currentTab === 'all' ? accounts : accounts.filter((acc) => acc.region === currentTab);

  // Calculate total balance in SAR (AED + SAR converted)
  const totalBalanceSAR = calculateTotalBalance(filteredAccounts, 'SAR');

  // Calculate income and expenses from transactions
  const { income, expenses } = calculateIncomeExpenses(transactions);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadAccounts(), loadTransactions()]);
      setLoading(false);
    };
    loadData();
  }, [loadAccounts, loadTransactions]);

  // Filter transactions by region
  useEffect(() => {
    if (currentTab === 'all') {
      loadTransactions();
    } else {
      const regionAccounts = accounts.filter((acc) => acc.region === currentTab);
      if (regionAccounts.length > 0) {
        const accountIds = regionAccounts.map((a) => a.id);
        // For now, just reload all - you can enhance this later
        loadTransactions();
      }
    }
  }, [currentTab, accounts, loadTransactions]);

  // Handle statement upload completion
  const handleUploadComplete = useCallback(
    (result) => {
      setSnackbar({
        open: true,
        message: `Successfully imported ${result.summary?.newTransactions || 0} transactions`,
        severity: 'success',
      });
      // Refresh data
      loadAccounts();
      loadTransactions();
    },
    [loadAccounts, loadTransactions]
  );

  // Transform accounts to card format for BankingCurrentBalance
  const accountCards = accounts.map((account) => ({
    id: account.id,
    balance: account.currentBalance || 0,
    cardType: null,
    cardHolder: account.accountName,
    cardNumber: maskAccountNumber(account.accountNumber),
    cardValid: account.region === 'KSA' ? 'Saudi Arabia' : 'United Arab Emirates',
    bankName: account.bankName,
    currency: account.currency,
    region: account.region,
  }));

  // Transform transactions for recent transitions component
  const recentTransactions = transactions.map((txn) => ({
    id: txn.id,
    name: txn.counterparty || txn.description?.substring(0, 20),
    avatarUrl: null,
    type: txn.transactionType === 'credit' || txn.credit > 0 ? 'Income' : 'Expenses',
    message: txn.transactionType === 'credit' ? 'Received from' : 'Payment for',
    category: txn.category || txn.counterparty || 'Transaction',
    date: txn.transactionDate,
    status: txn.reconciled ? 'completed' : 'progress',
    amount: txn.credit > 0 ? txn.credit : txn.debit || txn.amount,
    currency: txn.currency || 'AED', // Add currency to transaction
    region: txn.region || 'UAE', // Add region to transaction
  }));

  // Calculate expense categories from transactions
  const expenseCategories = calculateExpenseCategories(transactions);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <DashboardContent maxWidth="xl">
      {/* Region Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
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
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            {/* Statement Upload Card */}
            <BankingStatementUpload accounts={accounts} onUploadComplete={handleUploadComplete} />

            <BankingOverview totalBalance={totalBalanceSAR} income={income} expenses={expenses} />

            <BankingBalanceStatistics
              title="Balance statistics"
              subheader="Statistics on balance over time"
              chart={{
                series: [
                  {
                    name: 'Weekly',
                    categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                    data: [
                      { name: 'Income', data: [24, 41, 35, 151, 49] },
                      { name: 'Expenses', data: [24, 56, 77, 88, 99] },
                    ],
                  },
                  {
                    name: 'Monthly',
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                    data: [
                      { name: 'Income', data: [83, 112, 119, 88, 103, 112, 114, 108, 93] },
                      { name: 'Expenses', data: [46, 46, 43, 58, 40, 59, 54, 42, 51] },
                    ],
                  },
                  {
                    name: 'Yearly',
                    categories: ['2020', '2021', '2022', '2023', '2024', '2025'],
                    data: [
                      { name: 'Income', data: [76, 42, 29, 41, 27, 96] },
                      { name: 'Expenses', data: [46, 44, 24, 43, 44, 43] },
                    ],
                  },
                ],
              }}
            />

            <BankingExpensesCategories
              title="Expenses by category"
              chart={{
                series: expenseCategories.series,
                icons: expenseCategories.icons,
              }}
            />

            <BankingRecentTransitions
              title="Recent transactions"
              tableData={recentTransactions.length > 0 ? recentTransactions : []}
              headCells={[
                { id: 'description', label: 'Description' },
                { id: 'date', label: 'Date' },
                { id: 'amount', label: 'Amount' },
                { id: 'status', label: 'Status' },
                { id: '' },
              ]}
            />
          </Box>
        </Grid>

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

            <BankingQuickTransfer title="Quick transfer" list={_bankingContacts} />

            <BankingContacts
              title="Contacts"
              subheader="You have 122 contacts"
              list={_bankingContacts.slice(-5)}
            />

            <BankingInviteFriends
              price="$50"
              title={`Invite friends \n and earn`}
              description="Praesent egestas tristique nibh. Duis lobortis massa imperdiet quam."
              imgUrl={`${CONFIG.assetsDir}/assets/illustrations/illustration-receipt.webp`}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

/**
 * Calculate expense categories from transactions
 */
function calculateExpenseCategories(transactions) {
  const categoryMap = {
    bank_fees: { label: 'Bank Fees', icon: <Iconify icon="solar:card-recive-bold" /> },
    vat: { label: 'VAT', icon: <Iconify icon="solar:document-bold" /> },
    salary: { label: 'Salary', icon: <Iconify icon="solar:user-bold" /> },
    rent: { label: 'Rent', icon: <Iconify icon="solar:home-bold" /> },
    utilities: { label: 'Utilities', icon: <Iconify icon="solar:bolt-bold" /> },
    vendor_payment: { label: 'Vendor Payments', icon: <Iconify icon="solar:cart-3-bold" /> },
    transfer_out: { label: 'Transfers', icon: <Iconify icon="solar:transfer-horizontal-bold" /> },
    maintenance_fee: { label: 'Maintenance', icon: <Iconify icon="solar:settings-bold" /> },
    other: { label: 'Other', icon: <Iconify icon="solar:widget-bold" /> },
  };

  const expenses = transactions.filter(
    (t) => t.transactionType === 'debit' || t.debit > 0 || t.transactionType === 'withdrawal'
  );

  const categoryTotals = {};
  expenses.forEach((txn) => {
    const category = txn.category || 'other';
    const amount = txn.debit || txn.amount || 0;
    categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(amount);
  });

  const series = [];
  const icons = [];

  Object.entries(categoryTotals).forEach(([category, value]) => {
    const categoryInfo = categoryMap[category] || categoryMap.other;

    // Check if we already have this label to avoid duplicates
    const existingIndex = series.findIndex((item) => item.label === categoryInfo.label);
    if (existingIndex >= 0) {
      // Add to existing category
      series[existingIndex].value += Math.round(value);
    } else {
      // Add new category
      series.push({ label: categoryInfo.label, value: Math.round(value) });
      icons.push(categoryInfo.icon);
    }
  });

  // If no data, return defaults
  if (series.length === 0) {
    return {
      series: [
        { label: 'Bank Fees', value: 0 },
        { label: 'VAT', value: 0 },
        { label: 'Other', value: 0 },
      ],
      icons: [
        <Iconify icon="solar:card-recive-bold" />,
        <Iconify icon="solar:document-bold" />,
        <Iconify icon="solar:widget-bold" />,
      ],
    };
  }

  return { series, icons };
}
