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

export default function ARAgingReport() {
  const [invoices, setInvoices] = useState([]);
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
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://staging-iotaapiserver-s572.encr.app/supabaseservices.getInvoices'
      );
      const data = await response.json();
      const unpaidInvoices = (data.data || []).filter((inv) => parseFloat(inv.balance) > 0);

      // Calculate aging
      const today = new Date();
      const invoicesWithAging = unpaidInvoices.map((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return { ...invoice, daysOverdue };
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

      invoicesWithAging.forEach((inv) => {
        const balance = parseFloat(inv.balance);
        summary.total += balance;

        if (inv.daysOverdue <= 0) {
          summary.current += balance;
        } else if (inv.daysOverdue <= 30) {
          summary.days1to30 += balance;
        } else if (inv.daysOverdue <= 60) {
          summary.days31to60 += balance;
        } else if (inv.daysOverdue <= 90) {
          summary.days61to90 += balance;
        } else {
          summary.over90 += balance;
        }
      });

      setInvoices(invoicesWithAging);
      setAgingSummary(summary);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
    setLoading(false);
  };

  const getAgingBucket = (daysOverdue) => {
    if (daysOverdue <= 0) return 'Current';
    if (daysOverdue <= 30) return '1-30 Days';
    if (daysOverdue <= 60) return '31-60 Days';
    if (daysOverdue <= 90) return '61-90 Days';
    return 'Over 90 Days';
  };

  const getAgingColor = (daysOverdue) => {
    if (daysOverdue <= 0) return 'success';
    if (daysOverdue <= 30) return 'info';
    if (daysOverdue <= 60) return 'warning';
    return 'error';
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Accounts Receivable Aging Report</Typography>
        <Typography variant="body2" color="text.secondary">
          Outstanding customer invoices by aging period
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
          <Typography variant="subtitle2">Current</Typography>
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
          <Typography variant="subtitle2">1-30 Days</Typography>
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
          <Typography variant="subtitle2">31-60 Days</Typography>
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
          <Typography variant="subtitle2">61-90 Days</Typography>
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
          <Typography variant="subtitle2">Over 90 Days</Typography>
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
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Invoice Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell>Days Overdue</TableCell>
                <TableCell>Aging Bucket</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No outstanding invoices
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{fDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>{fDate(invoice.dueDate)}</TableCell>
                    <TableCell align="right">{fCurrency(invoice.total)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {fCurrency(invoice.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={invoice.daysOverdue > 0 ? 'error' : 'success.main'}
                      >
                        {invoice.daysOverdue > 0 ? invoice.daysOverdue : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getAgingBucket(invoice.daysOverdue)}
                        color={getAgingColor(invoice.daysOverdue)}
                        size="small"
                      />
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
