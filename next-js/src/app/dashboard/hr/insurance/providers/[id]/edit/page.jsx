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

import { listInsuranceProviders, updateInsuranceProvider } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const ProviderSchema = z.object({
  name: z.string().min(1, { message: 'Provider name is required!' }),
  networkType: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email({ message: 'Invalid email' }).optional().or(z.literal('')),
  country: z.enum(['KSA', 'UAE', 'OTHER']),
  notes: z.string().optional(),
});

export default function InsuranceProviderEditPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    listInsuranceProviders()
      .then((provs) => {
        const found = (provs || []).find((p) => String(p.id) === String(id));
        setProvider(found ?? null);
      })
      .catch((e) => console.error('Failed to load provider:', e));
  }, [id]);

  const defaultValues = useMemo(
    () => ({
      name: provider?.name || '',
      networkType: provider?.networkType || '',
      contactName: provider?.contactName || '',
      contactPhone: provider?.contactPhone || '',
      contactEmail: provider?.contactEmail || '',
      country: provider?.country || 'KSA',
      notes: provider?.notes || '',
    }),
    [provider]
  );

  const methods = useForm({ resolver: zodResolver(ProviderSchema), defaultValues });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (provider) reset(defaultValues);
  }, [provider, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateInsuranceProvider(id, data);
      toast.success('Provider updated!');
      router.push(paths.dashboard.hr.insurance.providers);
    } catch {
      toast.error('Something went wrong.');
    }
  });

  if (!provider) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Insurance Provider"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance', href: paths.dashboard.hr.insurance.root },
          { name: 'Providers', href: paths.dashboard.hr.insurance.providers },
          { name: provider.name },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Text name="name" label="Provider Name" />
                <Field.Text name="networkType" label="Network Type" />
                <Field.Text name="contactName" label="Contact Name" />
                <Field.Text name="contactPhone" label="Contact Phone" />
                <Field.Text name="contactEmail" label="Contact Email" />
                <Field.Select name="country" label="Country">
                  {['KSA', 'UAE', 'OTHER'].map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Box>
              <Field.Text name="notes" label="Notes" multiline rows={3} sx={{ mt: 2 }} />
              <Stack alignItems="flex-end" sx={{ mt: 3 }}>
                <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                  Save Changes
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>
    </DashboardContent>
  );
}
