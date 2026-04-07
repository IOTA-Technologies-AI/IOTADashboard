import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import CircularProgress from '@mui/material/CircularProgress';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today, fIsAfter } from 'src/utils/format-time';
import { createInvoice, updateInvoice, getCostCenters, getInvoiceTypes } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Field, Form, schemaUtils } from 'src/components/hook-form';
import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';

import { InvoiceCreateEditStatusDate } from './invoice-create-edit-status-date';
import { defaultItem, InvoiceCreateEditDetails } from './invoice-create-edit-details';
import { IOTA_OFFICES, InvoiceCreateEditAddress } from './invoice-create-edit-address';

// Currency symbol map for IOTA offices
const CURRENCY_SYMBOLS = {
  SAR: 'ر.س',
  AED: 'د.إ',
  INR: '₹',
  GBP: '£',
  USD: '$',
  EUR: '€',
};

// --------------------------------------------

export const InvoiceCreateSchema = z
  .object({
    invoiceTo: schemaUtils.nullableInput(z.custom(), {
      error: 'Invoice to is required!',
    }),
    createDate: schemaUtils.date({ error: { required: 'Create date is required!' } }),
    dueDate: schemaUtils.date({ error: { required: 'Due date is required!' } }),
    items: z.array(
      z.object({
        title: z.string().min(1, { error: 'Title is required!' }),
        service: z.string().optional(),
        quantity: z.number().int().positive().min(1, { error: 'Quantity must be more than 0' }),
        price: z.number(),
        total: z.number(),
        description: z.string(),
      })
    ),
    taxes: z.number(),
    status: z.string(),
    discount: z.number(),
    shipping: z.number(),
    subtotal: z.number(),
    totalAmount: z.number(),
    vatAmount: z.number(),
    vatRate: z.number(),
    invoiceNumber: z.string(),
    invoiceFrom: z.custom().nullable(),
    costcenterId: z.union([z.string(), z.number()]).optional().nullable(),
    // Invoice type (replaces isEmployeeRelated checkbox)
    invoiceTypeId: z.union([z.string(), z.number()]).optional().nullable(),
    invoiceTypeName: z.string().optional(),
    // Employee-related invoice fields
    isEmployeeRelated: z.boolean().optional(),
    employeeId: z.string().optional(),
    employeeName: z.string().optional(),
  })
  .refine((val) => !fIsAfter(val.createDate, val.dueDate), {
    error: 'Due date cannot be earlier than create date!',
    path: ['dueDate'],
  })
  .superRefine((val, ctx) => {
    if (val.isEmployeeRelated && !val.employeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Linked employee is required for this invoice type.',
        path: ['employeeId'],
      });
    }
  });

// ----------------------------------------------------------------------

