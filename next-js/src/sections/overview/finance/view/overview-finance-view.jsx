// /Users/jaffar/Desktop/Desktop - Jaffar's MacBook Pro 14/IOTA Git/IOTA Dashboard/next-js/src/sections/overview/finance/view/overview-finance-view.jsx

import Grid from '@mui/material/Grid';

import { _bankingRecentTransitions } from 'src/_mock';

import { FinanceReports } from './finance-reports';
import { FinanceOverview } from './finance-overview';
import { FinanceQuickActions } from './finance-quick-actions';
import { FinanceCurrentBalance } from './finance-current-balance';
import { FinanceExpenseCategories } from './finance-expense-categories';
import { FinanceCashFlowStatistics } from './finance-cashflow-statistics';
import { FinanceRecentTransactions } from './finance-recent-transactions';

// ----------------------------------------------------------------------

export function OverviewFinanceView() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7} lg={8}>
        <FinanceOverview
          title="Cash Flow Overview"
          subheader="Monthly cash flow analysis"
          chart={{
            categories: [
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
            ],
            colors: [
              ['#22C55E', '#16A34A'],
              ['#EF4444', '#DC2626'],
            ],
            series: [
              {
                name: 'Revenue',
                data: [
                  { name: 'Jan', data: 120000 },
                  { name: 'Feb', data: 135000 },
                  { name: 'Mar', data: 148000 },
                  { name: 'Apr', data: 152000 },
                  { name: 'May', data: 165000 },
                  { name: 'Jun', data: 178000 },
                  { name: 'Jul', data: 185000 },
                  { name: 'Aug', data: 192000 },
                  { name: 'Sep', data: 198000 },
                  { name: 'Oct', data: 205000 },
                  { name: 'Nov', data: 212000 },
                  { name: 'Dec', data: 225000 },
                ],
              },
              {
                name: 'Expenses',
                data: [
                  { name: 'Jan', data: 85000 },
                  { name: 'Feb', data: 92000 },
                  { name: 'Mar', data: 98000 },
                  { name: 'Apr', data: 105000 },
                  { name: 'May', data: 112000 },
                  { name: 'Jun', data: 118000 },
                  { name: 'Jul', data: 125000 },
                  { name: 'Aug', data: 132000 },
                  { name: 'Sep', data: 138000 },
                  { name: 'Oct', data: 145000 },
                  { name: 'Nov', data: 152000 },
                  { name: 'Dec', data: 158000 },
                ],
              },
            ],
          }}
        />
      </Grid>

      <Grid item xs={12} md={5} lg={4}>
        <FinanceCurrentBalance title="Current Balance" currentBalance={187650} sentAmount={25500} />
      </Grid>

      <Grid item xs={12} md={7} lg={8}>
        <FinanceCashFlowStatistics
          title="Cash Flow Statistics"
          subheader="Overview of financial metrics"
          chart={{
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
            colors: [['#22C55E', '#16A34A']],
            series: [
              {
                name: 'AR Balance',
                data: [145000, 152000, 148000, 165000, 172000, 185000, 192000, 205000],
              },
              {
                name: 'AP Balance',
                data: [98000, 105000, 102000, 112000, 118000, 125000, 132000, 145000],
              },
              { name: 'Net Cash', data: [47000, 47000, 46000, 53000, 54000, 60000, 60000, 60000] },
            ],
          }}
        />
      </Grid>

      <Grid item xs={12} md={5} lg={4}>
        <FinanceQuickActions />
      </Grid>

      <Grid item xs={12} md={7} lg={8}>
        <FinanceExpenseCategories
          title="Expenses by Category"
          chart={{
            series: [
              { label: 'Payroll', value: 125000 },
              { label: 'Office Rent', value: 35000 },
              { label: 'Utilities', value: 12000 },
              { label: 'Marketing', value: 28000 },
              { label: 'Software', value: 18000 },
              { label: 'Travel', value: 15000 },
              { label: 'Supplies', value: 8000 },
              { label: 'Other', value: 12000 },
            ],
            colors: [
              ['#8B5CF6', '#7C3AED'],
              ['#3B82F6', '#2563EB'],
              ['#10B981', '#059669'],
              ['#F59E0B', '#D97706'],
              ['#EF4444', '#DC2626'],
              ['#EC4899', '#DB2777'],
              ['#6366F1', '#4F46E5'],
              ['#64748B', '#475569'],
            ],
          }}
        />
      </Grid>

      <Grid item xs={12} md={5} lg={4}>
        <FinanceReports />
      </Grid>

      <Grid item xs={12}>
        <FinanceRecentTransactions
          title="Recent Transactions"
          tableData={_bankingRecentTransitions}
          headCells={[
            { id: 'description', label: 'Description' },
            { id: 'date', label: 'Date' },
            { id: 'amount', label: 'Amount' },
            { id: 'status', label: 'Status' },
            { id: '' },
          ]}
        />
      </Grid>
    </Grid>
  );
}
