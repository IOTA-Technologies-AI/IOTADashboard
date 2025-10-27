'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fNumber, fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ExpenseDetails({ expense }) {
  const router = useRouter();
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Fetch payment history for this expense/bill
  useEffect(() => {
    if (expense?.id) {
      fetchPaymentHistory();
    }
  }, [expense?.id]);

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      const response = await fetch(
        `https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPaymentsByReference?referenceId=${expense.id}&referenceType=bill`
      );
      const data = await response.json();
      setPaymentHistory(data.data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
    setLoadingPayments(false);
  };

  const renderPaymentHistory = () => {
    const approvedAmount = expense?.expenseApprovedAmount || expense?.expenseAmount || 0;
    const totalPaid = paymentHistory.reduce(
      (sum, payment) => sum + parseFloat(payment.allocatedAmount || payment.amount || 0),
      0
    );
    const balance = approvedAmount - totalPaid;

    return (
      <Card sx={{ mt: 3 }}>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Typography variant="h6">Payment History</Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() =>
                router.push(`/dashboard/finance/payments/new?billId=${expense.id}&type=AP`)
              }
            >
              Record Payment
            </Button>
          </Box>

          {/* Payment Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  p: 3,
                  boxShadow: 'none',
                  textAlign: 'center',
                  color: 'primary.darker',
                  bgcolor: 'primary.lighter',
                  height: '100%',
                }}
              >
                <Box sx={{ mb: 1, typography: 'h4' }}>
                  {fCurrency(approvedAmount, { currency: expense?.expenseCurrency || 'SAR' })}
                </Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                  Approved Amount
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  p: 3,
                  boxShadow: 'none',
                  textAlign: 'center',
                  color: 'success.darker',
                  bgcolor: 'success.lighter',
                  height: '100%',
                }}
              >
                <Box sx={{ mb: 1, typography: 'h4' }}>
                  {fCurrency(totalPaid, { currency: expense?.expenseCurrency || 'SAR' })}
                </Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                  Total Paid
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  p: 3,
                  boxShadow: 'none',
                  textAlign: 'center',
                  color: balance > 0 ? 'error.darker' : 'success.darker',
                  bgcolor: balance > 0 ? 'error.lighter' : 'success.lighter',
                  height: '100%',
                }}
              >
                <Box sx={{ mb: 1, typography: 'h4' }}>
                  {fCurrency(balance, { currency: expense?.expenseCurrency || 'SAR' })}
                </Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                  Balance Due
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  p: 3,
                  boxShadow: 'none',
                  textAlign: 'center',
                  color:
                    balance === 0
                      ? 'success.darker'
                      : totalPaid > 0
                        ? 'warning.darker'
                        : 'error.darker',
                  bgcolor:
                    balance === 0
                      ? 'success.lighter'
                      : totalPaid > 0
                        ? 'warning.lighter'
                        : 'error.lighter',
                  height: '100%',
                }}
              >
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={
                      balance === 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid'
                    }
                    color={balance === 0 ? 'success' : totalPaid > 0 ? 'warning' : 'error'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                  Payment Status
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Payment History Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Payment #</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPayments ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : paymentHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No payments recorded yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentHistory.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{fDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {payment.paymentNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {fCurrency(payment.allocatedAmount || payment.amount, {
                            currency: expense?.expenseCurrency || 'SAR',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          color={payment.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.referenceNumber || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(
                              `/dashboard/finance/payments/${payment.paymentId || payment.id}`
                            )
                          }
                        >
                          <Iconify icon="solar:eye-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Card>
    );
  };

  const renderInfo = (
    <Card sx={{ pt: 5, px: 5 }}>
      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense Type
          </Typography>
          <Typography variant="body2">{expense?.expenseTypeDesc || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            ID
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {expense?.id || 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Employee Related
          </Typography>
          <Label
            variant="soft"
            color={expense?.isEmployeeRelated ? 'info' : 'default'}
            sx={{ width: 'fit-content' }}
          >
            {expense?.isEmployeeRelated ? 'Yes' : 'No'}
          </Label>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense Date
          </Typography>
          <Typography variant="body2">
            {expense?.expenseDate ? fDate(expense.expenseDate) : 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Amount
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            {fNumber(expense?.expenseAmount || 0)} {expense?.expenseCurrency || 'SAR'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense By (Employee ID)
          </Typography>
          <Typography variant="body2">{expense?.expenseBy || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            External Transaction ID
          </Typography>
          <Typography variant="body2">{expense?.externalTransactionId || 'N/A'}</Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approval Status
          </Typography>
          <Label
            variant="soft"
            color={
              (expense?.expenseApprovalStatus === 'approved' && 'success') ||
              (expense?.expenseApprovalStatus === 'pending' && 'warning') ||
              (expense?.expenseApprovalStatus === 'rejected' && 'error') ||
              'default'
            }
            sx={{ width: 'fit-content', textTransform: 'capitalize' }}
          >
            {expense?.expenseApprovalStatus || 'Pending'}
          </Label>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved By
          </Typography>
          <Typography variant="body2">{expense?.expenseApprovedBy || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved Date
          </Typography>
          <Typography variant="body2">
            {expense?.expenseApprovedDate ? fDate(expense.expenseApprovedDate) : 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved Amount
          </Typography>
          <Typography variant="body2">
            {expense?.expenseApprovedAmount
              ? `${fNumber(expense.expenseApprovedAmount)} ${expense?.expenseCurrency || 'SAR'}`
              : 'N/A'}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Original Transaction Date
          </Typography>
          <Typography variant="body2">
            {expense?.originalTransactionDate ? fDate(expense.originalTransactionDate) : 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Settlement Notes
          </Typography>
          <Typography variant="body2">{expense?.expenseSettlementNotes || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1} sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Receipt URL
          </Typography>
          {expense?.fileLocation ? (
            <Box
              component="a"
              href={expense.fileLocation}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                wordBreak: 'break-all',
              }}
            >
              {expense.fileLocation}
            </Box>
          ) : (
            <Typography variant="body2">N/A</Typography>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Reference ID
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {expense?.referenceId || 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Created At
          </Typography>
          <Typography variant="body2">
            {expense?.createdAt ? fDate(expense.createdAt) : 'N/A'}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );

  const renderActions = (
    <Card sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Button
          fullWidth
          size="small"
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="solar:pen-bold" width={18} />}
          component={RouterLink}
          href={paths.dashboard.expense.edit(expense?.referenceId)}
        >
          Edit
        </Button>

        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => router.back()}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
        >
          Back
        </Button>
      </Stack>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 9 }}>
        {renderInfo}
        {/* 🆕 PAYMENT HISTORY */}
        {renderPaymentHistory()}
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Box sx={{ position: 'sticky', top: 100, zIndex: 10 }}>{renderActions}</Box>
      </Grid>
    </Grid>
  );
}
