'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createPipelineDeal, updatePipelineDeal } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const DealSchema = zod.object({
  dealTitle: zod.string().min(1, 'Deal title is required'),
  company: zod.string().min(1, 'Company is required'),
  contactName: zod.string().optional(),
  contactEmail: zod.string().email('Invalid email').optional().or(zod.literal('')),
  contactPhone: zod.string().optional(),
  stage: zod.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  value: zod.coerce.number().min(0).optional(),
  currency: zod.string().optional(),
  probability: zod.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: zod.string().optional(),
  assignedBdm: zod.string().optional(),
  source: zod
    .enum([
      'cold_call',
      'email',
      'referral',
      'website',
      'event',
      'linkedin',
      'partner',
      'other',
      '',
    ])
    .optional(),
  priority: zod.enum(['hot', 'warm', 'cold']),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export function DealNewEditForm({ deal, defaultStage }) {
  const router = useRouter();
  const { user } = useAuthContext();

  const isEdit = Boolean(deal);

  const defaultValues = useMemo(
    () => ({
      dealTitle: deal?.dealTitle ?? '',
      company: deal?.company ?? '',
      contactName: deal?.contactName ?? '',
      contactEmail: deal?.contactEmail ?? '',
      contactPhone: deal?.contactPhone ?? '',
      stage: deal?.stage ?? defaultStage ?? 'lead',
      value: deal?.value ?? 0,
      currency: deal?.currency ?? 'USD',
      probability: deal?.probability ?? 10,
      expectedCloseDate: deal?.expectedCloseDate?.substring(0, 10) ?? '',
      assignedBdm: deal?.assignedBdm ?? '',
      source: deal?.source ?? '',
      priority: deal?.priority ?? 'warm',
      notes: deal?.notes ?? '',
    }),
    [deal, defaultStage]
  );

  const methods = useForm({
    resolver: zodResolver(DealSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updatePipelineDeal(deal.id, values);
        toast.success('Deal updated');
      } else {
        await createPipelineDeal({ ...values, createdBy: user?.email });
        toast.success('Deal created');
      }
      router.push(paths.dashboard.sales.deals.root);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to save deal');
    }
  });

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit Deal' : 'New Deal'}
      </Typography>

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          {/* Core info */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Deal Info
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="dealTitle" label="Deal Title" required />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="company" label="Company" required />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="contactName" label="Contact Name" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="contactEmail" label="Contact Email" type="email" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="contactPhone" label="Contact Phone" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text name="assignedBdm" label="Assigned BDM (email)" />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Pipeline fields */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pipeline
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Select name="stage" label="Stage">
                    {['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
                      <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                        {s}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Select name="priority" label="Priority">
                    {['hot', 'warm', 'cold'].map((p) => (
                      <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>
                        {p}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Select name="source" label="Source">
                    <MenuItem value="">None</MenuItem>
                    {[
                      'cold_call',
                      'email',
                      'referral',
                      'website',
                      'event',
                      'linkedin',
                      'partner',
                      'other',
                    ].map((s) => (
                      <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                        {s.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Text
                    name="value"
                    label="Deal Value"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Select name="currency" label="Currency">
                    {['USD', 'AED', 'GBP', 'EUR', 'SAR'].map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Field.Select>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Field.Text
                    name="probability"
                    label="Win Probability (%)"
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Field.Text
                    name="expectedCloseDate"
                    label="Expected Close Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Notes */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Field.Text name="notes" label="Notes" multiline rows={4} />
            </Card>
          </Grid>

          {/* Actions */}
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <LoadingButton type="button" variant="outlined" onClick={() => router.back()}>
                Cancel
              </LoadingButton>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEdit ? 'Save Changes' : 'Create Deal'}
              </LoadingButton>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Box>
  );
}
