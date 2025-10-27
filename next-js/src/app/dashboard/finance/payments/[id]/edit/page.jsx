'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import {
  Box,
  Card,
  Grid,
  Alert,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  CardContent,
  FormControl,
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

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const [formData, setFormData] = useState({
    paymentDate: '',
    amount: '',
    paymentMethod: '',
    referenceNumber: '',
    paidBy: '',
    paidTo: '',
    notes: '',
    status: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPayment();
    }
  }, [params.id]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPaymentById?id=${params.id}`
      );
      const data = await response.json();
      const payment = data.data;

      setFormData({
        paymentDate: payment.paymentDate.split('T')[0],
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || '',
        paidBy: payment.paidBy || '',
        paidTo: payment.paidTo || '',
        notes: payment.notes || '',
        status: payment.status,
      });
    } catch (err) {
      console.error('Error fetching payment:', err);
      setError('Failed to load payment');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      const response = await fetch(
        `https://staging-iotaapiserver-s572.encr.app/supabaseservices.updatePayment?id=${params.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            amount: parseFloat(formData.amount),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update payment');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/finance/payments/${params.id}`);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error updating payment');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Loading...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Edit Payment</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Payment updated successfully!
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
                    <MenuItem value="refunded">Refunded</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="paidBy"
                  label="Paid By"
                  value={formData.paidBy}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="paidTo"
                  label="Paid To"
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/dashboard/finance/payments/${params.id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!formData.amount || parseFloat(formData.amount) <= 0}
          >
            Update Payment
          </Button>
        </Box>
      </form>
    </DashboardContent>
  );
}
