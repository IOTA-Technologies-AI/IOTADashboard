'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  Box,
  Card,
  Grid,
  Alert,
  Table,
  Paper,
  Button,
  Select,
  MenuItem,
  TableRow,
  Checkbox,
  TextField,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  InputLabel,
  CardContent,
  FormControl,
  TableContainer,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cheque',
  'Online Payment',
  'Other',
];

export default function NewPaymentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    paymentType: 'AR',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    paidBy: '',
    paidTo: '',
    notes: '',
    status: 'completed',
  });

  const [invoices, setInvoices] = useState([]);
  const [selectedAllocations, setSelectedAllocations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (formData.paymentType) {
      fetchOutstandingInvoices();
    }
  }, [formData.paymentType]);

  const fetchOutstandingInvoices = async () => {
    try {
      const endpoint =
        formData.paymentType === 'AR'
          ? 'supabaseservices.getInvoices'
          : 'supabaseservices.getExpenses';

      const response = await fetch(`https://staging-iotaapiserver-s572.encr.app/${endpoint}`);
      const data = await response.json();

      // Filter to show only unpaid or partially paid invoices/bills
      const outstanding = (data.data || []).filter(
        (item) => item.status !== 'paid' && parseFloat(item.balance || item.amount) > 0
      );

      setInvoices(outstanding);
    } catch (genError) {
      console.error('Error fetching invoices:', genError);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAllocationToggle = (invoice) => {
    const exists = selectedAllocations.find((a) => a.referenceId === invoice.id);

    if (exists) {
      setSelectedAllocations((prev) => prev.filter((a) => a.referenceId !== invoice.id));
    } else {
      const remainingBalance = parseFloat(invoice.balance || invoice.amount);
      setSelectedAllocations((prev) => [
        ...prev,
        {
          referenceType: formData.paymentType === 'AR' ? 'invoice' : 'bill',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber || invoice.expenseNumber || '',
          allocatedAmount: remainingBalance,
        },
      ]);
    }
  };

  const handleAllocationAmountChange = (referenceId, amount) => {
    setSelectedAllocations((prev) =>
      prev.map((allocation) =>
        allocation.referenceId === referenceId
          ? { ...allocation, allocatedAmount: parseFloat(amount) || 0 }
          : allocation
      )
    );
  };

  const getTotalAllocated = () =>
    selectedAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    const totalAllocated = getTotalAllocated();
    if (totalAllocated > parseFloat(formData.amount)) {
      setError('Total allocated amount cannot exceed payment amount');
      return;
    }

    try {
      const paymentPayload = {
        ...formData,
        amount: parseFloat(formData.amount),
        allocations: selectedAllocations,
      };

      const response = await fetch(
        'https://staging-iotaapiserver-s572.encr.app/supabaseservices.createPayment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentPayload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/finance/payments');
      }, 1500);
    } catch (genError) {
      setError(genError.message || 'Error creating payment');
      console.error('Error:', genError);
    }
  };

  const unallocatedAmount = parseFloat(formData.amount || 0) - getTotalAllocated();

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Record Payment</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Payment recorded successfully!
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Payment Details
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Type</InputLabel>
                  <Select
                    name="paymentType"
                    value={formData.paymentType}
                    label="Payment Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="AR">Accounts Receivable (Customer Payment)</MenuItem>
                    <MenuItem value="AP">Accounts Payable (Vendor Payment)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  name="paymentDate"
                  label="Payment Date"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  name="amount"
                  label="Payment Amount"
                  value={formData.amount}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    label="Payment Method"
                    onChange={handleChange}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="paidBy"
                  label={
                    formData.paymentType === 'AR' ? 'Paid By (Customer)' : 'Paid By (Your Company)'
                  }
                  value={formData.paidBy}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="paidTo"
                  label={
                    formData.paymentType === 'AR' ? 'Paid To (Your Company)' : 'Paid To (Vendor)'
                  }
                  value={formData.paidTo}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="referenceNumber"
                  label="Reference/Transaction Number"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  placeholder="Bank ref, cheque #, etc."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleChange}
                  >
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="notes"
                  label="Notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Allocation Section */}
        {formData.amount && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  Allocate to {formData.paymentType === 'AR' ? 'Invoices' : 'Bills'}
                </Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Payment Amount: ${parseFloat(formData.amount).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Allocated: ${getTotalAllocated().toFixed(2)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={unallocatedAmount < 0 ? 'error' : 'success.main'}
                    fontWeight="bold"
                  >
                    Unallocated: ${unallocatedAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>
                        {formData.paymentType === 'AR' ? 'Invoice #' : 'Bill #'}
                      </TableCell>
                      <TableCell>{formData.paymentType === 'AR' ? 'Customer' : 'Vendor'}</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">Allocate Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No outstanding {formData.paymentType === 'AR' ? 'invoices' : 'bills'}{' '}
                          found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => {
                        const isSelected = selectedAllocations.some(
                          (a) => a.referenceId === invoice.id
                        );
                        const allocation = selectedAllocations.find(
                          (a) => a.referenceId === invoice.id
                        );
                        const balance = parseFloat(invoice.balance || invoice.amount);

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleAllocationToggle(invoice)}
                              />
                            </TableCell>
                            <TableCell>{invoice.invoiceNumber || invoice.expenseNumber}</TableCell>
                            <TableCell>
                              {invoice.customerName || invoice.vendorName || '-'}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                invoice.invoiceDate || invoice.expenseDate
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">
                              ${parseFloat(invoice.total || invoice.amount).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">${balance.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              {isSelected ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={allocation?.allocatedAmount || 0}
                                  onChange={(e) =>
                                    handleAllocationAmountChange(invoice.id, e.target.value)
                                  }
                                  inputProps={{
                                    step: '0.01',
                                    min: '0',
                                    max: balance.toString(),
                                    style: { textAlign: 'right' },
                                  }}
                                  sx={{ width: 120 }}
                                />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/dashboard/finance/payments')}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!formData.amount || parseFloat(formData.amount) <= 0}
          >
            Record Payment
          </Button>
        </Box>
      </form>
    </DashboardContent>
  );
}
