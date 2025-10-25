import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react'; // Import useEffect and useState
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { TextField } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fetchZohoInvoices } from 'src/utils/apiHelper'; // Import the fetchZohoInvoices method

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const AccountingEntrySchema = z.object({
  description: z.string().min(1, { message: 'Description is required!' }),
  type: z.enum(['Receivable', 'Payable'], { error: 'Type is required!' }),
  amount: z.number().min(0, { message: 'Amount must be a positive number!' }),
  date: schemaUtils.date({ error: 'Date is required!' }),
  country: schemaUtils.nullableInput(z.string().min(1, { error: 'Country is required!' }), {
    error: 'Country is required!',
  }),
  invoiceNumber: z.string().min(1, { message: 'Invoice Number is required!' }),
  referenceNumber: z.string().optional(),
  customerName: z.string().min(1, { message: 'Customer Name is required!' }),
  companyName: z.string().optional(),
  status: z.string().min(1, { message: 'Status is required!' }),
  dueDate: schemaUtils.date({ error: 'Due Date is required!' }),
  currencyCode: z.string().min(1, { message: 'Currency Code is required!' }),
  salespersonName: z.string().optional(),
  createdBy: z.string().optional(),
});

// ----------------------------------------------------------------------

export function AccountingEntryForm({ currentUser }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]); // State to store fetched invoices

  const defaultValues = {
    description: '',
    type: 'Receivable',
    amount: 0,
    date: '',
    country: '',
    invoiceNumber: '',
    referenceNumber: '',
    customerName: '',
    companyName: '',
    status: '',
    dueDate: '',
    currencyCode: '',
    salespersonName: '',
    createdBy: '',
  };

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(AccountingEntrySchema),
    defaultValues,
  });

  const {
    reset,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Fetch Zoho invoices on component mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await fetchZohoInvoices();
        setInvoices(data); // Store the fetched invoices in state
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };

    fetchInvoices();
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      toast.success(currentUser ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.user.list);
      console.info('DATA', data);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Box sx={{ mb: 3 }}>
        <h2>Create a New Invoice</h2>
      </Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card sx={{ p: 3 }}>
            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text name="description" label="Description" />
              <Field.Text name="amount" label="Amount" />
              <Field.Text name="date" label="Date" />
              <Field.CountrySelect
                fullWidth
                name="country"
                label="Country"
                placeholder="Choose a country"
              />
              <Field.Text name="invoiceNumber" label="Invoice Number" />
              <Field.Text name="referenceNumber" label="Reference Number" />
              <TextField select label="Customer" name="customer">
                <option value="Zamil IS">Zamil IS</option>
                <option value="American Express">American Express</option>
              </TextField>
              <Field.Text name="companyName" label="Company Name" />
              <Field.Text name="status" label="Status" />
              <Field.Text name="dueDate" label="Due Date" />
              <Field.Text name="currencyCode" label="Currency Code" />
              <Field.Text name="salespersonName" label="Salesperson Name" />
              <Field.Text name="createdBy" label="Created By" />
            </Box>
            <br />

            <TextField select label="Module" name="module">
              <option value="receivable">Accounts Receivable</option>
              <option value="payable">Accounts Payable</option>
              <option value="vat">VAT</option>
            </TextField>

            <Stack sx={{ mt: 3, p: 3, alignItems: 'flex-end' }}>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                {!currentUser ? 'Create Entry' : 'Save changes'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
