'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Grid,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  TableContainer,
} from '@mui/material';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

export default function ExpenseByCategoryReport() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [employeeBreakdown, setEmployeeBreakdown] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

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
      setExpenses(data.data || []);
      processExpenses(data.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    setLoading(false);
  };

  const processExpenses = (allExpenses) => {
    // Filter by date if set
    let filtered = allExpenses;
    if (dateFrom) {
      filtered = filtered.filter((exp) => new Date(exp.expenseDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((exp) => new Date(exp.expenseDate) <= new Date(dateTo));
    }

    // Calculate total
    const total = filtered.reduce((sum, exp) => sum + parseFloat(exp.expenseAmount || 0), 0);
    setTotalExpenses(total);

    // Group by category
    const categoryMap = {};
    filtered.forEach((exp) => {
      const category = exp.expenseTypeDesc || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { category, total: 0, count: 0 };
      }
      categoryMap[category].total += parseFloat(exp.expenseAmount || 0);
      categoryMap[category].count += 1;
    });

    const categoryArray = Object.values(categoryMap)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    setCategoryBreakdown(categoryArray);

    // Group by employee
    const employeeMap = {};
    filtered
      .filter((exp) => exp.isEmployeeRelated)
      .forEach((exp) => {
        const employee = exp.expenseBy || 'Unknown';
        if (!employeeMap[employee]) {
          employeeMap[employee] = { employee, total: 0, count: 0 };
        }
        employeeMap[employee].total += parseFloat(exp.expenseAmount || 0);
        employeeMap[employee].count += 1;
      });

    const employeeArray = Object.values(employeeMap).sort((a, b) => b.total - a.total);
    setEmployeeBreakdown(employeeArray);
  };

  useEffect(() => {
    if (expenses.length > 0) {
      processExpenses(expenses);
    }
  }, [dateFrom, dateTo]);

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Expense Analysis Report</Typography>
        <Typography variant="body2" color="text.secondary">
          Breakdown of expenses by category and employee
        </Typography>
      </Box>

      {/* Date Filters */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Typography variant="h6" color="primary">
              Total: {fCurrency(totalExpenses)}
            </Typography>
          </Box>
        </Box>
      </Card>

      <Grid container spacing={3}>
        {/* Expense by Category */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Expenses by Category</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : categoryBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryBreakdown.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.category}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={item.count} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {fCurrency(item.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {item.percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Expense by Employee */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Expenses by Employee</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee ID</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : employeeBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No employee expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeBreakdown.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.employee}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={item.count} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {fCurrency(item.total)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
