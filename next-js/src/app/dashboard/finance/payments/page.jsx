'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  Box,
  Card,
  Chip,
  Table,
  Stack,
  Button,
  Select,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  IconButton,
  InputLabel,
  FormControl,
  TableContainer,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
      setPayments(data.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await fetch(
          `https://staging-iotaapiserver-s572.encr.app/supabaseservices.deletePayment?id=${id}`,
          {
            method: 'DELETE',
          }
        );
        fetchPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

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

  const filteredPayments = payments.filter(
    (payment) =>
      payment.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paidBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paidTo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Payments</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push('/dashboard/finance/payments/new')}
        >
          Record Payment
        </Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Payment Type</InputLabel>
            <Select
              value={filterType}
              label="Payment Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Payments</MenuItem>
              <MenuItem value="AR">Accounts Receivable (Customer Payments)</MenuItem>
              <MenuItem value="AP">Accounts Payable (Vendor Payments)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Search"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by payment number, reference, payer..."
            sx={{ flexGrow: 1 }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment #</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Paid By / To</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>{payment.paymentNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.paymentType}
                        color={getTypeColor(payment.paymentType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {payment.paymentType === 'AR' ? payment.paidBy : payment.paidTo}
                    </TableCell>
                    <TableCell>{payment.referenceNumber || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        $
                        {parseFloat(payment.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={getStatusColor(payment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/dashboard/finance/payments/${payment.id}`)}
                        >
                          <Iconify icon="solar:eye-bold" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(`/dashboard/finance/payments/${payment.id}/edit`)
                          }
                        >
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(payment.id)}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </Stack>
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
