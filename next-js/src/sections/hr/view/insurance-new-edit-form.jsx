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

import {
  getEmployees,
  createInsuranceRecord,
  updateInsuranceRecord,
  listInsuranceProviders,
} from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

const InsuranceSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  policyNumber: z.string().min(1, { message: 'Policy number is required!' }),
  providerId: z.coerce.number().optional(),
  policyClass: z.enum(['VIP', 'A', 'B', 'C']),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  networkCoverageDetails: z.string().optional(),
  status: z.enum(['active', 'expired', 'pending_renewal', 'cancelled']),
  notes: z.string().optional(),
});

export function InsuranceNewEditForm({ currentRecord }) {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    Promise.all([getEmployees(), listInsuranceProviders(true)]).then(([emps, provs]) => {
      setEmployees(emps || []);
      setProviders(provs || []);
    });
  }, []);

  const defaultValues = useMemo(
    () => ({
      employeeId: currentRecord?.employeeId || '',
      policyNumber: currentRecord?.policyNumber || '',
      providerId: currentRecord?.providerId || '',
      policyClass: currentRecord?.policyClass || 'A',
      startDate: currentRecord?.startDate || '',
      expiryDate: currentRecord?.expiryDate || '',
      networkCoverageDetails: currentRecord?.networkCoverageDetails || '',
      status: currentRecord?.status || 'active',
      notes: currentRecord?.notes || '',
    }),
    [currentRecord]
  );

  const methods = useForm({
    resolver: zodResolver(InsuranceSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentRecord) reset(defaultValues);
  }, [currentRecord, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (currentRecord?.id) {
        await updateInsuranceRecord(currentRecord.id, data);
        toast.success('Insurance record updated!');
      } else {
        await createInsuranceRecord(data);
        toast.success('Insurance record created!');
      }
      router.push(paths.dashboard.hr.insurance.root);
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

              <Field.Text name="policyNumber" label="Policy Number" />

              <Field.Select name="providerId" label="Provider (optional)">
                <MenuItem value="">— None —</MenuItem>
                {providers.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Select name="policyClass" label="Policy Class">
                {['VIP', 'A', 'B', 'C'].map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.DatePicker name="startDate" label="Start Date" />
              <Field.DatePicker name="expiryDate" label="Expiry Date" />

              <Field.Select name="status" label="Status">
                {['active', 'expired', 'pending_renewal', 'cancelled'].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>

            <Field.Text
              name="networkCoverageDetails"
              label="Network Coverage Details"
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
            <Field.Text name="notes" label="Notes" multiline rows={3} sx={{ mt: 2 }} />

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {currentRecord ? 'Save Changes' : 'Create Record'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
