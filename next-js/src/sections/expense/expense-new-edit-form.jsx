'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react'; // ✅ Added useState
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress'; // ✅ Added for loading state

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number'; // ✅ Added for formatting
import { apiHelper, getCostCenters } from 'src/utils/apiHelper';
import {
  EXPENSE_TYPES,
  EXPENSE_CURRENCIES,
  EXPENSE_APPROVAL_STATUS_OPTIONS,
} from 'src/utils/constants/enums';
import { getOneDriveToken, refreshAccessToken, seedOneDriveToken } from 'src/utils/onedrive-helper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftProfile } from 'src/auth/hooks/use-microsoft-profile';

// ----------------------------------------------------------------------
const INVOICE_AGAINST_INVOICE_TYPE = 18;

const ExpenseSchema = zod.object({
  expenseType: zod.coerce.number().min(1, { message: 'Expense type is required!' }),
  expenseDate: zod.string().min(1, { message: 'Expense date is required!' }),
  originalExpenseAmount: zod.number().min(0.01, { message: 'Amount must be greater than 0!' }),
  expenseBy: zod.number().min(1, { message: 'Expense by is required!' }),
  costcenterId: zod.union([zod.string(), zod.number()]).optional().nullable(),
  expenseSettlementNotes: zod.string().optional(),
  originalExpenseCurrency: zod.string().min(1, { message: 'Currency is required!' }),
  externalTransactionId: zod.string().optional(),
  expenseApprovalStatus: zod.string().optional(),
  expenseApprovedBy: zod.string().optional(),
  expenseApprovedDate: zod.string().optional(),
  expenseApprovedAmount: zod.number().optional(),
  originalTransactionDate: zod.string().optional(),
  fileLocation: zod.string().optional(),
  // ✅ Added linked invoice fields
  linkedInvoiceNumber: zod.string().optional(),
  linkedInvoiceId: zod.string().optional(),
  linkedInvoiceAmount: zod.number().optional(),
});

// ----------------------------------------------------------------------

