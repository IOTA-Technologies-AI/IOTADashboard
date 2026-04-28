'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listPipelineDeals } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_COLORS = {
  lead: '#8C9EFF',
  qualified: '#80D8FF',
  proposal: '#FFD180',
  negotiation: '#FF9E80',
  won: '#CCFF90',
  lost: '#FFAB91',
};

function StatCard({ label, value, sub }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="h3" gutterBottom>
        {value}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Card>
  );
}

function StageCard({ stage, count, total }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {stage}
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {count}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'background.neutral',
          '& .MuiLinearProgress-bar': { bgcolor: STAGE_COLORS[stage] },
        }}
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function SalesDashboardView() {
  const router = useRouter();

  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const stats = useMemo(() => {
    const total = deals.length;
    const won = deals.filter((d) => d.stage === 'won').length;
    const lost = deals.filter((d) => d.stage === 'lost').length;
    const active = deals.filter((d) => !['won', 'lost'].includes(d.stage)).length;
    const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const wonValue = deals
      .filter((d) => d.stage === 'won')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    const byStage = {};
    STAGES.forEach((s) => {
      byStage[s] = deals.filter((d) => d.stage === s).length;
    });

    return { total, won, lost, active, totalValue, wonValue, byStage };
  }, [deals]);

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
        <Typography variant="h4">Sales Overview</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
        >
          New Deal
        </Button>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Total Deals" value={isLoading ? '…' : stats.total} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Active" value={isLoading ? '…' : stats.active} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Won" value={isLoading ? '…' : stats.won} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            label="Pipeline Value"
            value={isLoading ? '…' : fmt(stats.totalValue)}
            sub={`Won: ${fmt(stats.wonValue)}`}
          />
        </Grid>
      </Grid>

      {/* Stage funnel */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pipeline by Stage
        </Typography>
        <Stack spacing={2} mt={1}>
          {STAGES.map((s) => (
            <StageCard key={s} stage={s} count={stats.byStage[s] ?? 0} total={stats.total} />
          ))}
        </Stack>
      </Card>

      {/* Quick links */}
      <Grid container spacing={2}>
        {[
          {
            label: 'Open Pipeline',
            path: paths.dashboard.sales.pipeline,
            icon: 'solar:chart-2-bold',
          },
          { label: 'All Deals', path: paths.dashboard.sales.deals.root, icon: 'solar:list-bold' },
          { label: 'New Deal', path: paths.dashboard.sales.deals.new, icon: 'mingcute:add-line' },
          { label: 'Reports', path: paths.dashboard.sales.reports, icon: 'solar:chart-bold' },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 6, md: 3 }}>
            <Card
              component="button"
              onClick={() => router.push(item.path)}
              sx={{
                p: 2,
                width: '100%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Iconify icon={item.icon} width={24} color="primary.main" />
              <Typography variant="subtitle2">{item.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
