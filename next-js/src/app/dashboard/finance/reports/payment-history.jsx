'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Table,
  Paper,
  Stack,
  Select,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  TableContainer,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

export default function PaymentHistoryReport() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState({
    totalAR: 0,
    totalAP: 0,
    totalCompleted: 0,
    totalPending: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [filterType]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url =
        filterType === 'all'
          ? 'https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPayments'
          : `https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPaymentsByType?paymentType=${filterType}`;

      const response = await fetch(url);
      const data = await response.json();
      const allPayments = data.data || [];

      // Calculate summary
      const sum = {
        totalAR: 0,
        totalAP: 0,
        totalCompleted: 0,
        totalPending: 0,
        grandTotal: 0,
      };

      allPayments.forEach((payment) => {
        const amount = parseFloat(payment.amount);
        sum.grandTotal += amount;

        if (payment.paymentType === 'AR') {
          sum.totalAR += amount;
        } else {
          sum.totalAP += amount;
        }

        if (payment.status === 'completed') {
          sum.totalCompleted += amount;
        } else {
          sum.totalPending += amount;
        }
      });

      setPayments(allPayments);
      setSummary(sum);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
    setLoading(false);
  };

  const filteredPayments = payments.filter((payment) => {
    // Filter by status
    if (filterStatus !== 'all' && payment.status !== filterStatus) {
      return false;
    }

    // Filter by date range
    if (dateFrom && new Date(payment.paymentDate) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && new Date(payment.paymentDate) > new Date(dateTo)) {
      return false;
    }

    return true;
  });

  const getStatusColor = (status) => {
    const colors = {
      completed: 'success',
      pending: 'warning',
      failed: 'error',
      refunded: 'info',
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => (type === 'AR' ? 'primary' : 'secondary');

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Payment History Report</Typography>
        <Typography variant="body2" color="text.secondary">
          Complete history of all payments (AR & AP)
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
          <Typography variant="subtitle2">Total AR Payments</Typography>
          <Typography variant="h6">{fCurrency(summary.totalAR)}</Typography>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: 150,
            p: 2,
            textAlign: 'center',
            bgcolor: 'secondary.lighter',
            color: 'secondary.darker',
          }}
        >
          <Typography variant="subtitle2">Total AP Payments</Typography>
          <Typography variant="h6">{fCurrency(summary.totalAP)}</Typography>
        </Card>

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
          <Typography variant="subtitle2">Completed Payments</Typography>
          <Typography variant="h6">{fCurrency(summary.totalCompleted)}</Typography>
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
          <Typography variant="subtitle2">Pending Payments</Typography>
          <Typography variant="h6">{fCurrency(summary.totalPending)}</Typography>
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
          <Typography variant="subtitle2">Grand Total</Typography>
          <Typography variant="h6">{fCurrency(summary.grandTotal)}</Typography>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Payment Type</InputLabel>
            <Select
              value={filterType}
              label="Payment Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="AR">Accounts Receivable (AR)</MenuItem>
              <MenuItem value="AP">Accounts Payable (AP)</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>

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
        </Stack>
      </Card>

      {/* Payment Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment Date</TableCell>
                <TableCell>Payment #</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Paid By/To</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>{fDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {payment.paymentNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.paymentType}
                        color={getTypeColor(payment.paymentType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {payment.paymentType === 'AR' ? payment.paidBy : payment.paidTo}
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {fCurrency(payment.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={getStatusColor(payment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.referenceNumber || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredPayments.length} of {payments.length} payments
        </Typography>
      </Box>
    </DashboardContent>
  );
}
