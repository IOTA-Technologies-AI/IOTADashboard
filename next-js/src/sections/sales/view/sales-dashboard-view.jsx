'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { listPipelineDeals } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_META = {
  lead: { color: '#5C6BC0', label: 'Lead' },
  qualified: { color: '#0288D1', label: 'Qualified' },
  proposal: { color: '#F57C00', label: 'Proposal' },
  negotiation: { color: '#E65100', label: 'Negotiation' },
  won: { color: '#2E7D32', label: 'Won' },
  lost: { color: '#B71C1C', label: 'Lost' },
};

const PRIORITY_COLORS = {
  hot: { bg: '#FFEBEE', text: '#C62828' },
  warm: { bg: '#FFF3E0', text: '#E65100' },
  cold: { bg: '#E3F2FD', text: '#1565C0' },
};

// Pick the most common currency in a deal array
function dominantCurrency(deals) {
  if (!deals.length) return 'USD';
  const counts = {};
  deals.forEach((d) => {
    const c = d.currency || 'USD';
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function fmt(n, currency) {
  if (n == null || n === 0) return fCurrency(0, { currencyCode: currency || 'USD' });
  return fCurrency(n, { currencyCode: currency || 'USD' });
}

// ----------------------------------------------------------------------

function KpiCard({ label, value, sub, icon, iconColor, trend }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow:
          theme.customShadows?.card ||
          '0 0 2px 0 rgba(145,158,171,.2), 0 12px 24px -4px rgba(145,158,171,.12)',
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700} lineHeight={1.2}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(iconColor, 0.12),
            color: iconColor,
            flexShrink: 0,
          }}
        >
          <Iconify icon={icon} width={24} />
        </Box>
      </Stack>

      {trend != null && (
        <Stack direction="row" alignItems="center" spacing={0.5} mt={2}>
          <Iconify
            icon={trend >= 0 ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
            width={18}
            color={trend >= 0 ? 'success.main' : 'error.main'}
          />
          <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
            {trend >= 0 ? '+' : ''}
            {trend}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            vs last period
          </Typography>
        </Stack>
      )}

      {/* decorative bg circle */}
      <Box
        sx={{
          position: 'absolute',
          right: -20,
          bottom: -20,
          width: 96,
          height: 96,
          borderRadius: '50%',
          bgcolor: alpha(iconColor, 0.06),
          pointerEvents: 'none',
        }}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

function StageFunnelRow({ stage, count, value, pct, currency }) {
  const meta = STAGE_META[stage] || { color: '#9E9E9E', label: stage };
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }}
          />
          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
            {meta.label}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="caption" color="text.secondary">
            {count} deal{count !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80, textAlign: 'right' }}>
            {fmt(value, currency)}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(meta.color, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: meta.color, borderRadius: 3 },
        }}
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------

