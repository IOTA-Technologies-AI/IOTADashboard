'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react'; // ✅ Added useState
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress'; // ✅ Added for loading state

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { clearFormData } from 'src/hooks/use-form-autosave';

import { fCurrency } from 'src/utils/format-number'; // ✅ Added for formatting
import { apiHelper, getCostCenters } from 'src/utils/apiHelper';
import { getOneDriveToken, seedOneDriveToken, refreshAccessToken } from 'src/utils/onedrive-helper';
import {
  EXPENSE_TYPES,
  EXPENSE_CURRENCIES,
  EXPENSE_APPROVAL_STATUS_OPTIONS,
} from 'src/utils/constants/enums';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { UploadBox } from 'src/components/upload/box/upload-box';

import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';
import { useMicrosoftProfile } from 'src/auth/hooks/use-microsoft-profile';

// ----------------------------------------------------------------------
const INVOICE_AGAINST_INVOICE_TYPE = 18;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ExpenseSchema = zod.object({
  expenseType: zod.coerce.number().min(1, { message: 'Expense type is required!' }),
  expenseDate: zod.string().min(1, { message: 'Expense date is required!' }),
  originalExpenseAmount: zod.number().min(0.01, { message: 'Amount must be greater than 0!' }),
  expenseBy: zod.string().min(1, { message: 'Expense by is required!' }),
  costcenterId: zod.union([zod.string(), zod.number()]).refine(
    (val) => {
      // Convert to string and check if it's a valid non-empty value
      const strVal = String(val).trim();
      return strVal !== '' && strVal !== 'null' && strVal !== 'undefined';
    },
    {
      message: 'Cost Center is required!',
    }
  ),
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
  // ✅ VAT exemption
  isVATExempt: zod.boolean().optional(),
});

// ----------------------------------------------------------------------

