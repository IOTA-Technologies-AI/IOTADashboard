import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today, fIsAfter } from 'src/utils/format-time';
import { createInvoice, updateInvoice } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, schemaUtils } from 'src/components/hook-form';

import { InvoiceCreateEditStatusDate } from './invoice-create-edit-status-date';
import { defaultItem, InvoiceCreateEditDetails } from './invoice-create-edit-details';
import { IOTA_OFFICES, InvoiceCreateEditAddress } from './invoice-create-edit-address';

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
        service: z.string().min(1, { error: 'Service is required!' }),
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
  })
  .refine((val) => !fIsAfter(val.createDate, val.dueDate), {
    error: 'Due date cannot be earlier than create date!',
    path: ['dueDate'],
  });

// ----------------------------------------------------------------------

export function InvoiceCreateEditForm({ currentInvoice }) {
  const router = useRouter();

  const loadingSave = useBoolean();
  const loadingSend = useBoolean();

  const isEdit = !!currentInvoice?.id;

  // ✅ CHECK IF INVOICE IS PAID - Cannot edit
  const isPaid = currentInvoice?.status === 'paid';
  const canEdit = !isPaid;

  const defaultValues = {
    invoiceNumber: 'INV-1990',
    createDate: today(),
    dueDate: null,
    taxes: 0,
    shipping: 0,
    status: 'draft',
    discount: 0,
    invoiceFrom: IOTA_OFFICES[0],
    invoiceTo: null,
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
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // ✅ Save as Draft - Only for draft/pending invoices
  const handleSaveAsDraft = handleSubmit(async (data) => {
    if (!canEdit) {
      toast.error('Cannot edit paid or approved invoices');
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
        invoiceDate: data.createDate,
        dueDate: data.dueDate,
        status: data.status || 'draft', // ✅ Keep as draft
        total: parseFloat((data.totalAmount || 0).toFixed(2)),
        balance: parseFloat((data.totalAmount || 0).toFixed(2)),
        currencyCode: data.invoiceTo?.currency || 'SAR',
        currencySymbol: data.invoiceTo?.currency === 'SAR' ? 'ر.س' : '$',
        exchangeRate: 1,
        baseAmount: parseFloat((data.subtotal || 0).toFixed(2)),
        vatAmount: parseFloat((data.vatAmount || 0).toFixed(2)),
        vatRate: parseFloat((data.vatRate || 0).toFixed(2)),
        shippingCharge: parseFloat((data.shipping || 0).toFixed(2)),
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
    if (!canEdit) {
      toast.error('Cannot edit paid or approved invoices');
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
        invoiceDate: data.createDate,
        dueDate: data.dueDate,
        status: data.status || 'pending', // ✅ PENDING - Waiting for approval
        baseAmount: parseFloat((data.subtotal || 0).toFixed(2)),
        vatAmount: parseFloat((data.vatAmount || 0).toFixed(2)),
        vatRate: parseFloat((data.vatRate || 0).toFixed(2)),
        total: parseFloat((data.totalAmount || 0).toFixed(2)),
        balance: parseFloat((data.totalAmount || 0).toFixed(2)),
        shippingCharge: parseFloat((data.shipping || 0).toFixed(2)),
        adjustment: parseFloat((data.discount || 0).toFixed(2)),
        currencyCode: data.invoiceTo?.currency || 'SAR',
        currencySymbol: data.invoiceTo?.currency === 'SAR' ? 'ر.س' : '$',
        exchangeRate: 1,
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
      {/* ✅ SHOW WARNING IF TRYING TO EDIT PAID/APPROVED INVOICE */}
      {isPaid && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This invoice has been paid and cannot be edited.
        </Alert>
      )}

      <Card>
        <InvoiceCreateEditAddress />
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
          disabled={loadingSave.value || isSubmitting || !canEdit}
        >
          {isEdit ? 'Update Draft' : 'Save as draft'}
        </Button>

        <Button
          size="large"
          variant="contained"
          onClick={handleSubmitForApproval}
          disabled={loadingSend.value || isSubmitting || !canEdit}
        >
          {/* ✅ CHANGED TO "Submit for Approval" */}
          {isEdit ? 'Update & Submit for Approval' : 'Create & Submit for Approval'}
        </Button>
      </Box>
    </Form>
  );
}
