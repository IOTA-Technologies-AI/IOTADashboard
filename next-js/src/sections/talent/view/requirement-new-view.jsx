'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { apiMessage, createRequirement, generateRequirementJd } from 'src/actions/talent';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PRIORITY, EMPLOYMENT_TYPES } from '../constants';

// ----------------------------------------------------------------------

const EMPTY = {
  clientName: '',
  title: '',
  sourceType: 'one_liner',
  sourceText: '',
  department: '',
  location: '',
  employmentType: 'full-time',
  experienceYears: '',
  positions: 1,
  priority: 'normal',
  notes: '',
};

export function RequirementNewView() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const valid = form.clientName.trim() && form.title.trim() && form.sourceText.trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      const created = await createRequirement({
        ...form,
        experienceYears: Number(form.experienceYears) || 0,
        positions: Number(form.positions) || 1,
      });
      // A one-liner needs a JD written; start that straight away.
      if (form.sourceType === 'one_liner') {
        toast.info('Requirement saved. Writing the job description…');
        try {
          await generateRequirementJd(created.id);
        } catch (err) {
          toast.warning(
            apiMessage(err, 'The JD could not be written now; use Write JD on the next page.')
          );
        }
      } else {
        toast.success('Requirement saved.');
      }
      router.push(paths.dashboard.talent.requirements.details(created.id));
    } catch (err) {
      toast.error(apiMessage(err, 'Could not save the requirement.'));
      setSaving(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New requirement"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Talent', href: paths.dashboard.talent.root },
          { name: 'Requirements', href: paths.dashboard.talent.requirements.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Client"
                value={form.clientName}
                onChange={set('clientName')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Role title"
                placeholder="e.g. Senior SAP FICO Consultant"
                value={form.title}
                onChange={set('title')}
              />
            </Grid>
          </Grid>

          <Stack spacing={1}>
            <Typography variant="subtitle2">What did the client send?</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={form.sourceType}
              onChange={(_, v) => v && setForm((f) => ({ ...f, sourceType: v }))}
            >
              <ToggleButton value="one_liner">
                <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />A one-liner
              </ToggleButton>
              <ToggleButton value="jd">
                <Iconify icon="solar:file-text-bold" sx={{ mr: 1 }} />A full job description
              </ToggleButton>
            </ToggleButtonGroup>
            <Alert severity="info" variant="outlined">
              {form.sourceType === 'one_liner'
                ? 'A complete job description will be written from it as soon as you save.'
                : 'The JD is kept as sent. You can have it rewritten in IOTA’s format on the next page.'}
            </Alert>
          </Stack>

          <TextField
            fullWidth
            required
            multiline
            minRows={form.sourceType === 'jd' ? 10 : 3}
            label={form.sourceType === 'jd' ? 'Client job description' : 'Client requirement'}
            placeholder={
              form.sourceType === 'jd'
                ? 'Paste the job description the client sent…'
                : 'e.g. Need 2 SAP FICO consultants, 8+ years, S/4HANA, Riyadh onsite, start next month'
            }
            value={form.sourceText}
            onChange={set('sourceText')}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Department"
                value={form.department}
                onChange={set('department')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Location"
                value={form.location}
                onChange={set('location')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                select
                label="Employment"
                value={form.employmentType}
                onChange={set('employmentType')}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField
                fullWidth
                type="number"
                label="Min years"
                value={form.experienceYears}
                onChange={set('experienceYears')}
                inputProps={{ min: 0, max: 50 }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1 }}>
              <TextField
                fullWidth
                type="number"
                label="Positions"
                value={form.positions}
                onChange={set('positions')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <TextField
                fullWidth
                select
                label="Priority"
                value={form.priority}
                onChange={set('priority')}
              >
                {Object.entries(PRIORITY).map(([k, p]) => (
                  <MenuItem key={k} value={k}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Internal notes"
            value={form.notes}
            onChange={set('notes')}
          />

          <Stack direction="row" justifyContent="flex-end">
            <LoadingButton
              variant="contained"
              size="large"
              loading={saving}
              disabled={!valid}
              onClick={handleSave}
            >
              Save requirement
            </LoadingButton>
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
