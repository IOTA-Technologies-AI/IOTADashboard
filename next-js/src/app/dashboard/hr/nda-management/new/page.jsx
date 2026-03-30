'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createNda } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function NdaNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: 'Non-Disclosure Agreement',
      purpose: '',
      partnerCompanyName: '',
      partnerAddress: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      durationYears: 2,
      isPerpetual: false,
      iotaSignatories: [{ name: '', email: '', jobTitle: '' }],
      partnerSignatories: [{ name: '', email: '', jobTitle: '' }],
    },
  });

  const {
    fields: iotaFields,
    append: appendIota,
    remove: removeIota,
  } = useFieldArray({ control, name: 'iotaSignatories' });

  const {
    fields: partnerFields,
    append: appendPartner,
    remove: removePartner,
  } = useFieldArray({ control, name: 'partnerSignatories' });

  const isPerpetual = watch('isPerpetual');

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      const user =
        typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

      const nda = await createNda({
        ...data,
        isPerpetual: data.isPerpetual === 'true' || data.isPerpetual === true,
        durationYears: Number(data.durationYears),
        createdBy: user?.email || 'unknown',
      });

      toast.success(`NDA ${nda.ndaNumber} created`);
      router.push(paths.dashboard.hr.ndaManagement.details(nda.id));
    } catch (err) {
      console.error('Failed to create NDA:', err);
      toast.error('Failed to create NDA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New NDA"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'NDA Management', href: paths.dashboard.hr.ndaManagement.root },
          { name: 'New NDA' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* ── Agreement Details ── */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Agreement Details
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Agreement Title"
                  fullWidth
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
                <TextField
                  label="Purpose / Scope (optional)"
                  fullWidth
                  multiline
                  rows={3}
                  {...register('purpose')}
                  placeholder="e.g. Exploration of potential partnership for software development services"
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Partner Details
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Partner Company Name"
                  fullWidth
                  {...register('partnerCompanyName', {
                    required: 'Partner company name is required',
                  })}
                  error={!!errors.partnerCompanyName}
                  helperText={errors.partnerCompanyName?.message}
                />
                <TextField
                  label="Partner Address (optional)"
                  fullWidth
                  {...register('partnerAddress')}
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* ── IOTA Signatories ── */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">IOTA Signatories</Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => appendIota({ name: '', email: '', jobTitle: '' })}
                >
                  Add Signatory
                </Button>
              </Stack>

              <Stack spacing={2}>
                {iotaFields.map((field, i) => (
                  <Box key={field.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Grid container spacing={1} sx={{ flex: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          size="small"
                          {...register(`iotaSignatories.${i}.name`, { required: 'Required' })}
                          error={!!errors.iotaSignatories?.[i]?.name}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Email"
                          fullWidth
                          size="small"
                          type="email"
                          {...register(`iotaSignatories.${i}.email`, { required: 'Required' })}
                          error={!!errors.iotaSignatories?.[i]?.email}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Job Title"
                          fullWidth
                          size="small"
                          {...register(`iotaSignatories.${i}.jobTitle`, { required: 'Required' })}
                          error={!!errors.iotaSignatories?.[i]?.jobTitle}
                        />
                      </Grid>
                    </Grid>
                    {iotaFields.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeIota(i)}
                        sx={{ mt: 0.5 }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* ── Partner Signatories ── */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">Partner Signatories</Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => appendPartner({ name: '', email: '', jobTitle: '' })}
                >
                  Add Signatory
                </Button>
              </Stack>

              <Stack spacing={2}>
                {partnerFields.map((field, i) => (
                  <Box key={field.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Grid container spacing={1} sx={{ flex: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          size="small"
                          {...register(`partnerSignatories.${i}.name`, { required: 'Required' })}
                          error={!!errors.partnerSignatories?.[i]?.name}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Email"
                          fullWidth
                          size="small"
                          type="email"
                          {...register(`partnerSignatories.${i}.email`, { required: 'Required' })}
                          error={!!errors.partnerSignatories?.[i]?.email}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Job Title"
                          fullWidth
                          size="small"
                          {...register(`partnerSignatories.${i}.jobTitle`, {
                            required: 'Required',
                          })}
                          error={!!errors.partnerSignatories?.[i]?.jobTitle}
                        />
                      </Grid>
                    </Grid>
                    {partnerFields.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removePartner(i)}
                        sx={{ mt: 0.5 }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>

          {/* ── Duration sidebar ── */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Duration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Effective Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register('effectiveDate', { required: 'Required' })}
                  error={!!errors.effectiveDate}
                  helperText={errors.effectiveDate?.message}
                />
                <TextField
                  select
                  label="Duration"
                  fullWidth
                  defaultValue="false"
                  {...register('isPerpetual')}
                >
                  <MenuItem value="false">Fixed term</MenuItem>
                  <MenuItem value="true">Perpetual</MenuItem>
                </TextField>

                {!isPerpetual && (
                  <TextField
                    label="Duration (years)"
                    type="number"
                    fullWidth
                    InputProps={{ inputProps: { min: 1, max: 20 } }}
                    {...register('durationYears', { min: 1 })}
                    helperText="Default: 2 years"
                  />
                )}
              </Stack>

              <Box sx={{ mt: 4 }}>
                <LoadingButton type="submit" variant="contained" fullWidth loading={submitting}>
                  Create NDA
                </LoadingButton>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </form>
    </DashboardContent>
  );
}
