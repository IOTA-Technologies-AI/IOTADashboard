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

import { getEmployees, createVisaRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

const VISA_REQUEST_TYPES = [
  'New Iqama',
  'Iqama Renewal',
  'Iqama Transfer',
  'Exit Re-Entry Visa',
  'Final Exit Visa',
  'Work Permit',
  'Family Visit Visa',
  'Visit Visa',
  'Other',
];

const VisaRequestSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  requestType: z.string().min(1, { message: 'Request type is required!' }),
  notes: z.string().optional(),
});

export function VisaRequestForm() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees()
      .then((emps) => setEmployees(emps || []))
      .catch((e) => console.error('Failed to load employees:', e));
  }, []);

  const defaultValues = useMemo(() => ({ employeeId: '', requestType: '', notes: '' }), []);

  const methods = useForm({ resolver: zodResolver(VisaRequestSchema), defaultValues });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createVisaRequest(data);
      toast.success('Visa request submitted!');
      router.push(paths.dashboard.hr.employeeRequests.visa.root);
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
                {VISA_REQUEST_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Field.Select>
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