export function InvoiceCreateEditForm({ currentInvoice }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { users: microsoftUsers, loading: loadingUsers } = useMicrosoftUsers();

  const loadingSave = useBoolean();
  const loadingSend = useBoolean();
  const [costCenters, setCostCenters] = useState([]);
  const [invoiceTypes, setInvoiceTypes] = useState([]);

  const roleIdToName = {
    1: 'regular',
    2: 'manager',
    3: 'admin',
    4: 'superAdmin',
  };

  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canEditByRole = normalizedRole === 'superAdmin';

  const isEdit = !!currentInvoice?.id;

  // Paid/approved invoices cannot be edited; rejected invoices CAN be re-edited and resubmitted
  const isNotEditable = currentInvoice?.status === 'paid' || currentInvoice?.status === 'approved';
  const isRejected = currentInvoice?.status === 'rejected';
  const canSubmitChanges = isEdit ? canEditByRole && !isNotEditable : !isNotEditable;

  const defaultValues = {
    invoiceNumber: `INV-${Date.now()}`,
    createDate: today(),
    dueDate: null,
    taxes: 0,
    shipping: 0,
    status: 'draft',
    discount: 0,
    invoiceFrom: IOTA_OFFICES[0],
    invoiceTo: null,
    costcenterId: '',
    invoiceTypeId: '',
    invoiceTypeName: '',
    isEmployeeRelated: false,
    employeeId: '',
    employeeName: '',
    subtotal: 0,
    total: 0,
    items: [defaultItem],
    vatAmount: 0,
    vatRate: 0,
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(InvoiceCreateSchema),
    defaultValues,
    values: currentInvoice,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const watchedInvoiceTypeId = watch('invoiceTypeId');
  const watchedEmployeeId = watch('employeeId');
  // Derive isEmployeeRelated from the selected invoice type
  const selectedInvoiceType = invoiceTypes.find((t) => t.id === Number(watchedInvoiceTypeId));
  const isEmployeeRelated = selectedInvoiceType?.isEmployeeRelated ?? false;

  // ✅ Save as Draft - Only for draft/pending invoices
  useEffect(() => {
    let active = true;
    (async () => {
      const [centers, types] = await Promise.all([getCostCenters(), getInvoiceTypes()]);
      if (active) {
        setCostCenters(centers || []);
        setInvoiceTypes(types || []);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveAsDraft = handleSubmit(async (data) => {
    if (isEdit && !canEditByRole) {
      toast.error('Only admins and super admins can edit invoices');
      return;
    }

    if (!canSubmitChanges) {
      toast.error('Cannot edit paid or approved invoices');
      return;
    }

    // Guard: employee required when type is employee-related
    if (isEmployeeRelated && !data.employeeId) {
      toast.error('Please select a linked employee for this invoice type.');
      return;
    }

    loadingSave.onTrue();

    try {
      const invoiceData = {
        ...(!isEdit && { invoiceId: `INV-${Date.now()}` }),
        invoiceNumber: data.invoiceNumber,
        customerId: data.invoiceTo?.id ? String(data.invoiceTo.id) : null,
        customerName: data.invoiceTo?.name || '',
        companyName: data.invoiceTo?.name || '',
        createdByEmail: user?.email || '',
        invoiceDate: data.createDate,
        dueDate: data.dueDate,
        status: 'draft', // Save as draft
        total: parseFloat((data.totalAmount || 0).toFixed(2)),
        balance: parseFloat((data.totalAmount || 0).toFixed(2)),
        currencyCode: data.invoiceFrom?.currency || 'SAR',
        currencySymbol: CURRENCY_SYMBOLS[data.invoiceFrom?.currency] || 'ر.س',
        exchangeRate: 1,
        costcenterId: data.costcenterId ? Number(data.costcenterId) : null,
        baseAmount: parseFloat((data.subtotal || 0).toFixed(2)),
        vatAmount: parseFloat((data.vatAmount || 0).toFixed(2)),
        vatRate: parseFloat((data.vatRate || 0).toFixed(2)),
        shippingCharge: parseFloat((data.shipping || 0).toFixed(2)),
        // Serialize line items (title + description + price) as JSON into the description column
        description: JSON.stringify(
          (data.items || []).map((item) => ({
            title: item.title || '',
            description: item.description || '',
            price: parseFloat((item.price || 0).toFixed(2)),
          }))
        ),
        // Invoice type fields
        invoiceTypeId: data.invoiceTypeId ? Number(data.invoiceTypeId) : null,
        invoiceTypeName: data.invoiceTypeName || selectedInvoiceType?.invoiceTypeDesc || null,
        // Employee-related fields (derived from invoice type)
        isEmployeeRelated: isEmployeeRelated,
        ...(isEmployeeRelated && data.employeeId && { employeeId: data.employeeId }),
        ...(isEmployeeRelated && data.employeeName && { employeeName: data.employeeName }),
        ...(!isEdit && {
          createdAt: new Date().toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      };

      console.log(`📤 ${isEdit ? 'Updating' : 'Creating'} invoice as draft:`, invoiceData);

      const savedInvoice = isEdit
        ? await updateInvoice(currentInvoice.id, invoiceData)
        : await createInvoice(invoiceData);

      console.log(`✅ Invoice ${isEdit ? 'updated' : 'created'}:`, savedInvoice);
      toast.success(`Invoice ${isEdit ? 'updated' : 'saved as draft'}!`);

      reset();
      loadingSave.onFalse();
      router.push(paths.dashboard.invoice.root);
    } catch (error) {
      console.error(`❌ Failed to ${isEdit ? 'update' : 'save'} invoice:`, error);
      toast.error(
        `Failed to ${isEdit ? 'update' : 'save'} invoice: ${error.message || 'Unknown error'}`
      );
      loadingSave.onFalse();
    }
  });

  // ✅ Submit for Approval - Changes status to "pending" (waiting for approver)
  const handleSubmitForApproval = handleSubmit(async (data) => {
    if (isEdit && !canEditByRole) {
      toast.error('Only admins and super admins can edit invoices');
      return;
    }

    if (!canSubmitChanges) {
      toast.error('Cannot edit paid or approved invoices');
      return;
    }

    // Guard: employee required when type is employee-related
    if (isEmployeeRelated && !data.employeeId) {
      toast.error('Please select a linked employee for this invoice type.');
      return;
    }

    loadingSend.onTrue();

    try {
      const invoiceData = {
        ...(!isEdit && { invoiceId: `INV-${Date.now()}` }),
        invoiceNumber: data.invoiceNumber,
        customerId: data.invoiceTo?.id ? String(data.invoiceTo.id) : null,
        customerName: data.invoiceTo?.name || '',
        companyName: data.invoiceTo?.name || '',
        createdByEmail: user?.email || '',
        invoiceDate: data.createDate,
        dueDate: data.dueDate,
        status: 'pending', // Always pending when submitted for approval
        baseAmount: parseFloat((data.subtotal || 0).toFixed(2)),
        vatAmount: parseFloat((data.vatAmount || 0).toFixed(2)),
        vatRate: parseFloat((data.vatRate || 0).toFixed(2)),
        total: parseFloat((data.totalAmount || 0).toFixed(2)),
        balance: parseFloat((data.totalAmount || 0).toFixed(2)),
        shippingCharge: parseFloat((data.shipping || 0).toFixed(2)),
        adjustment: parseFloat((data.discount || 0).toFixed(2)),
        currencyCode: data.invoiceFrom?.currency || 'SAR',
        currencySymbol: CURRENCY_SYMBOLS[data.invoiceFrom?.currency] || 'ر.س',
        exchangeRate: 1,
        costcenterId: data.costcenterId ? Number(data.costcenterId) : null,
        // Serialize line items (title + description + price) as JSON into the description column
        description: JSON.stringify(
          (data.items || []).map((item) => ({
            title: item.title || '',
            description: item.description || '',
            price: parseFloat((item.price || 0).toFixed(2)),
          }))
        ),
        // Invoice type fields
        invoiceTypeId: data.invoiceTypeId ? Number(data.invoiceTypeId) : null,
        invoiceTypeName: data.invoiceTypeName || selectedInvoiceType?.invoiceTypeDesc || null,
        // Employee-related fields (derived from invoice type)
        isEmployeeRelated: isEmployeeRelated,
        ...(isEmployeeRelated && data.employeeId && { employeeId: data.employeeId }),
        ...(isEmployeeRelated && data.employeeName && { employeeName: data.employeeName }),
        ...(!isEdit && {
          createdAt: new Date().toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `📤 ${isEdit ? 'Updating' : 'Creating'} invoice and submitting for approval:`,
        invoiceData
      );

      const savedInvoice = isEdit
        ? await updateInvoice(currentInvoice.id, invoiceData)
        : await createInvoice(invoiceData);

      console.log(
        `✅ Invoice ${isEdit ? 'updated' : 'created'} and submitted for approval:`,
        savedInvoice
      );
      toast.success(
        isEdit
          ? 'Invoice updated and submitted for approval!'
          : 'Invoice created and submitted for approval!'
      );

      reset();
      loadingSend.onFalse();
      router.push(paths.dashboard.invoice.root);
    } catch (error) {
      console.error(`❌ Failed to ${isEdit ? 'update' : 'create'} invoice:`, error);
      toast.error(
        `Failed to ${isEdit ? 'update' : 'create'} invoice: ${error.message || 'Unknown error'}`
      );
      loadingSend.onFalse();
    }
  });

  return (
    <Form methods={methods}>
      {/* Status-based alerts */}
      {isNotEditable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This invoice has been {currentInvoice?.status} and cannot be edited.
        </Alert>
      )}

      {isRejected && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Invoice Rejected.</strong>
          {currentInvoice?.rejectionReason
            ? ` Reason: ${currentInvoice.rejectionReason}.`
            : ''}{' '}
          Please update and resubmit for approval.
        </Alert>
      )}

      {isEdit && !canEditByRole && !isRejected && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Only admins and super admins can edit invoices. You have view-only access.
        </Alert>
      )}

      <Card>
        <InvoiceCreateEditAddress />
        <Box
          sx={{
            p: 3,
            pt: 0,
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          <Field.Select
            name="costcenterId"
            label="Cost center"
            fullWidth
            displayEmpty
            InputLabelProps={{ shrink: true }}
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

          <Field.Select
            name="invoiceTypeId"
            label="Invoice type"
            fullWidth
            displayEmpty
            InputLabelProps={{ shrink: true }}
            helperText="Select the type of invoice"
            onChange={(e) => {
              const selectedId = e.target.value;
              const matched = invoiceTypes.find((t) => t.id === Number(selectedId));
              setValue('invoiceTypeId', selectedId);
              setValue('invoiceTypeName', matched?.invoiceTypeDesc || '');
              // keep isEmployeeRelated in sync so schema superRefine can validate
              setValue('isEmployeeRelated', matched?.isEmployeeRelated ?? false);
              // clear employee fields if the new type is not employee-related
              if (!matched?.isEmployeeRelated) {
                setValue('employeeId', '');
                setValue('employeeName', '');
              }
            }}
          >
            <MenuItem value="">
              <em>Select invoice type</em>
            </MenuItem>
            {invoiceTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.invoiceTypeDesc}
              </MenuItem>
            ))}
          </Field.Select>

          {/* ✅ Employee picker - searchable autocomplete, shown when isEmployeeRelated = true */}
          {isEmployeeRelated && (
            <Autocomplete
              options={microsoftUsers}
              getOptionLabel={(option) =>
                option.name ? `${option.name}${option.email ? ` (${option.email})` : ''}` : ''
              }
              value={microsoftUsers.find((u) => u.id === watchedEmployeeId) || null}
              loading={loadingUsers}
              onChange={(_, newValue) => {
                setValue('employeeId', newValue?.id || '');
                setValue('employeeName', newValue?.name || '');
              }}
              filterOptions={(options, { inputValue }) => {
                const lower = inputValue.toLowerCase();
                return options.filter(
                  (o) =>
                    o.name?.toLowerCase().includes(lower) || o.email?.toLowerCase().includes(lower)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Linked Employee"
                  helperText="Type a name or email to search — select the employee whose P&L this invoice income belongs to"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}
        </Box>
        <InvoiceCreateEditStatusDate />
        <InvoiceCreateEditDetails />
      </Card>

      <Box
        sx={{
          mt: 3,
          gap: 2,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          size="large"
          variant="outlined"
          color="inherit"
          onClick={handleSaveAsDraft}
          disabled={loadingSave.value || isSubmitting || !canSubmitChanges}
        >
          {isEdit ? 'Update Draft' : 'Save as draft'}
        </Button>

        <Button
          size="large"
          variant="contained"
          onClick={handleSubmitForApproval}
          disabled={loadingSend.value || isSubmitting || !canSubmitChanges}
        >
          {/* ✅ CHANGED TO "Submit for Approval" */}
          {isEdit ? 'Update & Submit for Approval' : 'Create & Submit for Approval'}
        </Button>
      </Box>
    </Form>
  );
}
