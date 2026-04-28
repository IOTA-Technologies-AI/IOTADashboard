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

import { listPipelineDeals } from 'src/utils/apiHelper';

// ----------------------------------------------------------------------

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

// ----------------------------------------------------------------------

function SummaryCard({ label, value, color }) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" color={color || 'text.primary'}>
        {value}
      </Typography>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function SalesReportsView() {
  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const fmt = (n, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n || 0);

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

    // By stage
    const byStage = STAGES.map((stage) => {
      const stagDeals = deals.filter((d) => d.stage === stage);
      const value = stagDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return {
        stage,
        count: stagDeals.length,
        value,
        pct: Math.round((stagDeals.length / total) * 100),
      };
    });

    // By BDM
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

    // By priority
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
      <Typography variant="h4" gutterBottom>
        Sales Reports
      </Typography>

      {!stats ? (
        <Typography color="text.secondary">
          No data yet. Create some deals to see reports.
        </Typography>
      ) : (
        <>
          {/* KPI summary */}
          <Grid container spacing={2} mb={4}>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard label="Total Deals" value={stats.total} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard label="Win Rate" value={`${stats.winRate}%`} color="success.main" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard label="Pipeline Value" value={fmt(stats.activeValue)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard label="Closed Won" value={fmt(stats.wonValue)} color="success.main" />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* By stage */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  By Stage
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stage</TableCell>
                      <TableCell align="right">Deals</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>Share</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.byStage.map((row) => (
                      <TableRow key={row.stage}>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{row.stage}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">{fmt(row.value)}</TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={row.pct}
                            sx={{ height: 6, borderRadius: 3 }}
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
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  By BDM
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>BDM</TableCell>
                      <TableCell align="right">Deals</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Win %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.byBdm.map((row) => (
                      <TableRow key={row.bdm}>
                        <TableCell>{row.bdm}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">{fmt(row.value)}</TableCell>
                        <TableCell align="right">{row.winRate}%</TableCell>
                      </TableRow>
                    ))}
                    {stats.byBdm.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>
                          No data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </Grid>

            {/* By priority */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  By Priority
                </Typography>
                <Stack spacing={1.5}>
                  {stats.byPriority.map((row) => (
                    <Stack key={row.priority} spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {row.priority} ({row.count})
                        </Typography>
                        <Typography variant="body2">{fmt(row.value)}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={stats.total ? Math.round((row.count / stats.total) * 100) : 0}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={
                          row.priority === 'hot'
                            ? 'error'
                            : row.priority === 'warm'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
