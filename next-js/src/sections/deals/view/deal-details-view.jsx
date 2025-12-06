'use client';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

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
  cancelled: { label: 'Cancelled', color: 'error' },
};

// ----------------------------------------------------------------------

export function DealDetailsView({ deal }) {
  const router = useRouter();
  const confirm = useBoolean();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingBDM, setIsPayingBDM] = useState(false);

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
    try {
      setIsPayingBDM(true);
      // In real implementation, this would open a dialog to create an expense
      // For now, we'll just call the API with a placeholder expense ID
      await payBDMCommission(deal.id, 'expense-placeholder');
      toast.success('BDM commission marked as paid');
      router.refresh();
    } catch (error) {
      console.error('Error paying BDM commission:', error);
      toast.error('Failed to pay BDM commission');
    } finally {
      setIsPayingBDM(false);
    }
  };

  const renderHeader = (
    <Stack spacing={3} sx={{ mb: 3 }}>
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

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h4">{deal.dealNumber}</Typography>
        <Label color={STATUS_OPTIONS[deal.status]?.color || 'default'}>
          {STATUS_OPTIONS[deal.status]?.label || deal.status}
        </Label>
        {deal.region && (
          <Chip label={deal.region} size="small" variant="soft" color="primary" />
        )}
      </Stack>
    </Stack>
  );

  const renderOverview = (
    <Card>
      <Stack spacing={3} sx={{ p: 3 }}>
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
      <Stack spacing={3} sx={{ p: 3 }}>
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
                      {fCurrency(deal.arInvoiceAmount)}
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
                      {fCurrency(deal.apInvoiceAmount)}
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
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h6">Profit Breakdown</Typography>

        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Revenue (AR):
            </Typography>
            <Typography variant="subtitle1" color="info.main">
              {fCurrency(deal.arInvoiceAmount || 0)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Cost (AP):
            </Typography>
            <Typography variant="subtitle1" color="error.main">
              -{fCurrency(deal.apInvoiceAmount || 0)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Gross Profit:</Typography>
            <Typography variant="h6" color="success.main">
              {fCurrency(deal.grossProfit || 0)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              VAT ({deal.vatPercentage}%):
            </Typography>
            <Typography variant="subtitle1" color="error.main">
              -{fCurrency(deal.vatAmount || 0)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Net Profit Before BDM:</Typography>
            <Typography variant="h6" color="success.main">
              {fCurrency(deal.netProfitBeforeBDM || 0)}
            </Typography>
          </Stack>

          {deal.bdmId && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  BDM Commission:
                </Typography>
                <Typography variant="subtitle1" color="warning.main">
                  -{fCurrency(deal.bdmCommissionAmount || 0)}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Final Net Profit:</Typography>
                <Typography variant="h5" color="primary.main">
                  {fCurrency(deal.netProfitAfterBDM || 0)}
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
      <Stack spacing={3} sx={{ p: 3 }}>
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
                ? fCurrency(deal.bdmCommissionValue)
                : `${deal.bdmCommissionValue}%`}
            </Typography>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Commission Amount:</Typography>
            <Typography variant="h6" color="warning.main">
              {fCurrency(deal.bdmCommissionAmount || 0)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Payment Status:
            </Typography>
            <Label color={deal.bdmCommissionPaid ? 'success' : 'warning'}>
              {deal.bdmCommissionPaid ? 'Paid' : 'Pending'}
            </Label>
          </Stack>

          {deal.bdmCommissionPaid && deal.bdmPaymentDate && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Payment Date:
              </Typography>
              <Typography variant="body2">{fDate(deal.bdmPaymentDate)}</Typography>
            </Stack>
          )}

          {!deal.bdmCommissionPaid && (
            <LoadingButton
              fullWidth
              variant="contained"
              color="warning"
              loading={isPayingBDM}
              onClick={handlePayBDM}
              startIcon={<Iconify icon="solar:wallet-money-bold" />}
            >
              Mark Commission as Paid
            </LoadingButton>
          )}
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <>
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
    </>
  );
}
