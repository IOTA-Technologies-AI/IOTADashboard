'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { fCurrency } from 'src/utils/format-number';
import { listPipelineDeals } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_COLORS = {
  lead: '#5C6BC0',
  qualified: '#0288D1',
  proposal: '#F57C00',
  negotiation: '#E65100',
  won: '#2E7D32',
  lost: '#B71C1C',
};

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
  return fCurrency(n || 0, { currencyCode: currency || 'USD' });
}

// ----------------------------------------------------------------------

function KpiCard({ label, value, icon, iconColor, sub }) {
  const theme = useTheme();
  return (
    <Card sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
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
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(iconColor, 0.12),
            color: iconColor,
            flexShrink: 0,
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>
      </Stack>
      <Box
        sx={{
          position: 'absolute',
          right: -16,
          bottom: -16,
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(iconColor, 0.06),
          pointerEvents: 'none',
        }}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

export function SalesReportsView() {
  const theme = useTheme();
  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const currency = useMemo(() => dominantCurrency(deals), [deals]);

  const stats = useMemo(() => {
    if (!deals.length) return null;

    const total = deals.length;
    const won = deals.filter((d) => d.stage === 'won');
    const lost = deals.filter((d) => d.stage === 'lost');
    const active = deals.filter((d) => !['won', 'lost'].includes(d.stage));

    const totalValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const wonValue = won.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const activeValue = active.reduce((s, d) => s + (Number(d.value) || 0), 0);

    const winRate = total ? Math.round((won.length / total) * 100) : 0;

    const byStage = STAGES.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage);
      const value = stageDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return {
        stage,
        count: stageDeals.length,
        value,
        pct: Math.round((stageDeals.length / total) * 100),
      };
    });

    const bdmMap = {};
    deals.forEach((d) => {
      const bdm = d.assignedBdm || 'Unassigned';
      if (!bdmMap[bdm]) bdmMap[bdm] = { count: 0, value: 0, won: 0 };
      bdmMap[bdm].count++;
      bdmMap[bdm].value += Number(d.value) || 0;
      if (d.stage === 'won') bdmMap[bdm].won++;
    });
    const byBdm = Object.entries(bdmMap)
      .map(([bdm, v]) => ({ bdm, ...v, winRate: Math.round((v.won / v.count) * 100) }))
      .sort((a, b) => b.value - a.value);

    const byPriority = ['hot', 'warm', 'cold'].map((priority) => {
      const pDeals = deals.filter((d) => d.priority === priority);
      return {
        priority,
        count: pDeals.length,
        value: pDeals.reduce((s, d) => s + (Number(d.value) || 0), 0),
      };
    });

    return {
      total,
      won: won.length,
      lost: lost.length,
      active: active.length,
      totalValue,
      wonValue,
      activeValue,
      winRate,
      byStage,
      byBdm,
      byPriority,
    };
  }, [deals]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Sales Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pipeline performance & deal analytics
        </Typography>
      </Stack>

      {!stats ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Iconify icon="solar:chart-bold" width={48} color="text.disabled" />
          <Typography variant="body1" color="text.secondary" mt={2}>
            No data yet. Create some deals to see reports.
          </Typography>
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard
                label="Total Deals"
                value={stats.total}
                icon="solar:bag-bold"
                iconColor={theme.palette.primary.main}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard
                label="Win Rate"
                value={`${stats.winRate}%`}
                icon="solar:medal-ribbons-star-bold"
                iconColor={theme.palette.success.main}
                sub={`${stats.won} won · ${stats.lost} lost`}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard
                label="Active Pipeline"
                value={fmt(stats.activeValue, currency)}
                icon="solar:fire-bold"
                iconColor={theme.palette.warning.main}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <KpiCard
                label="Closed Won"
                value={fmt(stats.wonValue, currency)}
                icon="solar:dollar-minimalistic-bold"
                iconColor={theme.palette.info.main}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* By Stage */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  By Stage
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Deals
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Value
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Share</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.byStage.map((row) => (
                      <TableRow key={row.stage}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: STAGE_COLORS[row.stage],
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {row.stage}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {fmt(row.value, currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={row.pct}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: alpha(STAGE_COLORS[row.stage], 0.12),
                              '& .MuiLinearProgress-bar': { bgcolor: STAGE_COLORS[row.stage] },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </Grid>

            {/* By BDM */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  By BDM
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell sx={{ fontWeight: 700 }}>BDM</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Deals
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Value
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Win %
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.byBdm.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.byBdm.map((row) => (
                        <TableRow key={row.bdm}>
                          <TableCell>{row.bdm}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {fmt(row.value, currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 0.75,
                                display: 'inline-block',
                                bgcolor: row.winRate >= 50 ? '#E8F5E9' : '#FFF3E0',
                                color: row.winRate >= 50 ? '#1B5E20' : '#E65100',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {row.winRate}%
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </Grid>

            {/* By Priority */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  By Priority
                </Typography>
                <Stack spacing={2.5} mt={1}>
                  {stats.byPriority.map((row) => {
                    const color =
                      row.priority === 'hot'
                        ? theme.palette.error.main
                        : row.priority === 'warm'
                          ? theme.palette.warning.main
                          : theme.palette.info.main;
                    const pct = stats.total ? Math.round((row.count / stats.total) * 100) : 0;
                    return (
                      <Stack key={row.priority} spacing={0.75}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                              sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }}
                            />
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{ textTransform: 'capitalize' }}
                            >
                              {row.priority}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({row.count} deals)
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {fmt(row.value, currency)}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(color, 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: color },
                          }}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
