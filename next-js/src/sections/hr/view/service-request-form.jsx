'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getEmployees, createServiceRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

const SERVICE_REQUEST_TYPES = [
  'Salary Advance',
  'Personal Loan',
  'Housing Allowance',
  'Education Allowance',
  'Emergency Advance',
  'Other',
];

const ServiceRequestSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  requestType: z.string().min(1, { message: 'Request type is required!' }),
  requestedAmount: z.coerce.number().optional(),
  currencyCode: z.string().optional(),
  repaymentMonths: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export function ServiceRequestForm() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees()
      .then((emps) => setEmployees(emps || []))
      .catch((e) => console.error('Failed to load employees:', e));
  }, []);

  const defaultValues = useMemo(
    () => ({
      employeeId: '',
      requestType: '',
      requestedAmount: '',
      currencyCode: 'SAR',
      repaymentMonths: '',
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(ServiceRequestSchema), defaultValues });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createServiceRequest(data);
      toast.success('Service request submitted!');
      router.push(paths.dashboard.hr.employeeRequests.service.root);
    } catch {
      toast.error('Something went wrong.');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <Field.Select name="employeeId" label="Employee">
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()} ({e.employeeId})
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Select name="requestType" label="Request Type">
                {SERVICE_REQUEST_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text
                name="requestedAmount"
                label="Requested Amount"
                type="number"
                inputProps={{ min: 0 }}
              />

              <Field.Select name="currencyCode" label="Currency">
                {['SAR', 'AED', 'USD'].map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text
                name="repaymentMonths"
                label="Repayment Months"
                type="number"
                inputProps={{ min: 1 }}
              />
            </Box>

            <Field.Text name="notes" label="Notes" multiline rows={3} sx={{ mt: 2 }} />

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Submit Request
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
