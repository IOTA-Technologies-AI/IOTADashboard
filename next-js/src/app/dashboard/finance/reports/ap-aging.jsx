'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Table,
  Paper,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

export default function APAgingReport() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agingSummary, setAgingSummary] = useState({
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    over90: 0,
    total: 0,
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://staging-iotaapiserver-s572.encr.app/supabaseservices.getExpenses'
      );
      const data = await response.json();

      // Filter approved expenses that have outstanding balance
      const unpaidExpenses = (data.data || []).filter(
        (exp) =>
          exp.expenseApprovalStatus === 'approved' &&
          parseFloat(exp.expenseApprovedAmount || exp.expenseAmount) > 0
      );

      // Calculate aging based on expense date
      const today = new Date();
      const expensesWithAging = unpaidExpenses.map((expense) => {
        const expenseDate = new Date(expense.expenseDate);
        const daysOld = Math.floor((today - expenseDate) / (1000 * 60 * 60 * 24));
        return { ...expense, daysOld };
      });

      // Calculate summary
      const summary = {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      };

      expensesWithAging.forEach((exp) => {
        const amount = parseFloat(exp.expenseApprovedAmount || exp.expenseAmount);
        summary.total += amount;

        if (exp.daysOld <= 30) {
          summary.current += amount;
        } else if (exp.daysOld <= 60) {
          summary.days1to30 += amount;
        } else if (exp.daysOld <= 90) {
          summary.days31to60 += amount;
        } else if (exp.daysOld <= 120) {
          summary.days61to90 += amount;
        } else {
          summary.over90 += amount;
        }
      });

      setExpenses(expensesWithAging);
      setAgingSummary(summary);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    setLoading(false);
  };

  const getAgingBucket = (daysOld) => {
    if (daysOld <= 30) return 'Current (0-30)';
    if (daysOld <= 60) return '31-60 Days';
    if (daysOld <= 90) return '61-90 Days';
    if (daysOld <= 120) return '91-120 Days';
    return 'Over 120 Days';
  };

  const getAgingColor = (daysOld) => {
    if (daysOld <= 30) return 'success';
    if (daysOld <= 60) return 'info';
    if (daysOld <= 90) return 'warning';
    return 'error';
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Accounts Payable Aging Report</Typography>
        <Typography variant="body2" color="text.secondary">
          Outstanding vendor bills and expenses by aging period
        </Typography>
      </Box>

      {/* Aging Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'success.lighter',
            color: 'success.darker',
          }}
        >
          <Typography variant="subtitle2">0-30 Days</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.current)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'info.lighter',
            color: 'info.darker',
          }}
        >
          <Typography variant="subtitle2">31-60 Days</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.days1to30)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'warning.lighter',
            color: 'warning.darker',
          }}
        >
          <Typography variant="subtitle2">61-90 Days</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.days31to60)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'warning.lighter',
            color: 'warning.darker',
          }}
        >
          <Typography variant="subtitle2">91-120 Days</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.days61to90)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'error.lighter',
            color: 'error.darker',
          }}
        >
          <Typography variant="subtitle2">Over 120 Days</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.over90)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'primary.lighter',
            color: 'primary.darker',
          }}
        >
          <Typography variant="subtitle2">Total Outstanding</Typography>
          <Typography variant="h6">{fCurrency(agingSummary.total)}</Typography>
        </Card>
      </Box>

      {/* Detailed Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Expense ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Expense Date</TableCell>
                <TableCell>Employee/Vendor</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Days Old</TableCell>
                <TableCell>Aging Bucket</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No outstanding expenses
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id} hover>
                    <TableCell>{expense.id}</TableCell>
                    <TableCell>{expense.expenseTypeDesc}</TableCell>
                    <TableCell>{fDate(expense.expenseDate)}</TableCell>
                    <TableCell>{expense.expenseBy || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {fCurrency(expense.expenseApprovedAmount || expense.expenseAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {expense.daysOld} days
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getAgingBucket(expense.daysOld)}
                        color={getAgingColor(expense.daysOld)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={expense.expenseApprovalStatus} color="success" size="small" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
