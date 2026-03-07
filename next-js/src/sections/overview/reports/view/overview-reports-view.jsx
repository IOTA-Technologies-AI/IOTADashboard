'use client';

import { useState, useEffect, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fCurrency, fShortenNumber, fPercent } from 'src/utils/format-number';

import { fetchPLReport } from 'src/actions/reports';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';
import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

const CURRENCY = 'SAR';
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i));

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ----------------------------------------------------------------------
// KPI Widget — mirrors AnalyticsWidgetSummary style
// ----------------------------------------------------------------------

function ReportWidgetSummary({ title, total, color = 'primary', icon, sparkline }) {
  const theme = useTheme();
  const isNegative = total < 0;
  const displayColor = isNegative ? 'error' : color;

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: [theme.palette[displayColor].dark],
    xaxis: { categories: sparkline.categories },
    grid: { padding: { top: 6, left: 6, right: 6, bottom: 6 } },
    tooltip: {
      y: {
        formatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
        title: { formatter: () => '' },
      },
    },
    markers: { strokeWidth: 0 },
  });

  return (
    <Card
      sx={{
        p: 3,
        boxShadow: 'none',
        position: 'relative',
        color: `${displayColor}.darker`,
        backgroundColor: 'common.white',
        backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[displayColor].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[displayColor].lightChannel, 0.48)})`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ typography: 'subtitle2', opacity: 0.72, mb: 1 }}>{title}</Box>
          <Box sx={{ typography: 'h4', fontWeight: 700 }}>{fShortenNumber(Math.abs(total))}</Box>
          <Box sx={{ typography: 'caption', opacity: 0.64, mt: 0.5 }}>
            {fCurrency(total, { currencyCode: CURRENCY })}
          </Box>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: varAlpha(theme.vars.palette[displayColor].mainChannel, 0.16),
            color: `${displayColor}.main`,
          }}
        >
          <Iconify icon={icon} width={26} />
        </Box>
      </Box>

      <Chart
        type="line"
        series={[{ data: sparkline.series }]}
        options={chartOptions}
        sx={{ mt: 2, width: '100%', height: 56 }}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// P&L Area Chart
// ----------------------------------------------------------------------

function PLChart({ data, year, onYearChange, groupBy, onGroupByChange }) {
  const theme = useTheme();

  const categories = groupBy === 'quarter' ? QUARTER_LABELS : MONTH_LABELS;
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
  ];

  const series = data?.periods
    ? [
        { name: 'Revenue', data: data.periods.map((p) => Math.round(p.revenue)) },
        { name: 'Payroll', data: data.periods.map((p) => Math.round(p.payroll)) },
        { name: 'Expenses', data: data.periods.map((p) => Math.round(p.expenses)) },
      ]
    : [];

  const chartOptions = useChart({
    colors: chartColors,
    xaxis: { categories },
    yaxis: {
      labels: {
        formatter: (v) => {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
          return String(Math.round(v));
        },
      },
    },
    tooltip: { y: { formatter: (v) => fCurrency(v, { currencyCode: CURRENCY }) } },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.01, stops: [0, 90, 100] },
    },
    stroke: { width: 2.5 },
  });

  return (
    <Card>
      <CardHeader
        title="P&L Trend"
        subheader={`Revenue, Payroll & Expenses — ${year}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <ChartSelect
              options={['Monthly', 'Quarterly']}
              value={groupBy === 'quarter' ? 'Quarterly' : 'Monthly'}
              onChange={(v) => onGroupByChange(v === 'Quarterly' ? 'quarter' : 'month')}
            />
            <ChartSelect
              options={YEAR_OPTIONS}
              value={String(year)}
              onChange={(v) => onYearChange(Number(v))}
            />
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={chartColors}
        labels={['Revenue', 'Payroll', 'Expenses']}
        values={
          data?.summary
            ? [
                fShortenNumber(data.summary.totalRevenue),
                fShortenNumber(data.summary.totalPayroll),
                fShortenNumber(data.summary.totalExpenses),
              ]
            : ['—', '—', '—']
        }
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        type="area"
        series={series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ pl: 1, py: 2.5, pr: 2.5, height: 320 }}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------
// P&L Summary card
// ----------------------------------------------------------------------

