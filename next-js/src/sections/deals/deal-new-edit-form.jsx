'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { fetchInvoices, getExpensesWithLinkedInvoices } from 'src/utils/apiHelper';

import { getBDMs } from 'src/actions/bdm';
import { createDeal, updateDeal } from 'src/actions/deals';

import { toast } from 'src/components/snackbar';
import { Form, Field, RHFTextField, RHFAutocomplete } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const DealSchema = zod.object({
  dealNumber: zod.string().min(1, { message: 'Deal number is required!' }),
  dealName: zod.string().min(1, { message: 'Deal name is required!' }),
  dealDate: zod.coerce.date(),
  customerId: zod.number().optional(),
  arInvoiceIds: zod.array(zod.string()).optional(),
  expenseIds: zod.array(zod.string()).optional(),
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
  const [expenses, setExpenses] = useState([]);
  const [bdms, setBdms] = useState([]);
  const [arInvoices, setArInvoices] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [calculations, setCalculations] = useState({
    arAmount: 0,
    arAmountWithVAT: 0,
    expenseAmount: 0, // Without VAT
    expenseAmountWithVAT: 0, // With VAT
    expenseVAT: 0, // VAT extracted from expenses
    grossProfit: 0,
    vatAmount: 0,
    netProfitBeforeBDM: 0,
    bdmCommissionAmount: 0,
    netProfitAfterBDM: 0,
  });

  const formatExpenseLabel = (expense) => {
    if (!expense) return '';
    const baseLabel = `${expense.linkedInvoiceNumber || 'N/A'} - ${expense.expenseSettlementNotes || 'No description'} - ${fCurrency(expense.expenseAmount || 0, { currency: 'SAR' })}`;
    return baseLabel.length > 70 ? `${baseLabel.slice(0, 67)}...` : baseLabel;
  };

  const formatInvoiceLabel = (invoice) => {
    if (!invoice) return '';
    const baseLabel = `${invoice.invoiceNumber || invoice.invoiceId || 'Invoice'} - ${fCurrency(invoice.total || 0, { currency: invoice.currencyCode || 'SAR' })}`;
    return baseLabel.length > 70 ? `${baseLabel.slice(0, 67)}...` : baseLabel;
  };

  const defaultValues = useMemo(
    () => ({
      // Auto-generate deal number using timestamp when creating a new deal
      dealNumber: currentDeal?.dealNumber || `${Date.now()}`,
      dealName: currentDeal?.dealName || '',
      dealDate: currentDeal?.dealDate ? new Date(currentDeal.dealDate) : new Date(),
      customerId: currentDeal?.customerId || undefined,
      arInvoiceIds: currentDeal?.arInvoiceIds || [],
      expenseIds: currentDeal?.expenseIds || [],
      bdmId: currentDeal?.bdmId || '',
      bdmCommissionType: currentDeal?.bdmCommissionType || 'percentage',
      bdmCommissionValue: currentDeal?.bdmCommissionValue || 0,
      status: currentDeal?.status || 'draft',
      region: currentDeal?.region || 'KSA',
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
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // Ensure form is hydrated when editing after async currentDeal load
  useEffect(() => {
    if (currentDeal) {
      // Supabase stores single AR id in arInvoiceId and expense ids in apInvoiceId (stringified)
      const parsedExpenseIds = (() => {
        if (Array.isArray(currentDeal.apInvoiceId)) return currentDeal.apInvoiceId;
        if (typeof currentDeal.apInvoiceId === 'string') {
          try {
            const parsed = JSON.parse(currentDeal.apInvoiceId);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return currentDeal.apInvoiceId ? [currentDeal.apInvoiceId] : [];
          }
        }
        return [];
      })();

      reset({
        ...defaultValues,
        dealDate: currentDeal.dealDate ? new Date(currentDeal.dealDate) : new Date(),
        arInvoiceIds: (currentDeal.arInvoiceIds || currentDeal.arInvoiceId || [])
          .toString()
          .split(',')
          .filter(Boolean)
          .map((id) => String(id)),
        expenseIds: parsedExpenseIds.map((id) => String(id)),
        bdmId: currentDeal.bdmId ? String(currentDeal.bdmId) : '',
      });
    }
  }, [currentDeal, defaultValues, reset]);

  // Seed calculations from existing deal when nothing is selected yet (edit mode)
  useEffect(() => {
    if (currentDeal && arInvoices.length === 0 && selectedExpenses.length === 0) {
      setCalculations((prev) => ({
        ...prev,
        arAmount: currentDeal.arInvoiceAmount ?? prev.arAmount,
        arAmountWithVAT: currentDeal.arInvoiceAmountWithVAT ?? currentDeal.arInvoiceAmount ?? prev.arAmountWithVAT,
        expenseAmount:
          currentDeal.expenseAmount ?? currentDeal.apInvoiceAmount ?? prev.expenseAmount,
        expenseAmountWithVAT:
          currentDeal.expenseAmountWithVAT ?? currentDeal.apInvoiceAmount ?? prev.expenseAmountWithVAT,
        expenseVAT: currentDeal.expenseVAT ?? prev.expenseVAT,
        grossProfit: currentDeal.grossProfit ?? prev.grossProfit,
        vatAmount: currentDeal.vatAmount ?? prev.vatAmount,
        netProfitBeforeBDM: currentDeal.netProfitBeforeBDM ?? prev.netProfitBeforeBDM,
        bdmCommissionAmount: currentDeal.bdmCommissionAmount ?? prev.bdmCommissionAmount,
        netProfitAfterBDM: currentDeal.netProfitAfterBDM ?? prev.netProfitAfterBDM,
      }));
    }
  }, [currentDeal, arInvoices.length, selectedExpenses.length]);

  // Load invoices, expenses and BDMs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesData, expensesData, bdmsData] = await Promise.all([
          fetchInvoices(),
          getExpensesWithLinkedInvoices(),
          getBDMs(),
        ]);

        // fetchInvoices returns array directly
        const invoiceArray = Array.isArray(invoicesData) ? invoicesData : [];
        setInvoices(invoiceArray);
        console.log('✅ Invoices loaded:', invoiceArray.length);

        // getExpenses returns array directly
        const expenseArray = Array.isArray(expensesData) ? expensesData : [];
        setExpenses(expenseArray);
        console.log('✅ Expenses loaded:', expenseArray.length);

        // getBDMs returns { bdms: [...] }
        const bdmArray = Array.isArray(bdmsData) ? bdmsData : bdmsData?.bdms || [];
        setBdms(bdmArray);
        console.log('✅ BDMs loaded:', bdmArray.length);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        toast.error('Failed to load data');
      }
    };
    loadData();
  }, []);

  // Update AR invoices details
  useEffect(() => {
    if (values.arInvoiceIds && values.arInvoiceIds.length > 0 && invoices.length > 0) {
      const selected = invoices.filter((inv) => values.arInvoiceIds.includes(String(inv.id)));
      setArInvoices(selected);
    } else {
      setArInvoices([]);
    }
  }, [values.arInvoiceIds, invoices]);

  // Update selected expenses details
  useEffect(() => {
    if (values.expenseIds && values.expenseIds.length > 0 && expenses.length > 0) {
      const selected = expenses.filter((exp) => values.expenseIds.includes(String(exp.id)));
      setSelectedExpenses(selected);
    } else {
      setSelectedExpenses([]);
    }
  }, [values.expenseIds, expenses]);

  // Calculate profit metrics
  useEffect(() => {
    // If no new selections, retain existing calculations to avoid zeroing out on status-only updates
    if (arInvoices.length === 0 && selectedExpenses.length === 0) {
      return;
    }

    const arAmountWithVAT = arInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const vatPercentage = values.region === 'KSA' ? 15 : 5;
    const vatMultiplier = 1 + vatPercentage / 100;
    const arAmount = arAmountWithVAT / vatMultiplier;
    const vatAmount = arAmountWithVAT - arAmount;

    const expenseAmountWithVAT = selectedExpenses.reduce(
      (sum, exp) => sum + (exp.expenseAmount || exp.amount || exp.total || 0),
      0
    );
    const expenseAmount = expenseAmountWithVAT / vatMultiplier;
    const expenseVAT = expenseAmountWithVAT - expenseAmount;

    const grossProfit = arAmount - expenseAmount;

    let bdmCommissionAmount = 0;
    if (values.bdmId && values.bdmCommissionValue) {
      if (values.bdmCommissionType === 'fixed') {
        bdmCommissionAmount = values.bdmCommissionValue;
      } else {
        bdmCommissionAmount = (grossProfit * values.bdmCommissionValue) / 100;
      }
    }

    const netProfitBeforeBDM = grossProfit;
    const netProfitAfterBDM = netProfitBeforeBDM - bdmCommissionAmount;

    setCalculations({
      arAmount,
      arAmountWithVAT,
      expenseAmount,
      expenseAmountWithVAT,
      expenseVAT,
      grossProfit,
      vatAmount,
      netProfitBeforeBDM,
      bdmCommissionAmount,
      netProfitAfterBDM,
    });
  }, [
    arInvoices,
    selectedExpenses,
    values.region,
    values.bdmId,
    values.bdmCommissionType,
    values.bdmCommissionValue,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const hasArSelections = arInvoices.length > 0;
      const hasExpenseSelections = selectedExpenses.length > 0;

      const primaryArInvoice = hasArSelections ? arInvoices[0] : null;
      const primaryExpense = hasExpenseSelections ? selectedExpenses[0] : null;

      const arInvoiceId = primaryArInvoice?.id || currentDeal?.arInvoiceId || null;
      const arInvoiceNumber = primaryArInvoice?.invoiceNumber || currentDeal?.arInvoiceNumber || '';
      const arInvoiceIds = hasArSelections
        ? arInvoices.map((inv) => String(inv.id))
        : currentDeal?.arInvoiceIds || (currentDeal?.arInvoiceId ? [String(currentDeal.arInvoiceId)] : []);
      const arInvoiceNumbers = hasArSelections
        ? arInvoices.map((inv) => inv.invoiceNumber).join(', ')
        : currentDeal?.arInvoiceNumbers || currentDeal?.arInvoiceNumber || '';

      const arInvoiceAmount = hasArSelections
        ? calculations.arAmount
        : currentDeal?.arInvoiceAmount || calculations.arAmount || 0;

      const expenseIdsArray = data.expenseIds || [];
      const apInvoiceId = expenseIdsArray.length ? JSON.stringify(expenseIdsArray) : currentDeal?.apInvoiceId || null;
      const apInvoiceNumber = primaryExpense?.linkedInvoiceNumber || currentDeal?.apInvoiceNumber || '';
      const expenseIds = hasExpenseSelections
        ? expenseIdsArray
        : currentDeal?.expenseIds ||
          (currentDeal?.apInvoiceId
            ? Array.isArray(currentDeal.apInvoiceId)
              ? currentDeal.apInvoiceId
              : [String(currentDeal.apInvoiceId)]
            : []);
      const expenseDescriptions = hasExpenseSelections
        ? selectedExpenses.map((exp) => exp.expenseSettlementNotes || exp.expenseTypeDesc || '').join(', ')
        : currentDeal?.expenseDescriptions || '';

      const expenseAmountWithVAT = hasExpenseSelections
        ? calculations.expenseAmountWithVAT
        : currentDeal?.expenseAmountWithVAT ||
          currentDeal?.apInvoiceAmount ||
          calculations.expenseAmountWithVAT ||
          0;

      const apInvoiceAmount = expenseAmountWithVAT;

      const grossProfit =
        calculations.grossProfit || currentDeal?.grossProfit || arInvoiceAmount - apInvoiceAmount;

      const netProfitBeforeBDM =
        calculations.netProfitBeforeBDM || currentDeal?.netProfitBeforeBDM || grossProfit;

      const netProfitAfterBDM =
        calculations.netProfitAfterBDM || currentDeal?.netProfitAfterBDM || netProfitBeforeBDM;

      const basePayload = {
        dealNumber: data.dealNumber,
        dealName: data.dealName,
        dealDate: data.dealDate.toISOString().split('T')[0],
        status: data.status,
        region: data.region,
        notes: data.notes,
        bdmId: data.bdmId,
        bdmName: bdms.find((b) => b.id === data.bdmId)?.name || '',
        bdmCommissionType: data.bdmCommissionType,
        bdmCommissionValue: data.bdmCommissionValue,
        bdmCommissionAmount:
          calculations.bdmCommissionAmount || currentDeal?.bdmCommissionAmount || 0,
        bdmCommissionPaid: data.bdmCommissionPaid ?? currentDeal?.bdmCommissionPaid ?? false,
        updatedAt: new Date().toISOString(),
      };

      const financialPayload = {
        arInvoiceId,
        arInvoiceNumber,
        arInvoiceAmount,
        apInvoiceId,
        apInvoiceNumber,
        apInvoiceAmount,
        grossProfit,
        netProfitBeforeBDM,
        netProfitAfterBDM,
      };

      const payload =
        hasArSelections || hasExpenseSelections
          ? { ...basePayload, ...financialPayload }
          : basePayload;

      console.log('Payload being sent:', payload);
      if (currentDeal) {
        await updateDeal(currentDeal.id, payload);
        toast.success('Deal updated successfully');
      } else {
        const createPayload = {
          dealNumber: data.dealNumber,
          dealName: data.dealName,
          dealDate: data.dealDate.toISOString().split('T')[0],
          status: data.status,
          region: data.region,
          notes: data.notes,
          arInvoiceIds,
          arInvoiceNumbers,
          expenseIds,
          expenseDescriptions,
          bdmId: data.bdmId,
          bdmCommissionType: data.bdmCommissionType,
          bdmCommissionValue: data.bdmCommissionValue,
        };
        await createDeal(createPayload);
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
          <Grid item xs={12} md={6}>
            <Field.Text
              name="dealNumber"
              label="Deal Number"
              required
              InputProps={{
                readOnly: true,
                sx: { color: 'text.disabled' },
              }}
              helperText="Auto-generated from timestamp"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Field.DatePicker name="dealDate" label="Deal Date" />
          </Grid>

          <Grid item xs={12}>
            <Field.Text name="dealName" label="Deal Name" required />
          </Grid>

          <Grid item xs={12} md={6}>
            <Field.Select name="status" label="Status">
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Field.Select>
          </Grid>

          <Grid item xs={12} md={6}>
            <Field.Select name="region" label="Region">
              <MenuItem value="UAE">UAE</MenuItem>
              <MenuItem value="KSA">KSA</MenuItem>
            </Field.Select>
          </Grid>

          <Grid item xs={12}>
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
          <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
            <RHFAutocomplete
              name="arInvoiceIds"
              label="AR Invoices (Selling)"
              multiple
              sx={{ minWidth: 320 }}
              options={invoices.map((inv) => String(inv.id))}
              getOptionLabel={(option) => {
                const invoice = invoices.find((inv) => String(inv.id) === option);
                return invoice ? formatInvoiceLabel(invoice) : option;
              }}
              isOptionEqualToValue={(option, value) => option === value}
              renderOption={(props, option) => {
                const invoice = invoices.find((inv) => String(inv.id) === option);
                return (
                  <li {...props} key={option}>
                    {invoice ? formatInvoiceLabel(invoice) : option}
                  </li>
                );
              }}
              ChipProps={{ size: 'small' }}
            />

            {arInvoices.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Selected AR Invoices ({arInvoices.length})
                </Typography>
                <Stack spacing={1.5}>
                  {arInvoices.map((invoice, index) => (
                    <Box key={invoice.id}>
                      {index > 0 && <Divider sx={{ my: 0.5 }} />}
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Invoice:</strong> {invoice.invoiceNumber || invoice.invoiceId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Customer:</strong> {invoice.customerName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Amount:</strong>{' '}
                          {fCurrency(invoice.total || 0, {
                            currency: invoice.currencyCode || 'SAR',
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Date:</strong>{' '}
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Total AR:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                      {fCurrency(calculations.arAmount, {
                        currency: arInvoices[0]?.currencyCode || 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
            <RHFAutocomplete
              name="expenseIds"
              label="Expenses (Buying Costs)"
              multiple
              sx={{ minWidth: 320 }}
              options={expenses.map((exp) => String(exp.id))}
              getOptionLabel={(option) => {
                const expense = expenses.find((exp) => String(exp.id) === option);
                return expense ? formatExpenseLabel(expense) : option;
              }}
              isOptionEqualToValue={(option, value) => option === value}
              renderOption={(props, option) => {
                const expense = expenses.find((exp) => String(exp.id) === option);
                return (
                  <li {...props} key={option}>
                    {expense ? formatExpenseLabel(expense) : option}
                  </li>
                );
              }}
              ChipProps={{ size: 'small' }}
            />

            {selectedExpenses.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Selected Expenses ({selectedExpenses.length})
                </Typography>
                <Stack spacing={1.5}>
                  {selectedExpenses.map((expense, index) => (
                    <Box key={expense.id}>
                      {index > 0 && <Divider sx={{ my: 0.5 }} />}
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Type:</strong> {expense.expenseTypeDesc}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Notes:</strong> {expense.expenseSettlementNotes || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Amount:</strong>{' '}
                          {fCurrency(expense.expenseAmount || 0, { currency: 'SAR' })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Date:</strong>{' '}
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Total AP:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {fCurrency(calculations.expenseAmount, {
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}
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
          <Grid item xs={12}>
            <Field.Select name="bdmId" label="Business Development Manager" sx={{ minWidth: 300 }}>
              <MenuItem value="">None</MenuItem>
              {bdms.map((bdm) => (
                <MenuItem key={bdm.id} value={String(bdm.id)}>
                  {bdm.name} ({bdm.email})
                </MenuItem>
              ))}
            </Field.Select>
          </Grid>

          {values.bdmId && (
            <>
              <Grid item xs={12} md={6}>
                <Field.Select name="bdmCommissionType" label="Commission Type">
                  <MenuItem value="fixed">Fixed Amount (SAR)</MenuItem>
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                </Field.Select>
              </Grid>

              <Grid item xs={12} md={6}>
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
              Revenue (AR Invoices - excl. VAT):
            </Typography>
            <Typography variant="subtitle2" color="info.main">
              {fCurrency(calculations.arAmount, { currency: arInvoices[0]?.currencyCode || 'SAR' })}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              VAT Amount ({values.region === 'KSA' ? '15%' : '5%'}):
            </Typography>
            <Typography variant="subtitle2" color="warning.main">
              {fCurrency(calculations.vatAmount, {
                currency: arInvoices[0]?.currencyCode || 'SAR',
              })}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Cost (Expenses - excl. VAT):
            </Typography>
            <Typography variant="subtitle2" color="error.main">
              {fCurrency(calculations.expenseAmount, {
                currency: 'SAR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Expense VAT (15%):
            </Typography>
            <Typography variant="subtitle2" color="warning.main">
              {fCurrency(calculations.expenseVAT, {
                currency: 'SAR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Gross Profit:</Typography>
            <Typography variant="subtitle2">
              {fCurrency(calculations.grossProfit, {
                currency: arInvoices[0]?.currencyCode || 'SAR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">Net Profit Before BDM:</Typography>
            <Typography variant="subtitle2" color="success.main">
              {fCurrency(calculations.netProfitBeforeBDM, {
                currency: arInvoices[0]?.currencyCode || 'SAR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>

          {values.bdmId && (
            <>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  BDM Commission:
                </Typography>
                <Typography variant="subtitle2" color="warning.main">
                  -
                  {fCurrency(calculations.bdmCommissionAmount, {
                    currency: arInvoices[0]?.currencyCode || 'SAR',
                  })}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Net Profit After BDM:</Typography>
                <Typography variant="subtitle1" color="primary.main">
                  {fCurrency(calculations.netProfitAfterBDM, {
                    currency: arInvoices[0]?.currencyCode || 'SAR',
                  })}
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
        <Grid item xs={12}>
          <Stack spacing={3}>
            {renderDetails}
            {renderInvoices}
            {renderBDM}
            {renderCalculations}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>{renderActions}</Card>
        </Grid>
      </Grid>
    </Form>
  );
}
