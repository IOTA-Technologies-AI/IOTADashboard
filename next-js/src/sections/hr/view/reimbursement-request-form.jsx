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

import { getEmployees, createReimbursementRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

const REIMBURSEMENT_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Meals',
  'Medical',
  'Office Supplies',
  'Training',
  'Other',
];

const ReimbursementSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  category: z.string().optional(),
  amount: z.coerce.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export function ReimbursementRequestForm() {
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
      category: '',
      amount: '',
      currency: 'SAR',
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(ReimbursementSchema), defaultValues });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createReimbursementRequest(data);
      toast.success('Reimbursement request submitted!');
      router.push(paths.dashboard.hr.employeeRequests.reimbursement.root);
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

              <Field.Select name="category" label="Category">
                <MenuItem value="">— Select category —</MenuItem>
                {REIMBURSEMENT_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text
                name="amount"
                label="Amount"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
              />

              <Field.Select name="currency" label="Currency">
                {['SAR', 'AED', 'USD'].map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>

            <Field.Text
              name="notes"
              label="Notes / Description"
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />

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