function RecentDealRow({ deal, currency }) {
  const router = useRouter();
  const initials = (deal.company || deal.dealTitle || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const priority = deal.priority || 'warm';
  const pc = PRIORITY_COLORS[priority] || PRIORITY_COLORS.warm;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{
        py: 1.25,
        px: 1,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background 0.15s',
      }}
      onClick={() => router.push(paths.dashboard.sales.deals.details(deal.id))}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: 13,
          bgcolor: 'primary.lighter',
          color: 'primary.dark',
          fontWeight: 700,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {deal.dealTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {deal.company}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: 0.75,
          bgcolor: pc.bg,
          color: pc.text,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'capitalize',
          whiteSpace: 'nowrap',
        }}
      >
        {priority}
      </Box>
      <Typography variant="body2" fontWeight={700} sx={{ minWidth: 80, textAlign: 'right' }}>
        {deal.value ? fmt(deal.value, deal.currency || currency) : '—'}
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function SalesDashboardView() {
  const router = useRouter();
  const theme = useTheme();

  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const currency = useMemo(() => dominantCurrency(deals), [deals]);

  const stats = useMemo(() => {
    const total = deals.length;
    const won = deals.filter((d) => d.stage === 'won').length;
    const active = deals.filter((d) => !['won', 'lost'].includes(d.stage)).length;
    const totalValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const wonValue = deals
      .filter((d) => d.stage === 'won')
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    const winRate = total ? Math.round((won / total) * 100) : 0;

    const byStage = {};
    STAGES.forEach((stage) => {
      const sd = deals.filter((d) => d.stage === stage);
      byStage[stage] = {
        count: sd.length,
        value: sd.reduce((s, d) => s + (Number(d.value) || 0), 0),
        pct: total ? Math.round((sd.length / total) * 100) : 0,
      };
    });

    const recent = [...deals]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    return { total, won, active, totalValue, wonValue, winRate, byStage, recent };
  }, [deals]);

  const loading = isLoading;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sales Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your pipeline, deals, and performance
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
          sx={{ borderRadius: 1.5 }}
        >
          New Deal
        </Button>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard
            label="Total Deals"
            value={loading ? '…' : stats.total}
            icon="solar:bag-bold"
            iconColor={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard
            label="Active Pipeline"
            value={loading ? '…' : stats.active}
            icon="solar:fire-bold"
            iconColor={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard
            label="Win Rate"
            value={loading ? '…' : `${stats.winRate}%`}
            sub={`${stats.won} deal${stats.won !== 1 ? 's' : ''} closed`}
            icon="solar:medal-ribbons-star-bold"
            iconColor={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard
            label="Pipeline Value"
            value={loading ? '…' : fmt(stats.totalValue, currency)}
            sub={`Won: ${fmt(stats.wonValue, currency)}`}
            icon="solar:dollar-minimalistic-bold"
            iconColor={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Stage Funnel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography variant="h6" fontWeight={700}>
                Pipeline Stages
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => router.push(paths.dashboard.sales.pipeline)}
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
                sx={{ borderRadius: 1 }}
              >
                View board
              </Button>
            </Stack>
            <Stack spacing={2.5}>
              {STAGES.map((s) => (
                <StageFunnelRow
                  key={s}
                  stage={s}
                  count={stats.byStage[s]?.count ?? 0}
                  value={stats.byStage[s]?.value ?? 0}
                  pct={stats.byStage[s]?.pct ?? 0}
                  currency={currency}
                />
              ))}
            </Stack>
          </Card>
        </Grid>

        {/* Recent Deals */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Recent Deals
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => router.push(paths.dashboard.sales.deals.root)}
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
                sx={{ borderRadius: 1 }}
              >
                See all
              </Button>
            </Stack>

            {loading ? (
              <Stack spacing={1}>
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      height: 52,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </Stack>
            ) : stats.recent.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                <Iconify icon="solar:bag-bold" width={40} color="text.disabled" />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  No deals yet. Create your first deal.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => router.push(paths.dashboard.sales.deals.new)}
                >
                  New Deal
                </Button>
              </Stack>
            ) : (
              <>
                <Stack direction="row" px={1} mb={0.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    Deal
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                    Priority
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 80, textAlign: 'right' }}
                  >
                    Value
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 0.5 }} />
                {stats.recent.map((deal) => (
                  <RecentDealRow key={deal.id} deal={deal} currency={currency} />
                ))}
              </>
            )}
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            {[
              {
                label: 'Kanban Board',
                sub: 'Drag-and-drop pipeline',
                path: paths.dashboard.sales.pipeline,
                icon: 'solar:chart-2-bold',
                color: theme.palette.primary.main,
              },
              {
                label: 'All Deals',
                sub: 'Browse & filter deals',
                path: paths.dashboard.sales.deals.root,
                icon: 'solar:list-bold',
                color: theme.palette.warning.main,
              },
              {
                label: 'Contacts',
                sub: 'Deal contacts directory',
                path: paths.dashboard.sales.contacts,
                icon: 'solar:users-group-rounded-bold',
                color: theme.palette.success.main,
              },
              {
                label: 'Reports',
                sub: 'Performance analytics',
                path: paths.dashboard.sales.reports,
                icon: 'solar:chart-bold',
                color: theme.palette.info.main,
              },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 6, md: 3 }}>
                <Card
                  onClick={() => router.push(item.path)}
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    '&:hover': { borderColor: item.color, boxShadow: `0 0 0 1px ${item.color}` },
                    transition: 'all 0.2s',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: alpha(item.color, 0.1),
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon={item.icon} width={22} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.sub}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
