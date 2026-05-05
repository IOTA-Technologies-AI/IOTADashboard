'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listJobDescriptions, listCandidates } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { SvgColor } from 'src/components/svg-color';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

function KpiCard({ label, value, sub, icon, color = 'primary' }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        p: 3,
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        color: `${color}.darker`,
        backgroundColor: 'common.white',
        backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
      }}
    >
      <Box sx={{ width: 48, height: 48, mb: 3 }}>
        <img
          alt={label}
          src={`${CONFIG.assetsDir}/assets/icons/glass/${icon}`}
          width={48}
          height={48}
        />
      </Box>

      <SvgColor
        src={`${CONFIG.assetsDir}/assets/background/shape-square.svg`}
        sx={{
          top: -44,
          right: -44,
          width: 160,
          zIndex: 1,
          height: 160,
          opacity: 0.08,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />

      <Box sx={{ mb: 0.5, typography: 'subtitle2' }}>{label}</Box>
      <Box sx={{ typography: 'h4' }}>{value}</Box>
      {sub && (
        <Typography variant="caption" sx={{ opacity: 0.72, mt: 0.5, display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

export function ProfileOverviewView() {
  const router = useRouter();
  const { data: jdData, isLoading: jdLoading } = useSWR('profile/jd', listJobDescriptions);
  const { data: candData, isLoading: candLoading } = useSWR('profile/candidates', listCandidates);

  const jds = useMemo(() => jdData?.data || [], [jdData]);
  const candidates = useMemo(() => candData?.data || [], [candData]);

  const activeJDs = useMemo(() => jds.filter((j) => j.status === 'published').length, [jds]);
  const totalResumes = candidates.length;
  const shortlisted = useMemo(
    () => candidates.filter((c) => c.status === 'shortlisted').length,
    [candidates]
  );

  const loading = jdLoading || candLoading;

  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Profile</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Employee Resume Management System (PRMS)
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => router.push(paths.dashboard.profile.jd.new)}>
          + New Job Description
        </Button>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total Resumes"
            value={loading ? '—' : totalResumes}
            sub="Candidates in system"
            icon="ic-glass-users.svg"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Active Job Descriptions"
            value={loading ? '—' : activeJDs}
            sub={`of ${jds.length} total`}
            icon="ic-glass-bag.svg"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Shortlisted"
            value={loading ? '—' : shortlisted}
            sub="Candidates shortlisted"
            icon="ic-glass-buy.svg"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total JDs"
            value={loading ? '—' : jds.length}
            sub="All job descriptions"
            icon="ic-glass-message.svg"
            color="info"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={2}>
        {[
          {
            label: 'Upload Resume',
            desc: 'Add a new candidate resume',
            path: paths.dashboard.profile.resumes,
            color: 'primary',
          },
          {
            label: 'New Job Description',
            desc: 'Create a new JD for matching',
            path: paths.dashboard.profile.jd.new,
            color: 'warning',
          },
          {
            label: 'Match Candidates',
            desc: 'Run AI matching for a JD',
            path: paths.dashboard.profile.matching,
            color: 'success',
          },
          {
            label: 'View Candidates',
            desc: 'Browse all candidates',
            path: paths.dashboard.profile.candidates.root,
            color: 'info',
          },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 6 },
              }}
              onClick={() => router.push(item.path)}
            >
              <Typography variant="subtitle1" sx={{ mb: 0.5, color: `${item.color}.main` }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.desc}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </DashboardContent>
  );
}
