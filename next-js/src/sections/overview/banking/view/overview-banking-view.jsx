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
import { runAutoReconciliation } from 'src/actions/reconciliation';

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

  // Calculate income and expenses from transactions (filtered by current tab)
  const filteredTransactions =
    currentTab === 'all'
      ? transactions
      : transactions.filter((txn) => {
          const txnAccount = accounts.find((acc) => acc.id === txn.bankAccountId);
          return txnAccount?.region === currentTab;
        });

  // Calculate income and expenses in SAR
  const { income: rawIncome, expenses: rawExpenses } =
    calculateIncomeExpenses(filteredTransactions);

  // Convert to SAR based on transaction currency
  const income = filteredTransactions
    .filter((t) => t.transactionType === 'credit')
    .reduce((sum, t) => {
      const amount = t.credit || t.amount || 0;
      const txnAccount = accounts.find((acc) => acc.id === t.bankAccountId);
      const currency = t.currency || txnAccount?.currency || 'AED';
      return sum + convertCurrency(amount, currency, 'SAR');
    }, 0);

  const expenses = filteredTransactions
    .filter((t) => t.transactionType === 'debit')
    .reduce((sum, t) => {
      const amount = Math.abs(t.debit || t.amount || 0);
      const txnAccount = accounts.find((acc) => acc.id === t.bankAccountId);
      const currency = t.currency || txnAccount?.currency || 'AED';
      return sum + convertCurrency(amount, currency, 'SAR');
    }, 0);

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
    async (result) => {
      // Refresh data first
      loadAccounts();
      loadTransactions();

      // Attempt auto-reconciliation for this statement
      if (result?.statementId) {
        try {
          const reconcileResult = await runAutoReconciliation({ statementId: result.statementId });
          const autoMatched = reconcileResult?.autoMatched ?? 0;
          const pendingManual = reconcileResult?.pendingManual ?? 0;
          const newTxns = result.summary?.newTransactions ?? 0;
          setSnackbar({
            open: true,
            message: `Imported ${newTxns} transactions. Auto-reconciled ${autoMatched}${
              pendingManual > 0 ? `, ${pendingManual} need manual review` : ''
            }.`,
            severity: 'success',
          });
        } catch (_err) {
          setSnackbar({
            open: true,
            message: `Imported ${result.summary?.newTransactions || 0} transactions. Auto-reconciliation could not run.`,
            severity: 'warning',
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: `Successfully imported ${result?.summary?.newTransactions || 0} transactions`,
          severity: 'success',
        });
      }
    },
    [loadAccounts, loadTransactions]
  );

  // Helper function to truncate long names
  const truncateName = (name, maxLength = 25) => {
    if (!name) return '';
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  // Transform accounts to card format for BankingCurrentBalance (filtered by tab)
  const accountCards = filteredAccounts.map((account) => ({
    id: account.id,
    balance: account.currentBalance || 0,
    cardType: null,
    cardHolder: truncateName(account.accountName, 25), // Truncate long names
    cardNumber: maskAccountNumber(account.accountNumber),
    cardValid: account.region === 'KSA' ? 'Saudi Arabia' : 'United Arab Emirates',
    bankName: account.bankName,
    currency: account.currency,
    region: account.region,
  }));

  // Transform transactions for recent transitions component
  const recentTransactions = transactions.map((txn) => {
    // Get the account for this transaction to determine region
    const txnAccount = accounts.find((acc) => acc.id === txn.bankAccountId);

    return {
      id: txn.id,
      name: txn.counterparty || txn.description?.substring(0, 20),
      avatarUrl: null,
      type: txn.transactionType === 'credit' || txn.credit > 0 ? 'Income' : 'Expenses',
      message: txn.transactionType === 'credit' ? 'Received from' : 'Payment for',
      category: txn.category || txn.counterparty || 'Transaction',
      date: txn.transactionDate,
      status: 'posted', // All transactions are posted/success
      amount: txn.credit > 0 ? txn.credit : txn.debit || txn.amount,
      currency: txn.currency || txnAccount?.currency || 'AED',
      region: txnAccount?.region || txn.region || 'UAE', // Get region from account
    };
  });

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

            <BankingOverview
              totalBalance={totalBalanceSAR}
              income={income}
              expenses={expenses}
              currency="SAR"
            />

            <BankingBalanceStatistics
              title="Balance statistics (SAR)"
              subheader={`Statistics on balance over time${currentTab !== 'all' ? ` - ${currentTab}` : ''}`}
              chart={{
                currency: 'SAR',
                series: [
                  {
                    name: 'Weekly',
                    categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                    data: [
                      {
                        name: 'Income',
                        data: [
                          Math.round(income * 0.1),
                          Math.round(income * 0.15),
                          Math.round(income * 0.12),
                          Math.round(income * 0.3),
                          Math.round(income * 0.2),
                        ],
                      },
                      {
                        name: 'Expenses',
                        data: [
                          Math.round(expenses * 0.15),
                          Math.round(expenses * 0.2),
                          Math.round(expenses * 0.25),
                          Math.round(expenses * 0.22),
                          Math.round(expenses * 0.18),
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Monthly',
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                    data: [
                      {
                        name: 'Income',
                        data: [
                          Math.round(income * 0.08),
                          Math.round(income * 0.09),
                          Math.round(income * 0.1),
                          Math.round(income * 0.11),
                          Math.round(income * 0.12),
                          Math.round(income * 0.11),
                          Math.round(income * 0.13),
                          Math.round(income * 0.14),
                          Math.round(income * 0.12),
                        ],
                      },
                      {
                        name: 'Expenses',
                        data: [
                          Math.round(expenses * 0.08),
                          Math.round(expenses * 0.09),
                          Math.round(expenses * 0.1),
                          Math.round(expenses * 0.11),
                          Math.round(expenses * 0.12),
                          Math.round(expenses * 0.11),
                          Math.round(expenses * 0.13),
                          Math.round(expenses * 0.14),
                          Math.round(expenses * 0.12),
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Yearly',
                    categories: ['2020', '2021', '2022', '2023', '2024', '2025'],
                    data: [
                      {
                        name: 'Income',
                        data: [
                          Math.round(income * 0.5),
                          Math.round(income * 0.6),
                          Math.round(income * 0.7),
                          Math.round(income * 0.8),
                          Math.round(income * 0.9),
                          Math.round(income),
                        ],
                      },
                      {
                        name: 'Expenses',
                        data: [
                          Math.round(expenses * 0.5),
                          Math.round(expenses * 0.6),
                          Math.round(expenses * 0.7),
                          Math.round(expenses * 0.8),
                          Math.round(expenses * 0.9),
                          Math.round(expenses),
                        ],
                      },
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
