'use client';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';
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
import { Scrollbar } from 'src/components/scrollbar';
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
  const theme = useTheme();
  const router = useRouter();
  const confirm = useBoolean();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingBDM, setIsPayingBDM] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentExpenseId, setPaymentExpenseId] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isFetchingExpense, setIsFetchingExpense] = useState(false);
  const [fetchedExpense, setFetchedExpense] = useState(null);

  const currencyCode = getCurrencyCodeFromRegion(deal.region || deal.country);
  const fmt = (v = 0) => fCurrency(v || 0, { currencyCode });

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
  const paymentProgressPct = bdmTotal > 0 ? Math.min((bdmPaid / bdmTotal) * 100, 100) : 0;
  const paymentStatusText =
    bdmPending <= 0 ? 'Fully Paid' : bdmPaid > 0 ? 'Partially Paid' : 'Pending';
  const paymentStatusColor = bdmPending <= 0 ? 'success' : bdmPaid > 0 ? 'warning' : 'default';
  const trimmedExpenseInput = (paymentExpenseId || '').trim();
  const isExpenseInputNumeric = trimmedExpenseInput ? /^\d+$/.test(trimmedExpenseInput) : true;

  // Support both new history array and legacy single-payment fields
  const paymentHistory =
    Array.isArray(deal.bdmPaymentHistory) && deal.bdmPaymentHistory.length > 0
      ? deal.bdmPaymentHistory
      : bdmPaid > 0
        ? [
            {
              amount: bdmPaid,
              date: deal.bdmPaymentDate,
              expenseId: deal.bdmPaymentExpenseId || null,
              paidAfter: bdmPaid,
            },
          ]
        : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    const trimmedId = trimmedExpenseInput;
    if (trimmedId && !/^\d+$/.test(trimmedId)) {
      toast.error('Expense ID must be numeric');
      return;
    }
    if (bdmPending <= 0) {
      toast.error('No pending commission to pay');
      return;
    }
    try {
      setIsPayingBDM(true);
      await payBDMCommission(deal.id, { expenseId: trimmedId || undefined });
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
    const trimmedId = trimmedExpenseInput;
    if (trimmedId && !/^\d+$/.test(trimmedId)) {
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
    try {
      setIsRecordingPayment(true);
      await payBDMCommission(deal.id, { amount: amountValue, expenseId: trimmedId || undefined });
      toast.success('Partial payment recorded');
      setPaymentAmount('');
      setPaymentExpenseId('');
      setFetchedExpense(null);
      router.refresh();
    } catch (error) {
      console.error('Error recording partial BDM payment:', error);
      toast.error(error?.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleFetchExpense = async () => {
    const trimmed = trimmedExpenseInput;
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
      const expAmt = Number(
        expense?.expenseAmount ??
          expense?.expenseApprovedAmount ??
          expense?.originalExpenseAmount ??
          0
      );
      if (expAmt > 0 && bdmPending > 0) setPaymentAmount(String(Math.min(expAmt, bdmPending)));
      toast.success('Expense fetched');
    } catch (error) {
      console.error('Failed to fetch expense', error);
      setFetchedExpense(null);
      toast.error('Expense not found');
    } finally {
      setIsFetchingExpense(false);
    }
  };

  // ── KPI Strip ─────────────────────────────────────────────────────────────

  const kpiItems = [
    {
      label: 'Revenue (AR)',
      value: fmt(deal.arInvoiceAmount),
      icon: 'solar:arrow-up-bold-duotone',
      color: 'info',
    },
    {
      label: 'Cost (AP)',
      value: fmt(deal.apInvoiceAmount),
      icon: 'solar:arrow-down-bold-duotone',
      color: 'error',
    },
    {
      label: 'Gross Profit',
      value: fmt(deal.grossProfit),
      icon: 'solar:chart-2-bold-duotone',
      color: 'success',
    },
    {
      label: 'Net Profit',
      value: fmt(deal.netProfitAfterBDM),
      icon: 'solar:dollar-minimalistic-bold-duotone',
      color: 'primary',
    },
  ];

  const renderKpiStrip = (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {kpiItems.map((item) => (
        <Grid xs={12} sm={6} md={3} key={item.label}>
          <Card sx={{ display: 'flex', alignItems: 'center', p: 3, gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: varAlpha(theme.vars.palette[item.color].mainChannel, 0.08),
              }}
            >
              <Iconify icon={item.icon} width={26} sx={{ color: `${item.color}.main` }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                {item.label}
              </Typography>
              <Typography variant="h5">{item.value}</Typography>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ── Invoices Card ─────────────────────────────────────────────────────────

  const renderInvoices = (
    <Card>
      <Stack sx={{ px: 3, pt: 3, pb: 2 }} direction="row" alignItems="center" spacing={1}>
        <Iconify
          icon="solar:document-text-bold-duotone"
          width={22}
          sx={{ color: 'text.secondary' }}
        />
        <Typography variant="h6">Invoices</Typography>
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />
      <Grid container sx={{ p: 3 }} spacing={2.5}>
        <Grid xs={12} md={6}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.08),
              border: `1px solid ${varAlpha(theme.vars.palette.info.mainChannel, 0.16)}`,
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify
                  icon="solar:file-text-bold-duotone"
                  width={20}
                  sx={{ color: 'info.main' }}
                />
                <Typography variant="subtitle2" color="info.main">
                  AR Invoice (Revenue)
                </Typography>
              </Stack>
              {deal.arInvoiceNumber ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Invoice #: <strong>{deal.arInvoiceNumber}</strong>
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {fmt(deal.arInvoiceAmount)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  No AR invoice linked
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
        <Grid xs={12} md={6}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
              border: `1px solid ${varAlpha(theme.vars.palette.error.mainChannel, 0.16)}`,
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify
                  icon="solar:bill-list-bold-duotone"
                  width={20}
                  sx={{ color: 'error.main' }}
                />
                <Typography variant="subtitle2" color="error.main">
                  AP Invoice (Cost)
                </Typography>
              </Stack>
              {deal.apInvoiceNumber ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Invoice #: <strong>{deal.apInvoiceNumber}</strong>
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {fmt(deal.apInvoiceAmount)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  No AP invoice linked
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );

  // ── Payment History Card ───────────────────────────────────────────────────

  const renderPaymentHistory = deal.bdmId && (
    <Card>
      <Stack
        sx={{ px: 3, pt: 3, pb: 2 }}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify
            icon="solar:clock-circle-bold-duotone"
            width={22}
            sx={{ color: 'text.secondary' }}
          />
          <Typography variant="h6">Payment History</Typography>
        </Stack>
        {paymentHistory.length > 0 && <Label color={paymentStatusColor}>{paymentStatusText}</Label>}
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />

      {paymentHistory.length === 0 ? (
        <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <Iconify
            icon="solar:clock-circle-bold-duotone"
            width={40}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography variant="body2" color="text.disabled">
            No payments recorded yet
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmt(bdmPaid)} of {fmt(bdmTotal)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={paymentProgressPct}
              color={bdmPending <= 0 ? 'success' : 'warning'}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          <Scrollbar>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount Paid</TableCell>
                  <TableCell>Expense ID</TableCell>
                  <TableCell align="right">Cumulative</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentHistory.map((entry, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.date ? fDate(entry.date) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" color="success.main">
                        {fmt(entry.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {entry.expenseId ? (
                        <Chip
                          label={`#${entry.expenseId}`}
                          size="small"
                          variant="soft"
                          color="default"
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {fmt(entry.paidAfter ?? bdmPaid)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>

          <Divider />
          <Grid container sx={{ px: 3, py: 1.5 }} spacing={1}>
            <Grid xs={4}>
              <Typography variant="caption" color="text.secondary">
                Total Commission
              </Typography>
              <Typography variant="subtitle2">{fmt(bdmTotal)}</Typography>
            </Grid>
            <Grid xs={4}>
              <Typography variant="caption" color="text.secondary">
                Total Paid
              </Typography>
              <Typography variant="subtitle2" color="success.main">
                {fmt(bdmPaid)}
              </Typography>
            </Grid>
            <Grid xs={4}>
              <Typography variant="caption" color="text.secondary">
                Balance
              </Typography>
              <Typography
                variant="subtitle2"
                color={bdmPending > 0 ? 'warning.dark' : 'text.disabled'}
              >
                {bdmPending > 0 ? fmt(bdmPending) : '—'}
              </Typography>
            </Grid>
          </Grid>
        </>
      )}
    </Card>
  );

  // ── Deal Info Card (sidebar) ──────────────────────────────────────────────

  const renderDealInfo = (
    <Card>
      <Stack sx={{ px: 3, pt: 3, pb: 2 }} direction="row" alignItems="center" spacing={1}>
        <Iconify icon="solar:notebook-bold-duotone" width={22} sx={{ color: 'text.secondary' }} />
        <Typography variant="h6">Deal Info</Typography>
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />
      <Stack spacing={2} sx={{ p: 3 }}>
        <InfoRow icon="solar:calendar-bold-duotone" label="Date" value={fDate(deal.dealDate)} />
        {deal.customerId && (
          <InfoRow
            icon="solar:user-id-bold-duotone"
            label="Customer"
            value={`#${deal.customerId}`}
          />
        )}
        {deal.region && (
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Iconify
              icon="solar:global-bold-duotone"
              width={18}
              sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Region
              </Typography>
              <Box>
                <Chip label={deal.region} size="small" variant="soft" color="primary" />
              </Box>
            </Box>
          </Stack>
        )}
        {deal.bdmName && (
          <InfoRow icon="solar:user-bold-duotone" label="BDM" value={deal.bdmName} />
        )}
        {deal.notes && (
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify
                  icon="solar:notes-bold-duotone"
                  width={18}
                  sx={{ color: 'text.secondary' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {deal.notes}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );

  // ── Profit Breakdown Card (sidebar) ───────────────────────────────────────

  const renderProfit = (
    <Card>
      <Stack sx={{ px: 3, pt: 3, pb: 2 }} direction="row" alignItems="center" spacing={1}>
        <Iconify icon="solar:chart-2-bold-duotone" width={22} sx={{ color: 'text.secondary' }} />
        <Typography variant="h6">Profit Breakdown</Typography>
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />
      <Stack spacing={1.5} sx={{ p: 3 }}>
        <ProfitRow label="Revenue (AR)" value={fmt(deal.arInvoiceAmount)} color="info.main" />
        <ProfitRow label="Cost (AP)" value={`-${fmt(deal.apInvoiceAmount)}`} color="error.main" />
        <Divider sx={{ borderStyle: 'dashed' }} />
        <ProfitRow label="Gross Profit" value={fmt(deal.grossProfit)} color="success.main" bold />
        {deal.vatAmount > 0 && (
          <ProfitRow
            label={`VAT (${deal.vatPercentage || 15}%)`}
            value={fmt(deal.vatAmount)}
            color="text.secondary"
          />
        )}
        <ProfitRow
          label="Net Profit (before BDM)"
          value={fmt(deal.netProfitBeforeBDM)}
          color="success.main"
        />
        {deal.bdmId && (
          <>
            <ProfitRow label="BDM Commission" value={`-${fmt(bdmTotal)}`} color="warning.main" />
            <Divider sx={{ borderStyle: 'dashed' }} />
            <ProfitRow
              label="Final Net Profit"
              value={fmt(deal.netProfitAfterBDM)}
              color="primary.main"
              bold
              large
            />
          </>
        )}
      </Stack>
    </Card>
  );

  // ── BDM Commission Card (sidebar) ─────────────────────────────────────────

  const renderBDMCommission = deal.bdmId && (
    <Card>
      <Stack
        sx={{ px: 3, pt: 3, pb: 2 }}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify
            icon="solar:hand-money-bold-duotone"
            width={22}
            sx={{ color: 'text.secondary' }}
          />
          <Typography variant="h6">BDM Commission</Typography>
        </Stack>
        <Label color={paymentStatusColor}>{paymentStatusText}</Label>
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Type
          </Typography>
          <Chip
            label={deal.bdmCommissionType === 'fixed' ? 'Fixed' : 'Percentage'}
            size="small"
            variant="soft"
            color="default"
          />
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Value
          </Typography>
          <Typography variant="subtitle2">
            {deal.bdmCommissionType === 'fixed'
              ? fmt(deal.bdmCommissionValue)
              : `${deal.bdmCommissionValue}%`}
          </Typography>
        </Stack>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Total</Typography>
          <Typography variant="h6" color="warning.main">
            {fmt(bdmTotal)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Paid
          </Typography>
          <Typography variant="subtitle2" color="success.main">
            {bdmPaid > 0 ? fmt(bdmPaid) : '—'}
          </Typography>
        </Stack>
        {bdmPending > 0 && (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Balance
            </Typography>
            <Typography variant="subtitle2" color="warning.dark">
              {fmt(bdmPending)}
            </Typography>
          </Stack>
        )}
        {bdmTotal > 0 && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={paymentProgressPct}
              color={bdmPending <= 0 ? 'success' : 'warning'}
              sx={{ height: 6, borderRadius: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {paymentProgressPct.toFixed(0)}% paid
            </Typography>
          </Box>
        )}

        {/* Record payment form */}
        {bdmPending > 0 && (
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Typography variant="subtitle2">Record Payment</Typography>
            <TextField
              label="Amount"
              type="number"
              size="small"
              fullWidth
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              helperText={`Max: ${fmt(bdmPending)}`}
            />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="Expense ID (optional)"
                size="small"
                sx={{ flex: 1 }}
                value={paymentExpenseId}
                onChange={(e) => {
                  setPaymentExpenseId(e.target.value);
                  setFetchedExpense(null);
                }}
                error={!isExpenseInputNumeric && Boolean(trimmedExpenseInput)}
                helperText={
                  !isExpenseInputNumeric && Boolean(trimmedExpenseInput) ? 'Must be numeric' : ' '
                }
              />
              <LoadingButton
                size="small"
                variant="outlined"
                color="inherit"
                loading={isFetchingExpense}
                onClick={handleFetchExpense}
                sx={{ height: 40, mt: 0, flexShrink: 0, minWidth: 40, px: 1 }}
              >
                <Iconify icon="solar:search-bold" />
              </LoadingButton>
            </Stack>
            {fetchedExpense && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.08),
                }}
              >
                <Typography variant="caption" color="info.main">
                  Expense #{fetchedExpense.id} —{' '}
                  {fmt(
                    fetchedExpense.expenseAmount ||
                      fetchedExpense.expenseApprovedAmount ||
                      fetchedExpense.originalExpenseAmount ||
                      0
                  )}
                  {fetchedExpense.expenseApprovalStatus
                    ? ` · ${String(fetchedExpense.expenseApprovalStatus)}`
                    : ''}
                </Typography>
              </Box>
            )}
            <Stack direction="row" spacing={1}>
              <LoadingButton
                fullWidth
                variant="outlined"
                color="warning"
                size="small"
                loading={isRecordingPayment}
                onClick={handleRecordPartialPayment}
                startIcon={<Iconify icon="solar:coins-bold" />}
              >
                Partial
              </LoadingButton>
              <LoadingButton
                fullWidth
                variant="contained"
                color="warning"
                size="small"
                loading={isPayingBDM}
                onClick={handlePayBDM}
                startIcon={<Iconify icon="solar:wallet-money-bold" />}
              >
                Pay All
              </LoadingButton>
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );

  // ── Page layout ───────────────────────────────────────────────────────────

  return (
    <DashboardContent>
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
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Status chips row */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 3 }}>
        <Typography variant="h5">{deal.dealNumber}</Typography>
        <Label color={STATUS_OPTIONS[deal.status]?.color || 'default'} sx={{ typography: 'body2' }}>
          {STATUS_OPTIONS[deal.status]?.label || deal.status}
        </Label>
        {deal.region && <Chip label={deal.region} size="small" variant="soft" color="primary" />}
        {deal.bdmName && (
          <Chip
            icon={<Iconify icon="solar:user-bold-duotone" width={14} />}
            label={deal.bdmName}
            size="small"
            variant="soft"
            color="warning"
          />
        )}
      </Stack>

      {renderKpiStrip}

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid xs={12} md={6}>
          <Stack spacing={3}>
            {renderInvoices}
            {renderPaymentHistory}
          </Stack>
        </Grid>

        {/* Right column */}
        <Grid xs={12} md={6}>
          <Stack spacing={3}>
            {renderDealInfo}
            {renderProfit}
            {renderBDMCommission}
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

// ── Helper sub-components ─────────────────────────────────────────────────────

function InfoRow({ icon, label, value }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
      <Iconify icon={icon} width={18} sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Stack>
  );
}

function ProfitRow({ label, value, color, bold, large }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
        variant={bold ? 'subtitle2' : 'body2'}
        color={bold ? 'text.primary' : 'text.secondary'}
      >
        {label}
      </Typography>
      <Typography
        variant={large ? 'h6' : bold ? 'subtitle2' : 'body2'}
        color={color || 'text.primary'}
      >
        {value}
      </Typography>
    </Stack>
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