export function ExpenseNewEditForm({ currentExpense }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { profile } = useMicrosoftProfile();
  const { users: microsoftUsers, loading: loadingUsers } = useMicrosoftUsers();

  const roleIdToName = {
    1: 'regular',
    2: 'manager',
    3: 'admin',
    4: 'superAdmin',
  };

  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';

  // ✅ Added state for AR invoices
  const [arInvoices, setArInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [costCenters, setCostCenters] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentError, setAttachmentError] = useState('');

  const sanitizeFileName = (fileName) => {
    const parts = fileName.split('.');
    const ext = (parts.pop() || '').toLowerCase();
    const safeBase = parts
      .join('.')
      .replace(/[^a-z0-9-_]+/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80);

    const finalExt = ext ? `.${ext}` : '';
    return `${safeBase || 'attachment'}${finalExt}`;
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result?.toString() || '';
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getAttachmentFolder = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = MONTH_NAMES[now.getMonth()];
    return `Accounts/Expense Attachments/${year}/${month}`;
  };

  const encodeGraphPath = (path) => path.split('/').map(encodeURIComponent).join('/');

  const uploadViaSimplePut = async ({ accessToken, file, folderPath, fileName }) => {
    const encodedPath = encodeGraphPath(folderPath);
    const targetUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}/${encodeURIComponent(fileName)}:/content`;

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Upload failed');
    }

    return res.json();
  };

  const uploadViaSession = async ({ accessToken, file, folderPath, fileName }) => {
    const encodedPath = encodeGraphPath(folderPath);
    const sessionRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}/${encodeURIComponent(fileName)}:/createUploadSession`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
            name: fileName,
            description: 'Expense attachment upload',
          },
        }),
      }
    );

    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      throw new Error(text || 'Failed to start upload session');
    }

    const session = await sessionRes.json();
    const uploadUrl = session.uploadUrl;
    if (!uploadUrl) throw new Error('Missing upload URL');

    const chunkSize = 320 * 1024; // 320KB chunks keep memory low
    let start = 0;
    let lastResponse = null;

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': `${chunk.size}`,
          'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
        },
        body: chunk,
      });

      if (!(res.status === 200 || res.status === 201 || res.status === 202)) {
        const text = await res.text();
        throw new Error(text || 'Chunk upload failed');
      }

      lastResponse = await res.json();
      start = end;
    }

    return lastResponse;
  };

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
  console.log('🔍 costcenterId:', currentExpense?.costcenterId);

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
      // ✅ VAT exemption default
      isVATExempt: currentExpense?.isVATExempt || false,
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
    formState: { isSubmitting, errors },
  } = methods;

  // Debug: Log form validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('🔴 Form validation errors:', errors);
    }
  }, [errors]);

  // ✅ Watch expense type to show/hide invoice dropdown
  const watchedExpenseType = watch('expenseType');
  const watchedApprovalStatus = watch('expenseApprovalStatus');
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
      console.log('[ExpenseForm] Fetching cost centers...');
      const list = await getCostCenters();
      console.log('[ExpenseForm] Cost centers received:', list);
      if (active && list && list.length > 0) {
        setCostCenters(list);
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

  // ✅ Auto-fill approval fields when status changes to "approved" or "rejected"
  useEffect(() => {
    if (
      (watchedApprovalStatus === 'approved' || watchedApprovalStatus === 'rejected') &&
      isSuperAdmin
    ) {
      // Get current user's display name
      const approverName = profile?.displayName || user?.displayName || user?.email || '';
      const currentApprovedBy = watch('expenseApprovedBy');
      const currentApprovedDate = watch('expenseApprovedDate');
      const currentApprovedAmount = watch('expenseApprovedAmount');
      const originalAmount = watch('originalExpenseAmount');

      // Only auto-fill if fields are empty
      if (!currentApprovedBy) {
        setValue('expenseApprovedBy', approverName);
      }
      if (!currentApprovedDate) {
        setValue('expenseApprovedDate', new Date().toISOString());
      }
      // Auto-fill approved amount from original amount when approving
      if (
        watchedApprovalStatus === 'approved' &&
        (!currentApprovedAmount || currentApprovedAmount === 0) &&
        originalAmount > 0
      ) {
        setValue('expenseApprovedAmount', originalAmount);
      }
    }
  }, [watchedApprovalStatus, isSuperAdmin, profile, user, setValue, watch]);

  const handleAttachmentUpload = async (files) => {
    const file = files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const message = 'Only pdf, doc, docx, png, and jpg files are allowed.';
      setAttachmentError(message);
      toast.error(message);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      const message = 'File size exceeds 20MB limit.';
      setAttachmentError(message);
      toast.error(message);
      return;
    }

    setAttachmentError('');
    setUploadingAttachment(true);

    try {
      const safeName = sanitizeFileName(file.name);
      const folderPath = getAttachmentFolder();
      const { accessToken, refreshToken } = getTokens();

      if (!accessToken) {
        throw new Error('Missing Microsoft access token. Please reconnect your account.');
      }

      const useSession = file.size > 3.5 * 1024 * 1024; // >3.5MB => upload session

      const uploadFn = async (token) => {
        if (useSession) {
          return uploadViaSession({ accessToken: token, file, folderPath, fileName: safeName });
        }
        return uploadViaSimplePut({ accessToken: token, file, folderPath, fileName: safeName });
      };

      let uploadResponse;
      try {
        uploadResponse = await uploadFn(accessToken);
      } catch (err) {
        if (refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          const newAccess = refreshed.access_token || refreshed.accessToken;
          const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;
          if (newAccess) {
            seedOneDriveToken(newAccess, newRefresh);
            uploadResponse = await uploadFn(newAccess);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const uploadedUrl =
        uploadResponse?.webUrl ||
        uploadResponse?.['@microsoft.graph.downloadUrl'] ||
        uploadResponse?.id;

      if (!uploadedUrl) {
        throw new Error('Upload did not return a file URL.');
      }

      setValue('fileLocation', uploadedUrl);
      setAttachmentName(safeName);
      toast.success('Attachment uploaded to OneDrive.');
    } catch (error) {
      console.error('Attachment upload failed:', error);
      const message =
        error?.message || 'Failed to upload attachment. Please try again with a valid file.';
      setAttachmentError(message);
      toast.error(message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    console.log('🟢 onSubmit called with data:', data);
    try {
      if (uploadingAttachment) {
        toast.error('Please wait for the attachment upload to finish.');
        return;
      }

      if (currentExpense && !isSuperAdmin) {
        toast.error('Only super admins can edit expenses');
        return;
      }

      const resolvedStatus = isSuperAdmin ? data.expenseApprovalStatus : 'pending';

      // Build expenseData, omitting empty optional fields
      const expenseData = {
        expenseType: data.expenseType,
        expenseDate: data.expenseDate,
        expenseBy: data.expenseBy,

        // Send original amount and currency
        originalExpenseAmount: Number(data.originalExpenseAmount),
        originalExpenseCurrency: data.originalExpenseCurrency,
        expenseAmount: 0, // Backend will calculate this

        expenseApprovalStatus:
          resolvedStatus === 'approved' ? true : resolvedStatus === 'rejected' ? false : null,
      };

      // Only include optional string fields if they have a value
      if (data.expenseSettlementNotes)
        expenseData.expenseSettlementNotes = data.expenseSettlementNotes;
      if (data.externalTransactionId)
        expenseData.externalTransactionId = data.externalTransactionId;
      if (data.fileLocation) expenseData.fileLocation = data.fileLocation;
      if (data.originalTransactionDate)
        expenseData.originalTransactionDate = data.originalTransactionDate;

      // Linked invoice fields - only include if expense type is "Invoice Against Invoice"
      if (data.linkedInvoiceNumber) expenseData.linkedInvoiceNumber = data.linkedInvoiceNumber;
      if (data.linkedInvoiceId) expenseData.linkedInvoiceId = data.linkedInvoiceId;
      if (data.linkedInvoiceAmount)
        expenseData.linkedInvoiceAmount = Number(data.linkedInvoiceAmount);

      // Cost center
      if (data.costcenterId) expenseData.costcenterId = Number(data.costcenterId);

      // VAT exemption
      expenseData.isVATExempt = data.isVATExempt || false;

      // Super admin only fields
      if (isSuperAdmin) {
        if (data.expenseApprovedBy) expenseData.expenseApprovedBy = data.expenseApprovedBy;
        if (data.expenseApprovedDate) expenseData.expenseApprovedDate = data.expenseApprovedDate;
        if (data.expenseApprovedAmount)
          expenseData.expenseApprovedAmount = Number(data.expenseApprovedAmount);
      }

      if (currentExpense) {
        await apiHelper.updateExpense(currentExpense.referenceId, expenseData);
        toast.success('Expense updated successfully!');
      } else {
        // Backend handles approval email notifications via Resend
        await apiHelper.createExpense(expenseData);
        toast.success('Expense created successfully!');
        clearFormData('expenseForm'); // Clear autosaved form data
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

        <Field.Select
          name="expenseBy"
          label="Expense By"
          InputLabelProps={{ shrink: true }}
          displayEmpty
        >
          <MenuItem value="">
            <em>{loadingUsers ? 'Loading users...' : 'Select user'}</em>
          </MenuItem>
          {microsoftUsers.map((msUser) => (
            <MenuItem key={msUser.id} value={msUser.name}>
              {msUser.name} {msUser.email ? `(${msUser.email})` : ''}
            </MenuItem>
          ))}
        </Field.Select>

        <Field.Select
          name="costcenterId"
          label="Cost Center"
          InputLabelProps={{ shrink: true }}
          displayEmpty
          required
        >
          <MenuItem value="">
            <em>Select cost center</em>
          </MenuItem>
          {costCenters.map((cc) => (
            <MenuItem key={cc.id} value={String(cc.id)}>
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

        {/* ✅ VAT Exemption Checkbox */}
        <Field.Checkbox
          name="isVATExempt"
          label="VAT Exempt"
          helperText="Check if this expense is VAT exempt (VAT will be calculated as 0)"
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
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Typography variant="h6" sx={{ gridColumn: '1 / -1', mb: 0 }}>
          Additional Information
        </Typography>
        <Field.DatePicker
          name="originalTransactionDate"
          label="Original Transaction Date"
          slotProps={{ textField: { fullWidth: true } }}
        />

        <Stack spacing={1.5} sx={{ minHeight: 1 }}>
          <Typography variant="subtitle2">Receipt attachment</Typography>
          <UploadBox
            accept={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'image/png': ['.png'],
              'image/jpeg': ['.jpg', '.jpeg'],
            }}
            multiple={false}
            maxFiles={1}
            disabled={uploadingAttachment}
            onDrop={handleAttachmentUpload}
            onDropRejected={() =>
              toast.error('Only pdf, doc, docx, png, and jpg files under 20MB are allowed.')
            }
            placeholder={
              <Stack spacing={1} alignItems="center">
                <Iconify icon="eva:cloud-upload-fill" width={28} />
                <Typography variant="body2" color="text.secondary" align="center">
                  Drop receipt here, or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center">
                  Allowed: pdf, doc, docx, png, jpg. Max 20MB.
                </Typography>
              </Stack>
            }
            sx={{
              width: '100%',
            }}
          />

          {uploadingAttachment && <LinearProgress />}

          {attachmentName ? (
            <Chip
              color="success"
              variant="outlined"
              icon={<Iconify icon="eva:checkmark-circle-2-fill" width={18} />}
              label={`Uploaded: ${attachmentName}`}
            />
          ) : null}

          {attachmentError ? <Alert severity="error">{attachmentError}</Alert> : null}

          <Field.Text
            name="fileLocation"
            label="Receipt URL"
            placeholder="Auto-filled after upload"
            InputLabelProps={{ shrink: true }}
            helperText="We save attachments to OneDrive → Accounts/Expense Attachments/YYYY/Mon"
          />
        </Stack>
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

      {/* Only show submit button if:
          1. Creating new expense (no currentExpense), OR
          2. Editing and user is superAdmin AND expense is pending approval */}
      {(!currentExpense ||
        (isSuperAdmin &&
          (currentExpense?.expenseApprovalStatus === null ||
            currentExpense?.expenseApprovalStatus === undefined))) && (
        <LoadingButton
          fullWidth
          type="submit"
          size="large"
          variant="contained"
          loading={isSubmitting}
          disabled={uploadingAttachment}
        >
          {currentExpense ? 'Approve Expense' : 'Create Expense'}
        </LoadingButton>
      )}
    </Box>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {currentExpense && !isSuperAdmin && (
              <Alert severity="error">
                Only super admins can edit expenses. You have view-only access.
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
