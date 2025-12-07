'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useParams } from 'next/navigation';

import {
  Box,
  Card,
  Grid,
  Chip,
  Table,
  Paper,
  Stack,
  Button,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  CardContent,
  TableContainer,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = use(useParams());
  const [payment, setPayment] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPaymentDetails();
    }
  }, [params.id]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPaymentById?id=${params.id}`
      );
      const data = await response.json();
      setPayment(data.data);
      setAllocations(data.data.allocations || []);
    } catch (error) {
      console.error('Error fetching payment:', error);
    }
    setLoading(false);
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

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Loading...</Typography>
      </DashboardContent>
    );
  }

  if (!payment) {
    return (
      <DashboardContent>
        <Typography>Payment not found</Typography>
      </DashboardContent>
    );
  }

  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + parseFloat(allocation.allocatedAmount || 0),
    0
  );
  const unallocated = parseFloat(payment.amount) - totalAllocated;

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Payment Details</Typography>
          <Typography variant="body2" color="text.secondary">
            {payment.paymentNumber}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => router.push(`/dashboard/finance/payments/${payment.id}/edit`)}
          >
            Edit
          </Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/finance/payments')}>
            Back to List
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Payment Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Number
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {payment.paymentNumber}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Chip
                    label={payment.paymentType === 'AR' ? 'Customer Payment' : 'Vendor Payment'}
                    color={getTypeColor(payment.paymentType)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={payment.status}
                    color={getStatusColor(payment.status)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Paid By
                  </Typography>
                  <Typography variant="body1">{payment.paidBy || '-'}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Paid To
                  </Typography>
                  <Typography variant="body1">{payment.paidTo || '-'}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">{payment.paymentMethod}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reference Number
                  </Typography>
                  <Typography variant="body1">{payment.referenceNumber || '-'}</Typography>
                </Grid>

                {payment.notes && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">{payment.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Payment Allocations */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payment Allocations
              </Typography>

              {allocations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No allocations recorded for this payment
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Reference Type</TableCell>
                        <TableCell>Reference Number</TableCell>
                        <TableCell align="right">Allocated Amount</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocations.map((allocation, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip
                              label={allocation.referenceType}
                              size="small"
                              color={
                                allocation.referenceType === 'invoice' ? 'primary' : 'secondary'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {allocation.referenceNumber || allocation.referenceId}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              ${parseFloat(allocation.allocatedAmount).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {allocation.createdAt
                              ? new Date(allocation.createdAt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Payment Summary
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Payment Amount
                </Typography>
                <Typography variant="h4" color="primary">
                  $
                  {parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Allocated
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${totalAllocated.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Unallocated
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={unallocated > 0 ? 'warning.main' : 'success.main'}
                  >
                    ${unallocated.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              {payment.createdAt && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Created On
                    </Typography>
                    <Typography variant="body2">
                      {new Date(payment.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </>
              )}

              {payment.updatedAt && payment.updatedAt !== payment.createdAt && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(payment.updatedAt).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
