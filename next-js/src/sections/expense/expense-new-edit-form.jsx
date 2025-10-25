'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { apiHelper } from 'src/utils/apiHelper';
import {
  EXPENSE_TYPES,
  EXPENSE_CURRENCIES,
  EXPENSE_APPROVAL_STATUS_OPTIONS,
} from 'src/utils/constants/enums';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const ExpenseSchema = zod.object({
  expenseType: zod.coerce.number().min(1, { message: 'Expense type is required!' }),
  expenseDate: zod.string().min(1, { message: 'Expense date is required!' }),
  originalExpenseAmount: zod.number().min(0.01, { message: 'Amount must be greater than 0!' }),
  expenseBy: zod.number().min(1, { message: 'Expense by is required!' }),
  expenseSettlementNotes: zod.string().optional(),
  originalExpenseCurrency: zod.string().min(1, { message: 'Currency is required!' }),
  externalTransactionId: zod.string().optional(),
  expenseApprovalStatus: zod.string().optional(),
  expenseApprovedBy: zod.string().optional(),
  expenseApprovedDate: zod.string().optional(),
  expenseApprovedAmount: zod.number().optional(),
  originalTransactionDate: zod.string().optional(),
  fileLocation: zod.string().optional(),
});

// ----------------------------------------------------------------------