function PLSummaryCard({ summary }) {
  const theme = useTheme();
  const revenue = summary?.totalRevenue ?? 0;
  const payroll = summary?.totalPayroll ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const isProfit = netProfit >= 0;
  const maxVal = Math.max(revenue, payroll + expenses, 1);

  const rows = [
    {
      label: 'Revenue',
      value: revenue,
      color: theme.palette.primary.main,
      pct: (revenue / maxVal) * 100,
    },
    {
      label: 'Payroll',
      value: payroll,
      color: theme.palette.error.main,
      pct: (payroll / maxVal) * 100,
    },
    {
      label: 'Op. Expenses',
      value: expenses,
      color: theme.palette.warning.main,
      pct: (expenses / maxVal) * 100,
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="P&L Summary" subheader="Totals for selected period" />
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Stack spacing={3} sx={{ p: 3 }}>
        {rows.map((row) => (
          <Stack key={row.label} spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography variant="subtitle2">
                {fCurrency(row.value, { currencyCode: CURRENCY })}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(row.pct, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(row.color, 0.12),
                '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 4 },
              }}
            />
          </Stack>
        ))}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Net P&L</Typography>
          <Label
            variant="soft"
            color={isProfit ? 'success' : 'error'}
            sx={{ typography: 'subtitle2', px: 1.5, py: 0.5 }}
          >
            <Iconify
              icon={isProfit ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
              width={14}
              sx={{ mr: 0.5 }}
            />
            {fCurrency(netProfit, { currencyCode: CURRENCY })}
          </Label>
        </Stack>

        {revenue > 0 && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Gross margin
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              color={isProfit ? 'success.main' : 'error.main'}
            >
              {fPercent((netProfit / revenue) * 100)}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Dimension breakdown table — EcommerceBestSalesman pattern
// ----------------------------------------------------------------------

const DIMENSION_HEAD = {
  deal: [
    { id: 'rank', label: 'Rank' },
    { id: 'label', label: 'Deal' },
    { id: 'revenue', label: 'Revenue', align: 'right' },
    { id: 'netProfit', label: 'Contribution', align: 'right' },
  ],
  resource: [
    { id: 'rank', label: 'Rank' },
    { id: 'label', label: 'Employee' },
    { id: 'payroll', label: 'Payroll Cost', align: 'right' },
    { id: 'netProfit', label: 'P&L Impact', align: 'right' },
  ],
  costCenter: [
    { id: 'rank', label: 'Rank' },
    { id: 'label', label: 'Cost Center' },
    { id: 'expenses', label: 'Expenses', align: 'right' },
    { id: 'netProfit', label: 'P&L Impact', align: 'right' },
  ],
};

const RANK_COLORS = ['primary', 'secondary', 'info', 'warning', 'error'];
const DIMENSION_OPTIONS = ['Overall', 'By Deal', 'By Resource', 'By Cost Center'];
const DIMENSION_LABEL_MAP = {
  overall: 'Overall',
  deal: 'By Deal',
  resource: 'By Resource',
  costCenter: 'By Cost Center',
};
const DIMENSION_REVERSE_MAP = {
  Overall: 'overall',
  'By Deal': 'deal',
  'By Resource': 'resource',
  'By Cost Center': 'costCenter',
};
const AMOUNT_FIELD = { deal: 'revenue', resource: 'payroll', costCenter: 'expenses' };

function DimensionTable({ dimension, rows, year, onDimensionChange }) {
  return (
    <Card>
      <CardHeader
        title="Breakdown"
        subheader={
          dimension === 'overall' ? 'Select a dimension to drill down' : `Top records — ${year}`
        }
        action={
          <ChartSelect
            options={DIMENSION_OPTIONS}
            value={DIMENSION_LABEL_MAP[dimension] ?? 'Overall'}
            onChange={(v) => onDimensionChange(DIMENSION_REVERSE_MAP[v] ?? 'overall')}
          />
        }
        sx={{ mb: 3 }}
      />

      {dimension === 'overall' ? (
        <Box
          sx={{ px: 3, pb: 4, textAlign: 'center', color: 'text.disabled', typography: 'body2' }}
        >
          Choose a dimension above to see a breakdown by Deal, Resource, or Cost Center.
        </Box>
      ) : (
        <Scrollbar sx={{ minHeight: rows.length > 0 ? 300 : 120 }}>
          <Table sx={{ minWidth: 580 }}>
            <TableHeadCustom headCells={DIMENSION_HEAD[dimension] ?? []} />
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      No data found for {year}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Label
                        variant="soft"
                        color={RANK_COLORS[Math.min(idx, RANK_COLORS.length - 1)]}
                      >
                        #{idx + 1}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.label}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {fCurrency(row[AMOUNT_FIELD[dimension]] ?? 0, { currencyCode: CURRENCY })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Label variant="soft" color={(row.netProfit ?? 0) >= 0 ? 'success' : 'error'}>
                        {fCurrency(row.netProfit ?? 0, { currencyCode: CURRENCY })}
                      </Label>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------
// Main view
// ----------------------------------------------------------------------

export function OverviewReportsView() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [groupBy, setGroupBy] = useState('month');
  const [dimension, setDimension] = useState('overall');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchPLReport({ year, groupBy, dimension });
    if (result?.error) setError(result.error);
    else setData(result);
    setLoading(false);
  }, [year, groupBy, dimension]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = data?.summary ?? {};
  const periods = data?.periods ?? [];
  const dimensionRows = data?.dimensionRows ?? [];

  const sparkCats = periods.map((p) => p.label);

  const kpiCards = [
    {
      title: 'Total Revenue',
      total: summary.totalRevenue ?? 0,
      color: 'primary',
      icon: 'solar:graph-up-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.revenue)), categories: sparkCats },
    },
    {
      title: 'Payroll Cost',
      total: summary.totalPayroll ?? 0,
      color: 'error',
      icon: 'solar:users-group-rounded-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.payroll)), categories: sparkCats },
    },
    {
      title: 'Op. Expenses',
      total: summary.totalExpenses ?? 0,
      color: 'warning',
      icon: 'solar:bill-list-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.expenses)), categories: sparkCats },
    },
    {
      title: 'Net P&L',
      total: summary.netProfit ?? 0,
      color: (summary.netProfit ?? 0) >= 0 ? 'success' : 'error',
      icon:
        (summary.netProfit ?? 0) >= 0 ? 'solar:wallet-bold-duotone' : 'solar:danger-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.netProfit)), categories: sparkCats },
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" sx={{ mb: 5 }}>
        <Box>
          <Typography variant="h4">Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            Profit & Loss overview — {year}
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load report: {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {kpiCards.map((kpi) => (
          <Grid key={kpi.title} size={{ xs: 12, md: 6, lg: 3 }}>
            <ReportWidgetSummary
              title={kpi.title}
              total={loading ? 0 : kpi.total}
              color={kpi.color}
              icon={kpi.icon}
              sparkline={loading ? { series: [], categories: [] } : kpi.sparkline}
            />
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 8 }}>
          <PLChart
            data={loading ? null : data}
            year={year}
            onYearChange={setYear}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <PLSummaryCard summary={loading ? null : summary} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DimensionTable
            dimension={dimension}
            rows={loading ? [] : dimensionRows}
            year={year}
            onDimensionChange={setDimension}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
