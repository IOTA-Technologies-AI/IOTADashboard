import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
// Add these Material-UI imports to your existing ones
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { InvoiceToolbar } from './invoice-toolbar';
import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

export function InvoiceDetails({ invoice }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(invoice?.status || 'draft');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const handleChangeStatus = useCallback((event) => {
    setCurrentStatus(event.target.value);
  }, []);

  // Fetch payment history
  useEffect(() => {
    if (invoice?.id) {
      fetchPaymentHistory();
    }
  }, [invoice?.id]);

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      const response = await fetch(
        `https://staging-iotaapiserver-s572.encr.app/supabaseservices.getPaymentsByReference?referenceId=${invoice.id}&referenceType=invoice`
      );
      const data = await response.json();
      setPaymentHistory(data.data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
    setLoadingPayments(false);
  };

  const renderPaymentHistory = () => {
    const totalPaid = invoice?.totalAmount - (invoice?.balance || 0);

    return (
      <Box sx={{ mt: 5 }}>
        <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Payment History</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() =>
              router.push(`/dashboard/finance/payments/new?invoiceId=${invoice.id}&type=AR`)
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
                {fCurrency(invoice?.totalAmount || 0, { currency: invoice?.currencyCode })}
              </Box>
              <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                Invoice Total
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
                {fCurrency(totalPaid || 0, { currency: invoice?.currencyCode })}
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
                color: (invoice?.balance || 0) > 0 ? 'error.darker' : 'success.darker',
                bgcolor: (invoice?.balance || 0) > 0 ? 'error.lighter' : 'success.lighter',
                height: '100%',
              }}
            >
              <Box sx={{ mb: 1, typography: 'h4' }}>
                {fCurrency(invoice?.balance || 0, { currency: invoice?.currencyCode })}
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
                  (invoice?.balance || 0) === 0
                    ? 'success.darker'
                    : totalPaid > 0
                      ? 'warning.darker'
                      : 'error.darker',
                bgcolor:
                  (invoice?.balance || 0) === 0
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
                    (invoice?.balance || 0) === 0
                      ? 'Fully Paid'
                      : totalPaid > 0
                        ? 'Partially Paid'
                        : 'Unpaid'
                  }
                  color={
                    (invoice?.balance || 0) === 0 ? 'success' : totalPaid > 0 ? 'warning' : 'error'
                  }
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
                          currency: invoice?.currencyCode,
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
    );
  };

  const renderFooter = () => (
    <Box
      sx={{
        py: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          NOTES
        </Typography>
        <Typography variant="body2">
          We appreciate your business. Should you need us to add VAT or extra notes let us know!
        </Typography>
      </div>

      <Box sx={{ flexGrow: { md: 1 }, textAlign: { md: 'right' } }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Have a question?
        </Typography>
        <Typography variant="body2">accounts@iotatechnologies.ai</Typography>
      </Box>
    </Box>
  );

  const renderList = () => (
    <Scrollbar sx={{ mt: 5 }}>
      <Table sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell sx={{ typography: 'subtitle2' }}>Description</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {invoice?.items.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>

              <TableCell>
                <Box sx={{ maxWidth: 560 }}>
                  <Typography variant="subtitle2">{row.title}</Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                    {row.description}
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>{row.quantity}</TableCell>
              <TableCell align="right">
                {fCurrency(row.price, { currency: invoice?.currencyCode })}
              </TableCell>
              <TableCell align="right">
                {fCurrency(row.price * row.quantity, { currency: invoice?.currencyCode })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );

  return (
    <>
      <InvoiceToolbar invoice={invoice} currentStatus={currentStatus || ''} />

      <Card sx={{ pt: 5, px: 5 }}>
        <Box
          sx={{
            rowGap: 5,
            display: 'grid',
            alignItems: 'flex-start',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Box
            component="img"
            alt="Invoice logo"
            src="/logo/logo-single.png"
            sx={{ width: 100, height: 'auto' }}
          />

          <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Label
              variant="soft"
              color={
                (currentStatus === 'paid' && 'success') ||
                (currentStatus === 'pending' && 'warning') ||
                (currentStatus === 'overdue' && 'error') ||
                'default'
              }
            >
              {currentStatus}
            </Label>

            <Typography variant="h6">{invoice?.invoiceNumber}</Typography>
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice from
            </Typography>
            {invoice?.invoiceFrom.name}
            <br />
            {invoice?.invoiceFrom.fullAddress + ', '}
            <br />
            {invoice?.invoiceFrom.district + ', '}
            {invoice?.invoiceFrom.city + ','}
            <br />
            {invoice?.invoiceFrom.country + ' - ' + invoice?.invoiceFrom.postalCode}
            <br />
            <br />
            Phone: {invoice?.invoiceFrom.phoneNumber}
            <br />
            Email: {invoice?.invoiceFrom.email}
            <br />
            VAT Number: {invoice?.invoiceFrom.vatNumber}
            <br />
            Registration: {invoice?.invoiceFrom.registrationNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice to
            </Typography>
            {invoice?.invoiceTo.name}
            <br />
            {invoice?.invoiceTo.fullAddress}
            <br />
            Phone: {invoice?.invoiceTo.phoneNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Date create
            </Typography>
            {fDate(invoice?.createDate)}
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Due date
            </Typography>
            {fDate(invoice?.dueDate)}
          </Stack>
        </Box>

        {renderList()}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <InvoiceTotalSummary
          vatDetails={{
            baseAmount: invoice?.subtotal || 0,
            vatAmount: invoice?.vatAmount || 0,
            vatRatePercent: invoice?.vatRate || 0,
            totalWithVAT: invoice?.totalAmount || 0,
          }}
          subtotal={invoice?.subtotal || 0}
          discount={invoice?.discount || 0}
          shipping={invoice?.shipping || 0}
          totalAmount={invoice?.totalAmount || 0}
          currencyCode={invoice?.currencyCode}
        />

        {/* 🆕 PAYMENT HISTORY SECTION */}
        {renderPaymentHistory()}

        <Divider sx={{ mt: 5, borderStyle: 'dashed' }} />

        {renderFooter()}
      </Card>
    </>
  );
}