export function ExpenseNewEditForm({ currentExpense }) {
  const router = useRouter();

  console.log('🔍 ExpenseNewEditForm - currentExpense:', currentExpense);
  console.log('🔍 originalExpenseAmount:', currentExpense?.originalExpenseAmount);
  console.log('🔍 expenseAmount:', currentExpense?.expenseAmount);
  console.log('🔍 originalExpenseCurrency:', currentExpense?.originalExpenseCurrency);
  console.log('🔍 expenseCurrency:', currentExpense?.expenseCurrency);

  const defaultValues = useMemo(
    () => ({
      expenseType: currentExpense?.expenseType ? String(currentExpense.expenseType) : '',
      expenseDate: currentExpense?.expenseDate || '',
      expenseBy: currentExpense?.expenseBy || '',

      // ✅ FIXED: Handle corrupted data and fallback properly
      originalExpenseAmount:
        typeof currentExpense?.originalExpenseAmount === 'number' &&
        currentExpense?.originalExpenseAmount > 0
          ? currentExpense.originalExpenseAmount
          : currentExpense?.expenseAmount || 0,

      expenseSettlementNotes: currentExpense?.expenseSettlementNotes || '',
      expenseApprovalStatus:
        currentExpense?.expenseApprovalStatus === true
          ? 'approved'
          : currentExpense?.expenseApprovalStatus === false
            ? 'rejected'
            : 'pending',
      expenseApprovedBy: currentExpense?.expenseApprovedBy || '',
      expenseApprovedDate: currentExpense?.expenseApprovedDate || '',
      expenseApprovedAmount: currentExpense?.expenseApprovedAmount || 0,
      externalTransactionId: currentExpense?.externalTransactionId || '',
      originalTransactionDate: currentExpense?.originalTransactionDate || '',
      fileLocation: currentExpense?.fileLocation || '',

      // ✅ FIXED: Handle corrupted data properly
      originalExpenseCurrency:
        currentExpense?.originalExpenseCurrency && currentExpense.originalExpenseCurrency !== 'SAR'
          ? currentExpense.originalExpenseCurrency
          : currentExpense?.expenseCurrency || 'SAR',
    }),
    [currentExpense]
  );

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(ExpenseSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentExpense) {
      reset(defaultValues);
    }
  }, [currentExpense, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const expenseData = {
        expenseType: data.expenseType,
        expenseDate: data.expenseDate,
        expenseBy: data.expenseBy,
        expenseSettlementNotes: data.expenseSettlementNotes || null, // RENAMED

        // Send original amount and currency
        originalExpenseAmount: Number(data.originalExpenseAmount), // RENAMED
        originalExpenseCurrency: data.originalExpenseCurrency, // RENAMED
        expenseAmount: 0, // Backend will calculate this

        externalTransactionId: data.externalTransactionId || null,
        expenseApprovalStatus:
          data.expenseApprovalStatus === 'approved'
            ? true
            : data.expenseApprovalStatus === 'rejected'
              ? false
              : null,
        expenseApprovedBy: data.expenseApprovedBy || null,
        expenseApprovedDate: data.expenseApprovedDate || null,
        expenseApprovedAmount: data.expenseApprovedAmount
          ? Number(data.expenseApprovedAmount)
          : null,
        originalTransactionDate: data.originalTransactionDate || null,
        fileLocation: data.fileLocation || null,
      };

      if (currentExpense) {
        await apiHelper.updateExpense(currentExpense.referenceId, expenseData);
        toast.success('Expense updated successfully!');
      } else {
        await apiHelper.createExpense(expenseData);
        toast.success('Expense created successfully!');
      }

      router.push(paths.dashboard.expense.root);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(currentExpense ? 'Failed to update expense!' : 'Failed to create expense!');
    }
  });

  const renderBasicInfo = (
    <Card>
      <Box
        sx={{
          p: 3,
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
        }}
      >
        <Typography variant="h6" sx={{ gridColumn: '1 / -1', mb: 0 }}>
          Basic Information
        </Typography>

        <Field.Select name="expenseType" label="Expense Type" InputLabelProps={{ shrink: true }}>
          {EXPENSE_TYPES.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.label}
            </MenuItem>
          ))}
        </Field.Select>

        <Field.DatePicker name="expenseDate" label="Expense Date" />

        <Field.Text
          name="originalExpenseAmount"
          label="Amount"
          placeholder="0.00"
          type="number"
          InputLabelProps={{ shrink: true }}
        />

        <Field.Text
          name="expenseBy"
          label="Expense By (Employee ID)"
          placeholder="1"
          type="number"
          InputLabelProps={{ shrink: true }}
        />

        <Field.Text
          name="expenseSettlementNotes"
          label="Settlement Notes"
          placeholder="Enter settlement notes or description"
          multiline
          rows={3}
        />

        <Field.Select
          name="originalExpenseCurrency"
          label="Currency"
          InputLabelProps={{ shrink: true }}
        >
          {EXPENSE_CURRENCIES.map((currency) => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </Field.Select>

        <Field.Text
          name="externalTransactionId"
          label="External Transaction ID"
          placeholder="Optional"
        />
      </Box>
    </Card>
  );

  const renderApprovalInfo = (
    <Card>
      <Box
        sx={{
          p: 3,
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
        }}
      >
        <Typography variant="h6" sx={{ gridColumn: '1 / -1', mb: 0 }}>
          Approval Information
        </Typography>

        <Field.Select
          name="expenseApprovalStatus"
          label="Approval Status"
          InputLabelProps={{ shrink: true }}
        >
          {EXPENSE_APPROVAL_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status.value} value={status.value}>
              {status.label}
            </MenuItem>
          ))}
        </Field.Select>

        <Field.Text name="expenseApprovedBy" label="Approved By" placeholder="Optional" />

        <Field.DatePicker name="expenseApprovedDate" label="Approved Date" />

        <Field.Text
          name="expenseApprovedAmount"
          label="Approved Amount"
          placeholder="0.00"
          type="number"
          InputLabelProps={{ shrink: true }}
        />
      </Box>
    </Card>
  );

  const renderAdditionalInfo = (
    <Card>
      <Box
        sx={{
          p: 3,
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
        }}
      >
        <Typography variant="h6" sx={{ gridColumn: '1 / -1', mb: 0 }}>
          Additional Information
        </Typography>
        <Field.DatePicker name="originalTransactionDate" label="Original Transaction Date" />
        <Field.Text name="fileLocation" label="Receipt URL" placeholder="Optional" />
      </Box>
    </Card>
  );

  const renderActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        variant="outlined"
        onClick={() => router.back()}
      >
        Cancel
      </LoadingButton>

      <LoadingButton
        fullWidth
        type="submit"
        size="large"
        variant="contained"
        loading={isSubmitting}
      >
        {currentExpense ? 'Update Expense' : 'Create Expense'}
      </LoadingButton>
    </Box>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {renderBasicInfo}
            {renderApprovalInfo}
            {renderAdditionalInfo}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>{renderActions}</Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
