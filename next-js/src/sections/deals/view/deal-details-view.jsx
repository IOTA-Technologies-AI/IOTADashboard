'use client';

import { useEffect, useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';
import { getExpenseByExpenseId } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteDeal, payBDMCommission } from 'src/actions/deals';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = {
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'info' },
  completed: { label: 'Completed', color: 'success' },
  partially_paid: { label: 'Partially Paid', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

// ----------------------------------------------------------------------

export function DealDetailsView({ deal }) {
  const router = useRouter();
  const confirm = useBoolean();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingBDM, setIsPayingBDM] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentExpenseId, setPaymentExpenseId] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isFetchingExpense, setIsFetchingExpense] = useState(false);
  const [fetchedExpense, setFetchedExpense] = useState(null);
  const [attachedExpense, setAttachedExpense] = useState(null);
  const [attachedExpenseError, setAttachedExpenseError] = useState('');

  const currencyCode = getCurrencyCodeFromRegion(deal.region || deal.country);
  const formatCurrency = (value = 0) => fCurrency(value || 0, { currencyCode });

  const bdmTotal = deal.bdmCommissionAmount || 0;
  const bdmPaid = Math.max(
    typeof deal.bdmCommissionPaidAmount === 'number' && !Number.isNaN(deal.bdmCommissionPaidAmount)
      ? deal.bdmCommissionPaidAmount
      : deal.bdmCommissionPaid
        ? bdmTotal
        : 0,
    0
  );
  const bdmPending = Math.max(bdmTotal - bdmPaid, 0);
  const paymentStatusText = bdmPending <= 0 ? 'Paid' : bdmPaid > 0 ? 'Partial' : 'Pending';
  const paymentStatusColor = bdmPending <= 0 ? 'success' : 'warning';
  const attachedExpenseId = deal.bdmPaymentExpenseId ? String(deal.bdmPaymentExpenseId) : '';
  const trimmedExpenseInput = (paymentExpenseId || '').trim();
  const isExpenseInputNumeric = trimmedExpenseInput ? /^\d+$/.test(trimmedExpenseInput) : true;
  const isExpenseAlreadyAttached =
    attachedExpenseId && trimmedExpenseInput && trimmedExpenseInput === attachedExpenseId;
  const isAttachedExpenseNumeric = attachedExpenseId && /^\d+$/.test(attachedExpenseId);

  // Load attached expense details (if any) so we can show amount/status
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!attachedExpenseId) {
        setAttachedExpense(null);
        setAttachedExpenseError('');
        return;
      }

      if (!isAttachedExpenseNumeric) {
        setAttachedExpense(null);
        setAttachedExpenseError('');
        return;
      }

      try {
        const exp = await getExpenseByExpenseId(attachedExpenseId);
        if (!cancelled) {
          setAttachedExpense(exp || null);
          setAttachedExpenseError(exp ? '' : 'Attached expense not found.');
        }
      } catch (error) {
        console.error('Failed to load attached expense', error);
        if (!cancelled) {
          setAttachedExpense(null);
          setAttachedExpenseError('Failed to load attached expense.');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [attachedExpenseId]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteDeal(deal.id);
      toast.success('Deal deleted successfully');
      router.push(paths.dashboard.deals.root);
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    } finally {
      setIsDeleting(false);
      confirm.onFalse();
    }
  };

  const handlePayBDM = async () => {
    const trimmedExpenseId = (paymentExpenseId || '').trim();

    if (trimmedExpenseId && !/^\d+$/.test(trimmedExpenseId)) {
      toast.error('Expense ID must be numeric');
      return;
    }

    if (trimmedExpenseId && String(deal.bdmPaymentExpenseId || '') === trimmedExpenseId) {
      toast.error('This expense is already attached to this deal. Use a different expense.');
      return;
    }

    if (bdmPending <= 0) {
      toast.error('No pending commission to pay');
      return;
    }

    try {
      setIsPayingBDM(true);
      await payBDMCommission(deal.id, {
        expenseId: trimmedExpenseId || undefined,
      });
      toast.success('BDM commission marked as paid');
      router.refresh();
    } catch (error) {
      console.error('Error paying BDM commission:', error);
      toast.error(error?.message || 'Failed to pay BDM commission');
    } finally {
      setIsPayingBDM(false);
    }
  };

  const handleRecordPartialPayment = async () => {
    const amountValue = Number(paymentAmount);
    const trimmedExpenseId = (paymentExpenseId || '').trim();

    if (trimmedExpenseId && !/^\d+$/.test(trimmedExpenseId)) {
      toast.error('Expense ID must be numeric');
      return;
    }

    if (Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error('Enter a positive amount');
      return;
    }

    if (amountValue > bdmPending) {
      toast.error('Amount exceeds pending commission');
      return;
    }

    if (trimmedExpenseId && String(deal.bdmPaymentExpenseId || '') === trimmedExpenseId) {
      toast.error('This expense is already attached to this deal. Use a different expense.');
      return;
    }

    try {
      setIsRecordingPayment(true);
      await payBDMCommission(deal.id, {
        amount: amountValue,
        expenseId: trimmedExpenseId || undefined,
      });
      toast.success('Partial payment recorded');
      setPaymentAmount('');
      router.refresh();
    } catch (error) {
      console.error('Error recording partial BDM payment:', error);
      toast.error(error?.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleFetchExpense = async () => {
    const trimmed = (paymentExpenseId || '').trim();
    if (!trimmed) {
      toast.error('Enter an expense ID');
      return;
    }

    const numericId = Number(trimmed);
    if (Number.isNaN(numericId) || numericId <= 0) {
      toast.error('Expense ID must be a positive number');
      return;
    }

    setIsFetchingExpense(true);
    try {
      const expense = await getExpenseByExpenseId(trimmed);
      setFetchedExpense(expense || null);

      const expenseAmount = Number(
        expense?.expenseAmount ??
          expense?.expenseApprovedAmount ??
          expense?.originalExpenseAmount ??
          0
      );
      const pending = Math.max(bdmPending, 0);
      if (expenseAmount > 0 && pending > 0) {
        setPaymentAmount(String(Math.min(expenseAmount, pending)));
      }

      toast.success('Expense fetched');
    } catch (error) {
      console.error('Failed to fetch expense', error);
      setFetchedExpense(null);
      toast.error('Expense not found');
    } finally {
      setIsFetchingExpense(false);
    }
  };

  const renderHeader = (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <CustomBreadcrumbs
        heading={deal.dealName}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: deal.dealNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => router.push(paths.dashboard.deals.edit(deal.id))}
            >
              Edit
            </Button>
            <Button
              variant="soft"
              color="error"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              onClick={confirm.onTrue}
            >
              Delete
            </Button>
          </Stack>
        }
      />

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography variant="h5">{deal.dealNumber}</Typography>
        <Label color={STATUS_OPTIONS[deal.status]?.color || 'default'}>
          {STATUS_OPTIONS[deal.status]?.label || deal.status}
        </Label>
        {deal.region && <Chip label={deal.region} size="small" variant="soft" color="primary" />}
      </Stack>
    </Stack>
  );

  const renderOverview = (
    <Card>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">Deal Overview</Typography>

        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:calendar-bold-duotone" width={20} />
                <Typography variant="subtitle2">Deal Date:</Typography>
              </Stack>
              <Typography variant="body2">{fDate(deal.dealDate)}</Typography>
            </Stack>
          </Grid>

          {deal.customerId && (
            <Grid xs={12} md={6}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:user-bold-duotone" width={20} />
                  <Typography variant="subtitle2">Customer ID:</Typography>
                </Stack>
                <Typography variant="body2">{deal.customerId}</Typography>
              </Stack>
            </Grid>
          )}

          {deal.notes && (
            <Grid xs={12}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:notes-bold-duotone" width={20} />
                  <Typography variant="subtitle2">Notes:</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {deal.notes}
                </Typography>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Stack>
    </Card>
  );

  const renderInvoices = (
    <Card>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">Associated Invoices</Typography>

        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:document-text-bold-duotone" width={24} color="info.main" />
                  <Typography variant="subtitle2">AR Invoice (Selling)</Typography>
                </Stack>
                {deal.arInvoiceNumber ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Invoice #: {deal.arInvoiceNumber}
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(deal.arInvoiceAmount)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No AR invoice linked
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>

          <Grid xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:document-text-bold-duotone" width={24} color="error.main" />
                  <Typography variant="subtitle2">AP Invoice (Buying)</Typography>
                </Stack>
                {deal.apInvoiceNumber ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Invoice #: {deal.apInvoiceNumber}
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {formatCurrency(deal.apInvoiceAmount)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No AP invoice linked
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );

  const renderProfitCalculation = (
    <Card>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">Profit Breakdown</Typography>

        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Revenue (AR):
            </Typography>
            <Typography variant="subtitle1" color="info.main">
              {formatCurrency(deal.arInvoiceAmount || 0)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Cost (AP):
            </Typography>
            <Typography variant="subtitle1" color="error.main">
              -{formatCurrency(deal.apInvoiceAmount || 0)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Gross Profit:</Typography>
            <Typography variant="h6" color="success.main">
              {formatCurrency(deal.grossProfit || 0)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Net Profit Before BDM:</Typography>
            <Typography variant="h6" color="success.main">
              {formatCurrency(deal.netProfitBeforeBDM || 0)}
            </Typography>
          </Stack>

          {deal.bdmId && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  BDM Commission:
                </Typography>
                <Typography variant="subtitle1" color="warning.main">
                  -{formatCurrency(deal.bdmCommissionAmount || 0)}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Final Net Profit:</Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(deal.netProfitAfterBDM || 0)}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </Stack>
    </Card>
  );

  const renderBDM = deal.bdmId && (
    <Card>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="h6">BDM Commission</Typography>

        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              BDM Name:
            </Typography>
            <Typography variant="subtitle2">{deal.bdmName}</Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Commission Type:
            </Typography>
            <Chip
              label={deal.bdmCommissionType === 'fixed' ? 'Fixed Amount' : 'Percentage'}
              size="small"
              variant="soft"
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Commission Value:
            </Typography>
            <Typography variant="subtitle2">
              {deal.bdmCommissionType === 'fixed'
                ? formatCurrency(deal.bdmCommissionValue)
                : `${deal.bdmCommissionValue}%`}
            </Typography>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Commission Amount:</Typography>
            <Typography variant="h6" color="warning.main">
              {formatCurrency(bdmTotal)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Paid to Date:
            </Typography>
            <Typography variant="subtitle2" color="success.main">
              {bdmPaid > 0 ? formatCurrency(bdmPaid) : '-'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Pending:
            </Typography>
            <Typography variant="subtitle2" color="warning.dark">
              {bdmPending > 0 ? formatCurrency(bdmPending) : '0'}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Payment Status:
            </Typography>
            <Label color={paymentStatusColor}>{paymentStatusText}</Label>
          </Stack>

          {attachedExpenseId && isAttachedExpenseNumeric && (
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Attached Expense:
                </Typography>
                <Typography variant="subtitle2" color="text.primary">
                  {attachedExpenseId}
                </Typography>
              </Stack>

              {attachedExpense && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Amount / Status:
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(
                      attachedExpense.expenseAmount ||
                        attachedExpense.expenseApprovedAmount ||
                        attachedExpense.originalExpenseAmount ||
                        0
                    )}
                    {attachedExpense.expenseApprovalStatus
                      ? ` • ${String(attachedExpense.expenseApprovalStatus)}`
                      : ''}
                  </Typography>
                </Stack>
              )}
              {!attachedExpense && attachedExpenseError && (
                <Typography variant="caption" color="text.secondary" textAlign="right">
                  {attachedExpenseError}
                </Typography>
              )}
            </Stack>
          )}

          {deal.bdmPaymentDate && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Payment Date:
              </Typography>
              <Typography variant="body2">{fDate(deal.bdmPaymentDate)}</Typography>
            </Stack>
          )}

          {bdmPending > 0 && (
            <Stack spacing={1.5}>
              <Divider />

              <Typography variant="subtitle2">Record BDM Payment</Typography>

              <TextField
                label="Amount"
                type="number"
                size="small"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
              />

              <TextField
                label="Expense ID (optional)"
                size="small"
                value={paymentExpenseId}
                onChange={(event) => setPaymentExpenseId(event.target.value)}
                error={
                  isExpenseAlreadyAttached ||
                  (!isExpenseInputNumeric && Boolean(trimmedExpenseInput))
                }
                helperText={
                  isExpenseAlreadyAttached
                    ? 'This expense is already attached to this deal. Use a different expense.'
                    : attachedExpenseId && isAttachedExpenseNumeric
                      ? `Current attached expense: ${attachedExpenseId}`
                      : !isExpenseInputNumeric && Boolean(trimmedExpenseInput)
                        ? 'Expense ID must be numeric'
                        : ''
                }
                InputProps={{
                  endAdornment:
                    attachedExpenseId && isAttachedExpenseNumeric && !isExpenseAlreadyAttached ? (
                      <Typography variant="caption" color="text.secondary" sx={{ pr: 1 }}>
                        {attachedExpense
                          ? formatCurrency(
                              attachedExpense.expenseAmount ||
                                attachedExpense.expenseApprovedAmount ||
                                attachedExpense.originalExpenseAmount ||
                                0
                            )
                          : 'Attached'}
                      </Typography>
                    ) : undefined,
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                <LoadingButton
                  variant="outlined"
                  color="info"
                  loading={isFetchingExpense}
                  onClick={handleFetchExpense}
                  startIcon={<Iconify icon="solar:search-bold" />}
                  sx={{ minWidth: 180 }}
                >
                  Fetch Expense
                </LoadingButton>

                {fetchedExpense && (
                  <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      Amount:{' '}
                      {formatCurrency(
                        fetchedExpense.expenseAmount ||
                          fetchedExpense.expenseApprovedAmount ||
                          fetchedExpense.originalExpenseAmount ||
                          0
                      )}
                    </Typography>
                    {fetchedExpense.expenseApprovalStatus && (
                      <Typography variant="caption" color="text.secondary">
                        Status: {String(fetchedExpense.expenseApprovalStatus)}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>

              <Stack direction="row" spacing={1}>
                <LoadingButton
                  fullWidth
                  variant="outlined"
                  color="warning"
                  loading={isRecordingPayment}
                  onClick={handleRecordPartialPayment}
                  startIcon={<Iconify icon="solar:coins-bold" />}
                >
                  Add Partial Payment
                </LoadingButton>

                <LoadingButton
                  fullWidth
                  variant="contained"
                  color="warning"
                  loading={isPayingBDM}
                  onClick={handlePayBDM}
                  startIcon={<Iconify icon="solar:wallet-money-bold" />}
                >
                  Pay Remaining
                </LoadingButton>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <DashboardContent>
      {renderHeader}

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            {renderOverview}
            {renderInvoices}
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            {renderProfitCalculation}
            {renderBDM}
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete Deal"
        content="Are you sure you want to delete this deal? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        }
      />
    </DashboardContent>
  );
}

function getCurrencyCodeFromRegion(region) {
  const value = (region || '').toString().toLowerCase();

  if (value.includes('uae') || value === 'ae' || value.includes('united arab emirates')) {
    return 'AED';
  }

  if (value.includes('ksa') || value.includes('saudi') || value === 'sa') {
    return 'SAR';
  }

  return 'USD';
}
