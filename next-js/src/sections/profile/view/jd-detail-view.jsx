'use client';

import useSWR from 'swr';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getJobDescription } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

function SkillChips({ label, skills, color = 'primary' }) {
  if (!skills?.length) return null;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {skills.map((s) => (
          <Chip key={s} size="small" label={s} color={color} variant="outlined" />
        ))}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function JDDetailView({ id }) {
  const router = useRouter();
  const { data, isLoading } = useSWR(`profile/jd/${id}`, () => getJobDescription(id));
  const jd = data?.data;

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!jd) {
    return (
      <DashboardContent>
        <Typography>Job description not found.</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            startIcon={<Iconify icon="eva:arrow-back-fill" />}
            onClick={() => router.push(paths.dashboard.profile.jd.root)}
          >
            Back
          </Button>
          <Typography variant="h4">{jd.title}</Typography>
          <Chip
            size="small"
            label={jd.status}
            color={STATUS_COLORS[jd.status] || 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => router.push(paths.dashboard.profile.jd.edit(id))}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:flash-fill" />}
            onClick={() => router.push(`${paths.dashboard.profile.matching}?jdId=${id}`)}
          >
            Run Matching
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Details card */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Job Details
            </Typography>
            <Stack spacing={2}>
              {[
                { label: 'Department', value: jd.department },
                { label: 'Location', value: jd.location },
                { label: 'Experience', value: `${jd.experienceYears}+ years` },
                { label: 'Employment Type', value: jd.employmentType },
                {
                  label: 'Budget Range',
                  value:
                    jd.budgetMin || jd.budgetMax
                      ? `$${jd.budgetMin?.toLocaleString()} – $${jd.budgetMax?.toLocaleString()}`
                      : 'Not specified',
                },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <SkillChips label="Mandatory Skills" skills={jd.mandatorySkills} color="primary" />
              <SkillChips label="Optional Skills" skills={jd.optionalSkills} color="default" />
              <SkillChips
                label="Required Certifications"
                skills={jd.certifications}
                color="warning"
              />
            </Stack>
          </Card>
        </Grid>

        {/* Quick nav to matching */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Candidate Matching
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Run AI matching to score and rank all candidates against this job description.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="eva:flash-fill" />}
              onClick={() => router.push(`${paths.dashboard.profile.matching}?jdId=${id}`)}
            >
              Run AI Matching
            </Button>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