export function ExpenseNewEditForm({ currentExpense }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { profile } = useMicrosoftProfile();

  const roleIdToName = {
    1: 'regular',
    2: 'manager',
    3: 'admin',
    4: 'superAdmin',
  };

  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';
  const isAdminOrSuper = normalizedRole === 'admin' || normalizedRole === 'superAdmin';

  // ✅ Added state for AR invoices
  const [arInvoices, setArInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [costCenters, setCostCenters] = useState([]);

  const getTokens = () => {
    const stored = getOneDriveToken();
    return {
      accessToken: stored.accessToken || user?.provider_token || user?.providerToken,
      refreshToken:
        stored.refreshToken || user?.provider_refresh_token || user?.providerRefreshToken,
    };
  };

  const fetchWithAuth = async (url, init, refreshToken) => {
    const response = await fetch(url, init);

    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      const newAccess = refreshed.access_token || refreshed.accessToken;
      const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

      if (newAccess) {
        seedOneDriveToken(newAccess, newRefresh);
        const retryInit = {
          ...init,
          headers: { ...init.headers, Authorization: `Bearer ${newAccess}` },
        };
        return fetch(url, retryInit);
      }
    }

    return response;
  };

  const notifyManagerForApproval = async (createdExpense, submittedExpense) => {
    const managerEmail = profile?.managerEmail;
    if (!managerEmail) {
      console.warn('No manager email found for approval notification');
      return;
    }

    const { accessToken, refreshToken } = getTokens();
    if (!accessToken) {
      console.warn('No Microsoft token available for approval email');
      return;
    }

    const subject = `Expense ${createdExpense?.referenceId || ''} awaiting your approval`;
    const amount = submittedExpense?.originalExpenseAmount || submittedExpense?.expenseAmount;
    const currency = submittedExpense?.originalExpenseCurrency || 'SAR';
    const submitter = profile?.displayName || user?.displayName || user?.email || 'A team member';
    const expenseDate = submittedExpense?.expenseDate;

    const mailPayload = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: `
            <p>Hello,</p>
            <p>${submitter} submitted an expense that needs your approval.</p>
            <ul>
              <li><strong>Amount:</strong> ${amount ? `${amount} ${currency}` : 'N/A'}</li>
              <li><strong>Date:</strong> ${expenseDate || 'N/A'}</li>
              <li><strong>Reference:</strong> ${createdExpense?.referenceId || createdExpense?.id || 'N/A'}</li>
            </ul>
            <p>Please review and approve it in the dashboard.</p>
          `,
        },
        toRecipients: [{ emailAddress: { address: managerEmail } }],
      },
      saveToSentItems: false,
    };

    const init = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    };

    const res = await fetchWithAuth(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      init,
      refreshToken
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to send approval email');
    }
  };
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
      costcenterId: currentExpense?.costcenterId ? String(currentExpense.costcenterId) : '',

      // ✅ FIXED: Handle corrupted data and fallback properly
      originalExpenseAmount:
        typeof currentExpense?.originalExpenseAmount === 'number' &&
        currentExpense?.originalExpenseAmount > 0
          ? currentExpense.originalExpenseAmount
          : currentExpense?.expenseAmount || 0,

      expenseSettlementNotes: currentExpense?.expenseSettlementNotes || '',
      expenseApprovalStatus: isSuperAdmin
        ? currentExpense?.expenseApprovalStatus === true
          ? 'approved'
          : currentExpense?.expenseApprovalStatus === false
            ? 'rejected'
            : 'pending'
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

      // ✅ Added linked invoice defaults
      linkedInvoiceNumber: currentExpense?.linkedInvoiceNumber || '',
      linkedInvoiceId: currentExpense?.linkedInvoiceId || '',
      linkedInvoiceAmount: currentExpense?.linkedInvoiceAmount || 0,
    }),
    [currentExpense, isSuperAdmin]
  );

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(ExpenseSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // ✅ Watch expense type to show/hide invoice dropdown
  const watchedExpenseType = watch('expenseType');
  const showInvoiceDropdown = Number(watchedExpenseType) === INVOICE_AGAINST_INVOICE_TYPE;

  // ✅ Fetch AR invoices on mount
  useEffect(() => {
    const fetchARInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const response = await apiHelper.getAccountsReceivable();
        setArInvoices(response.invoices || []);
      } catch (error) {
        console.error('Failed to fetch AR invoices:', error);
        setArInvoices([]);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchARInvoices();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await getCostCenters();
      if (active) {
        setCostCenters(list || []);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ✅ Clear linked invoice fields when expense type changes away from "Invoice Against Invoice"
  useEffect(() => {
    if (Number(watchedExpenseType) !== INVOICE_AGAINST_INVOICE_TYPE) {
      setValue('linkedInvoiceNumber', '');
      setValue('linkedInvoiceId', '');
      setValue('linkedInvoiceAmount', 0);
    }
  }, [watchedExpenseType, setValue]);

  useEffect(() => {
    if (currentExpense) {
      reset(defaultValues);
    }
  }, [currentExpense, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (currentExpense && !isAdminOrSuper) {
        toast.error('Only admins and super admins can edit expenses');
        return;
      }

      const resolvedStatus = isSuperAdmin ? data.expenseApprovalStatus : 'pending';

      const expenseData = {
        expenseType: data.expenseType,
        expenseDate: data.expenseDate,
        expenseBy: data.expenseBy,
        expenseSettlementNotes: data.expenseSettlementNotes || null,

        // Send original amount and currency
        originalExpenseAmount: Number(data.originalExpenseAmount),
        originalExpenseCurrency: data.originalExpenseCurrency,
        expenseAmount: 0, // Backend will calculate this

        externalTransactionId: data.externalTransactionId || null,
        expenseApprovalStatus:
          resolvedStatus === 'approved' ? true : resolvedStatus === 'rejected' ? false : null,
        expenseApprovedBy: isSuperAdmin ? data.expenseApprovedBy || null : null,
        expenseApprovedDate: isSuperAdmin ? data.expenseApprovedDate || null : null,
        expenseApprovedAmount:
          isSuperAdmin && data.expenseApprovedAmount ? Number(data.expenseApprovedAmount) : null,
        originalTransactionDate: data.originalTransactionDate || null,
        fileLocation: data.fileLocation || null,

        // ✅ Added linked invoice fields
        linkedInvoiceNumber: data.linkedInvoiceNumber || null,
        linkedInvoiceId: data.linkedInvoiceId || null,
        linkedInvoiceAmount: data.linkedInvoiceAmount ? Number(data.linkedInvoiceAmount) : null,
        costcenterId: data.costcenterId ? Number(data.costcenterId) : null,
      };

      if (currentExpense) {
        await apiHelper.updateExpense(currentExpense.referenceId, expenseData);
        toast.success('Expense updated successfully!');
      } else {
        const createdExpense = await apiHelper.createExpense(expenseData);
        try {
          await notifyManagerForApproval(createdExpense, expenseData);
        } catch (notifyError) {
          console.warn('Failed to send approval email:', notifyError);
          toast.error('Expense created, but failed to notify manager.');
        }
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

        {/* ✅ Invoice dropdown - only shown when "Invoice Against Invoice" is selected */}
        {showInvoiceDropdown && (
          <Field.Select
            name="linkedInvoiceNumber"
            label="Select Invoice"
            InputLabelProps={{ shrink: true }}
            helperText="Select the AR invoice this expense is linked to"
          >
            {loadingInvoices ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} /> Loading invoices...
              </MenuItem>
            ) : arInvoices.length === 0 ? (
              <MenuItem disabled>No invoices found</MenuItem>
            ) : (
              arInvoices.map((invoice) => (
                <MenuItem
                  key={invoice.invoiceNumber}
                  value={invoice.invoiceNumber}
                  onClick={() => {
                    setValue('linkedInvoiceId', invoice.id?.toString() || '');
                    setValue('linkedInvoiceAmount', invoice.totalAmount || 0);
                  }}
                >
                  {invoice.invoiceNumber} - {invoice.customerName} -{' '}
                  {fCurrency(invoice.totalAmount)} {invoice.currencyCode || 'SAR'}
                </MenuItem>
              ))
            )}
          </Field.Select>
        )}

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

        <Field.Select
          name="costcenterId"
          label="Cost Center"
          InputLabelProps={{ shrink: true }}
          displayEmpty
        >
          <MenuItem value="">
            <em>Select cost center</em>
          </MenuItem>
          {costCenters.map((cc) => (
            <MenuItem key={cc.id} value={cc.id}>
              {cc.name || `Cost Center ${cc.id}`}
            </MenuItem>
          ))}
        </Field.Select>

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
          disabled={!isSuperAdmin}
          helperText={
            !isSuperAdmin ? 'Regular users default to Pending until manager approval.' : undefined
          }
        >
          {(isSuperAdmin
            ? EXPENSE_APPROVAL_STATUS_OPTIONS
            : [EXPENSE_APPROVAL_STATUS_OPTIONS[0]]
          ).map((status) => (
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
        disabled={currentExpense ? !isAdminOrSuper : false}
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
            {currentExpense && !isAdminOrSuper && (
              <Alert severity="error">
                Only admins and super admins can edit expenses. You have view-only access.
              </Alert>
            )}
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
