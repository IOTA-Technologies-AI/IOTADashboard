'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { fetchInvoices } from 'src/utils/apiHelper';

import { getBDMs } from 'src/actions/bdm';
import { createDeal, updateDeal } from 'src/actions/deals';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const DealSchema = zod.object({
  dealNumber: zod.string().min(1, { message: 'Deal number is required!' }),
  dealName: zod.string().min(1, { message: 'Deal name is required!' }),
  dealDate: zod.coerce.date(),
  customerId: zod.number().optional(),
  arInvoiceId: zod.string().optional(),
  apInvoiceId: zod.string().optional(),
  vatPercentage: zod.number().min(0).max(100).default(15),
  bdmId: zod.string().optional(),
  bdmCommissionType: zod.enum(['fixed', 'percentage']).optional(),
  bdmCommissionValue: zod.number().min(0).optional(),
  status: zod.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  region: zod.enum(['UAE', 'KSA']).optional(),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export function DealNewEditForm({ currentDeal }) {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [bdms, setBdms] = useState([]);
  const [arInvoice, setArInvoice] = useState(null);
  const [apInvoice, setApInvoice] = useState(null);
  const [calculations, setCalculations] = useState({
    arAmount: 0,
    apAmount: 0,
    grossProfit: 0,
    vatAmount: 0,
    netProfitBeforeBDM: 0,
    bdmCommissionAmount: 0,
    netProfitAfterBDM: 0,
  });

  const defaultValues = useMemo(
    () => ({
      dealNumber: currentDeal?.dealNumber || '',
      dealName: currentDeal?.dealName || '',
      dealDate: currentDeal?.dealDate ? new Date(currentDeal.dealDate) : new Date(),
      customerId: currentDeal?.customerId || undefined,
      arInvoiceId: currentDeal?.arInvoiceId || '',
      apInvoiceId: currentDeal?.apInvoiceId || '',
      vatPercentage: currentDeal?.vatPercentage || 15,
      bdmId: currentDeal?.bdmId || '',
      bdmCommissionType: currentDeal?.bdmCommissionType || 'percentage',
      bdmCommissionValue: currentDeal?.bdmCommissionValue || 0,
      status: currentDeal?.status || 'draft',
      region: currentDeal?.region || 'UAE',
      notes: currentDeal?.notes || '',
    }),
    [currentDeal]
  );

  const methods = useForm({
    resolver: zodResolver(DealSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // Load invoices and BDMs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesData, bdmsData] = await Promise.all([fetchInvoices(), getBDMs()]);
        setInvoices(invoicesData);
        setBdms(bdmsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      }
    };
    loadData();
  }, []);

  // Update AR invoice details
  useEffect(() => {
    if (values.arInvoiceId) {
      const invoice = invoices.find((inv) => inv.id === values.arInvoiceId);
      setArInvoice(invoice);
    } else {
      setArInvoice(null);
    }
  }, [values.arInvoiceId, invoices]);

  // Update AP invoice details
  useEffect(() => {
    if (values.apInvoiceId) {
      const invoice = invoices.find((inv) => inv.id === values.apInvoiceId);
      setApInvoice(invoice);
    } else {
      setApInvoice(null);
    }
  }, [values.apInvoiceId, invoices]);

  // Calculate profit metrics
  useEffect(() => {
    const arAmount = arInvoice?.totalAmount || 0;
    const apAmount = apInvoice?.totalAmount || 0;
    const grossProfit = arAmount - apAmount;
    const vatAmount = (grossProfit * (values.vatPercentage || 0)) / 100;
    const netProfitBeforeBDM = grossProfit - vatAmount;

    let bdmCommissionAmount = 0;
    if (values.bdmId && values.bdmCommissionValue) {
      if (values.bdmCommissionType === 'fixed') {
        bdmCommissionAmount = values.bdmCommissionValue;
      } else {
        bdmCommissionAmount = (netProfitBeforeBDM * values.bdmCommissionValue) / 100;
      }
    }

    const netProfitAfterBDM = netProfitBeforeBDM - bdmCommissionAmount;

    setCalculations({
      arAmount,
      apAmount,
      grossProfit,
      vatAmount,
      netProfitBeforeBDM,
      bdmCommissionAmount,
      netProfitAfterBDM,
    });
  }, [
    arInvoice,
    apInvoice,
    values.vatPercentage,
    values.bdmId,
    values.bdmCommissionType,
    values.bdmCommissionValue,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        ...data,
        dealDate: data.dealDate.toISOString().split('T')[0],
        arInvoiceNumber: arInvoice?.invoiceNumber || '',
        arInvoiceAmount: calculations.arAmount,
        apInvoiceNumber: apInvoice?.invoiceNumber || '',
        apInvoiceAmount: calculations.apAmount,
        bdmName: bdms.find((b) => b.id === data.bdmId)?.name || '',
      };

      if (currentDeal) {
        await updateDeal(currentDeal.id, payload);
        toast.success('Deal updated successfully');
      } else {
        await createDeal(payload);
        toast.success('Deal created successfully');
      }

      router.push(paths.dashboard.deals.root);
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error(currentDeal ? 'Failed to update deal' : 'Failed to create deal');
    }
  });

  const renderDetails = (
    <Card>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Typography variant="h6">Deal Details</Typography>

        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <Field.Text name="dealNumber" label="Deal Number" required />
          </Grid>

          <Grid xs={12} md={6}>
            <Field.DatePicker name="dealDate" label="Deal Date" />
          </Grid>

          <Grid xs={12}>
            <Field.Text name="dealName" label="Deal Name" required />
          </Grid>

          <Grid xs={12} md={6}>
            <Field.Select name="status" label="Status">
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Field.Select>
          </Grid>

          <Grid xs={12} md={6}>
            <Field.Select name="region" label="Region">
              <MenuItem value="UAE">UAE</MenuItem>
              <MenuItem value="KSA">KSA</MenuItem>
            </Field.Select>
          </Grid>

          <Grid xs={12}>
            <Field.Text name="notes" label="Notes" multiline rows={3} />
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );

  const renderInvoices = (
    <Card>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Typography variant="h6">Invoices</Typography>

        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <Field.Select name="arInvoiceId" label="AR Invoice (Selling)">
              <MenuItem value="">None</MenuItem>
              {invoices
                .filter((inv) => inv.invoiceType === 'AR')
                .map((invoice) => (
                  <MenuItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {fCurrency(invoice.totalAmount)}
                  </MenuItem>
                ))}
            </Field.Select>
            {arInvoice && (
              <Box sx={{ mt: 1, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Amount: {fCurrency(arInvoice.totalAmount)}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Date: {new Date(arInvoice.invoiceDate).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid xs={12} md={6}>
            <Field.Select name="apInvoiceId" label="AP Invoice (Buying)">
              <MenuItem value="">None</MenuItem>
              {invoices
                .filter((inv) => inv.invoiceType === 'AP')
                .map((invoice) => (
                  <MenuItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {fCurrency(invoice.totalAmount)}
                  </MenuItem>
                ))}
            </Field.Select>
            {apInvoice && (
              <Box sx={{ mt: 1, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Amount: {fCurrency(apInvoice.totalAmount)}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Date: {new Date(apInvoice.invoiceDate).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid xs={12}>
            <Field.Text
              name="vatPercentage"
              label="VAT Percentage"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );

  const renderBDM = (
    <Card>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Typography variant="h6">BDM Commission</Typography>

        <Grid container spacing={3}>
          <Grid xs={12}>
            <Field.Select name="bdmId" label="Business Development Manager">
              <MenuItem value="">None</MenuItem>
              {bdms.map((bdm) => (
                <MenuItem key={bdm.id} value={bdm.id}>
                  {bdm.name} ({bdm.email})
                </MenuItem>
              ))}
            </Field.Select>
          </Grid>

          {values.bdmId && (
            <>
              <Grid xs={12} md={6}>
                <Field.Select name="bdmCommissionType" label="Commission Type">
                  <MenuItem value="fixed">Fixed Amount (SAR)</MenuItem>
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                </Field.Select>
              </Grid>

              <Grid xs={12} md={6}>
                <Field.Text
                  name="bdmCommissionValue"
                  label="Commission Value"
                  type="number"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {values.bdmCommissionType === 'fixed' ? 'SAR' : '%'}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Stack>
    </Card>
  );

  const renderCalculations = (
    <Card>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h6">Profit Calculation</Typography>

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Revenue (AR Invoice):
            </Typography>
            <Typography variant="subtitle2" color="info.main">
              {fCurrency(calculations.arAmount)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Cost (AP Invoice):
            </Typography>
            <Typography variant="subtitle2" color="error.main">
              {fCurrency(calculations.apAmount)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Gross Profit:</Typography>
            <Typography variant="subtitle2" color="success.main">
              {fCurrency(calculations.grossProfit)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              VAT ({values.vatPercentage}%):
            </Typography>
            <Typography variant="subtitle2" color="error.main">
              -{fCurrency(calculations.vatAmount)}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Net Profit Before BDM:</Typography>
            <Typography variant="subtitle2" color="success.main">
              {fCurrency(calculations.netProfitBeforeBDM)}
            </Typography>
          </Stack>

          {values.bdmId && (
            <>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  BDM Commission:
                </Typography>
                <Typography variant="subtitle2" color="warning.main">
                  -{fCurrency(calculations.bdmCommissionAmount)}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Net Profit After BDM:</Typography>
                <Typography variant="subtitle1" color="primary.main">
                  {fCurrency(calculations.netProfitAfterBDM)}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </Stack>
    </Card>
  );

  const renderActions = (
    <Stack direction="row" spacing={2} justifyContent="flex-end">
      <Button
        variant="outlined"
        color="inherit"
        onClick={() => router.push(paths.dashboard.deals.root)}
      >
        Cancel
      </Button>

      <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
        {currentDeal ? 'Update Deal' : 'Create Deal'}
      </LoadingButton>
    </Stack>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            {renderDetails}
            {renderInvoices}
            {renderBDM}
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            {renderCalculations}
            {renderActions}
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
