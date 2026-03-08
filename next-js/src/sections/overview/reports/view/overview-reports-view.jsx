'use client';

import { useState, useEffect, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { fCurrency, fShortenNumber, fPercent } from 'src/utils/format-number';

import { fetchPLReport, fetchEmployeePLReport } from 'src/actions/reports';
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
// CSV Export Utility
// ----------------------------------------------------------------------

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(',');
  const body = rows
    .map((r) =>
      Object.values(r)
        .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
        .join(',')
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ----------------------------------------------------------------------
// YoY Delta Chip
// ----------------------------------------------------------------------

function YoYChip({ current, previous }) {
  if (!previous || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = delta >= 0;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
      <Iconify
        icon={isUp ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
        width={14}
        sx={{ color: isUp ? 'success.main' : 'error.main' }}
      />
      <Typography
        variant="caption"
        sx={{ color: isUp ? 'success.main' : 'error.main', fontWeight: 600 }}
      >
        {isUp ? '+' : ''}
        {delta.toFixed(1)}% vs last year
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// KPI Widget
// ----------------------------------------------------------------------

function ReportWidgetSummary({ title, total, prevTotal, color = 'primary', icon, sparkline }) {
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
          <Box sx={{ typography: 'subtitle2', opacity: 0.72, mb: 0.5 }}>{title}</Box>
          <Box sx={{ typography: 'h4', fontWeight: 700 }}>{fShortenNumber(Math.abs(total))}</Box>
          <Box sx={{ typography: 'caption', opacity: 0.64, mt: 0.25 }}>
            {fCurrency(total, { currencyCode: CURRENCY })}
          </Box>
          <YoYChip current={total} previous={prevTotal} />
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
// Margin Stats Row
// ----------------------------------------------------------------------

function MarginStats({ summary, prevSummary }) {
  const theme = useTheme();

  const stats = [
    {
      label: 'Gross Profit Margin',
      value: summary?.grossProfitMargin ?? 0,
      prev: prevSummary?.grossProfitMargin ?? 0,
      color: theme.palette.primary.main,
      icon: 'solar:graph-up-bold-duotone',
    },
    {
      label: 'Net Profit Margin',
      value: summary?.netProfitMargin ?? 0,
      prev: prevSummary?.netProfitMargin ?? 0,
      color:
        (summary?.netProfitMargin ?? 0) >= 0
          ? theme.palette.success.main
          : theme.palette.error.main,
      icon: 'solar:wallet-money-bold-duotone',
    },
    {
      label: 'Expense Ratio',
      value: summary?.expenseRatio ?? 0,
      prev: prevSummary?.expenseRatio ?? 0,
      color: theme.palette.warning.main,
      icon: 'solar:bill-list-bold-duotone',
      invertDelta: true, // lower is better
    },
  ];

  return (
    <>
      {stats.map((stat) => {
        const delta =
          stat.prev && stat.prev !== 0
            ? ((stat.value - stat.prev) / Math.abs(stat.prev)) * 100
            : null;
        const isGood = stat.invertDelta ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0;

        return (
          <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
            <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  flexShrink: 0,
                  borderRadius: '50%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(stat.color, 0.12),
                  color: stat.color,
                }}
              >
                <Iconify icon={stat.icon} width={22} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {stat.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: stat.color }}>
                  {fPercent(stat.value)}
                </Typography>
                {delta !== null && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify
                      icon={isGood ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
                      width={13}
                      sx={{ color: isGood ? 'success.main' : 'error.main' }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: isGood ? 'success.main' : 'error.main', fontWeight: 600 }}
                    >
                      {delta >= 0 ? '+' : ''}
                      {delta.toFixed(1)}% vs {fPercent(stat.prev)}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Card>
          </Grid>
        );
      })}
    </>
  );
}

// ----------------------------------------------------------------------
// P&L Area Chart
// ----------------------------------------------------------------------

function PLChart({ data, prevData, year, prevYear, onYearChange, groupBy, onGroupByChange }) {
  const theme = useTheme();
  const [showYoY, setShowYoY] = useState(false);

  const categories = groupBy === 'quarter' ? QUARTER_LABELS : MONTH_LABELS;

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
  ];

  const series = data?.periods
    ? [
        { name: 'Revenue', data: data.periods.map((p) => Math.round(p.revenue)) },
        { name: 'Gross Profit', data: data.periods.map((p) => Math.round(p.grossProfit)) },
        { name: 'Payroll', data: data.periods.map((p) => Math.round(p.payroll)) },
        { name: 'Op. Expenses', data: data.periods.map((p) => Math.round(p.expenses)) },
      ]
    : [];

  const yoySeries =
    showYoY && prevData?.periods
      ? [
          {
            name: `Revenue ${prevYear}`,
            data: prevData.periods.map((p) => Math.round(p.revenue)),
          },
        ]
      : [];

  const allSeries = [...series, ...yoySeries];
  const allColors = [...chartColors, ...(showYoY ? [alpha(theme.palette.primary.main, 0.45)] : [])];

  const chartOptions = useChart({
    colors: allColors,
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
    stroke: {
      width: allSeries.map((_, i) => (i >= series.length ? 1.5 : 2.5)),
      dashArray: allSeries.map((_, i) => (i >= series.length ? 5 : 0)),
    },
  });

  return (
    <Card>
      <CardHeader
        title="P&L Trend"
        subheader={`Revenue, Gross Profit, Payroll & Expenses — ${year}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showYoY}
                  onChange={(e) => setShowYoY(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  YoY
                </Typography>
              }
              sx={{ mr: 0 }}
            />
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
        colors={allColors.slice(0, series.length)}
        labels={['Revenue', 'Gross Profit', 'Payroll', 'Op. Expenses']}
        values={
          data?.summary
            ? [
                fShortenNumber(data.summary.totalRevenue),
                fShortenNumber(data.summary.grossProfit),
                fShortenNumber(data.summary.totalPayroll),
                fShortenNumber(data.summary.totalExpenses),
              ]
            : ['—', '—', '—', '—']
        }
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        type="area"
        series={allSeries}
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

function PLSummaryCard({ summary, prevSummary }) {
  const theme = useTheme();
  const revenue = summary?.totalRevenue ?? 0;
  const payroll = summary?.totalPayroll ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const grossProfit = summary?.grossProfit ?? 0;
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
    {
      label: 'Gross Profit',
      value: grossProfit,
      color: theme.palette.success.main,
      pct: (Math.max(grossProfit, 0) / maxVal) * 100,
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="P&L Summary" subheader="Totals for selected period" />
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Stack spacing={2.5} sx={{ p: 3 }}>
        {rows.map((row) => (
          <Stack key={row.label} spacing={0.75}>
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
              value={Math.min(Math.max(row.pct, 0), 100)}
              sx={{
                height: 7,
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
          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Gross margin
              </Typography>
              <Typography variant="caption" fontWeight={700} color="success.main">
                {fPercent(summary?.grossProfitMargin ?? 0)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Net margin
              </Typography>
              <Typography
                variant="caption"
                fontWeight={700}
                color={isProfit ? 'success.main' : 'error.main'}
              >
                {fPercent(summary?.netProfitMargin ?? 0)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Expense ratio
              </Typography>
              <Typography variant="caption" fontWeight={700} color="warning.main">
                {fPercent(summary?.expenseRatio ?? 0)}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Period Breakdown Table
// ----------------------------------------------------------------------

const PERIOD_HEAD = [
  { id: 'label', label: 'Period' },
  { id: 'revenue', label: 'Revenue', align: 'right' },
  { id: 'payroll', label: 'Payroll', align: 'right' },
  { id: 'expenses', label: 'Op. Expenses', align: 'right' },
  { id: 'grossProfit', label: 'Gross Profit', align: 'right' },
  { id: 'netProfit', label: 'Net P&L', align: 'right' },
  { id: 'margin', label: 'Margin %', align: 'right' },
];

function PeriodBreakdownTable({ periods, year, groupBy }) {
  const handleExport = () => {
    const rows = periods.map((p) => ({
      Period: p.label,
      Revenue: p.revenue,
      Payroll: p.payroll,
      'Op. Expenses': p.expenses,
      'Gross Profit': p.grossProfit,
      'Net P&L': p.netProfit,
      'Margin %': p.revenue > 0 ? ((p.netProfit / p.revenue) * 100).toFixed(2) : '0.00',
    }));
    downloadCSV(rows, `pl_${groupBy}_${year}.csv`);
  };

  return (
    <Card>
      <CardHeader
        title="Period Breakdown"
        subheader={`${groupBy === 'quarter' ? 'Quarterly' : 'Monthly'} detail — ${year}`}
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:download-bold" width={16} />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        }
        sx={{ mb: 1 }}
      />
      <Scrollbar>
        <Table sx={{ minWidth: 700 }}>
          <TableHeadCustom headCells={PERIOD_HEAD} />
          <TableBody>
            {periods.map((p) => {
              const margin = p.revenue > 0 ? (p.netProfit / p.revenue) * 100 : 0;
              const isProfit = p.netProfit >= 0;
              return (
                <TableRow key={p.period} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {p.label}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {fCurrency(p.revenue, { currencyCode: CURRENCY })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main">
                      {fCurrency(p.payroll, { currencyCode: CURRENCY })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {fCurrency(p.expenses, { currencyCode: CURRENCY })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {fCurrency(p.grossProfit, { currencyCode: CURRENCY })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Label
                      variant="soft"
                      color={isProfit ? 'success' : 'error'}
                      sx={{ minWidth: 90, justifyContent: 'flex-end' }}
                    >
                      {fCurrency(p.netProfit, { currencyCode: CURRENCY })}
                    </Label>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={
                        p.revenue === 0
                          ? 'text.disabled'
                          : margin >= 0
                            ? 'success.main'
                            : 'error.main'
                      }
                    >
                      {p.revenue === 0 ? '—' : fPercent(margin)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Dimension breakdown table
// ----------------------------------------------------------------------

const DIMENSION_HEAD = {
  deal: [
    { id: 'rank', label: 'Rank' },
    { id: 'label', label: 'Deal' },
    { id: 'revenue', label: 'Revenue', align: 'right' },
    { id: 'expenses', label: 'Deal Expenses', align: 'right' },
    { id: 'netProfit', label: 'Net Profit', align: 'right' },
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

function DimensionTable({ dimension, rows, year, onDimensionChange, naked = false }) {
  const Wrapper = naked ? Box : Card;
  const handleExport = () => {
    if (dimension === 'overall' || !rows.length) return;
    const csvRows = rows.map((r, i) => ({
      Rank: i + 1,
      Label: r.label,
      Revenue: r.revenue ?? 0,
      Payroll: r.payroll ?? 0,
      Expenses: r.expenses ?? 0,
      'Net Profit': r.netProfit ?? 0,
    }));
    downloadCSV(csvRows, `breakdown_${dimension}_${year}.csv`);
  };

  return (
    <Wrapper>
      <CardHeader
        title="Breakdown"
        subheader={
          dimension === 'overall' ? 'Select a dimension to drill down' : `Top records — ${year}`
        }
        action={
          <Stack direction="row" spacing={1}>
            {dimension !== 'overall' && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:download-bold" width={16} />}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            )}
            <ChartSelect
              options={DIMENSION_OPTIONS}
              value={DIMENSION_LABEL_MAP[dimension] ?? 'Overall'}
              onChange={(v) => onDimensionChange(DIMENSION_REVERSE_MAP[v] ?? 'overall')}
            />
          </Stack>
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
          <Table sx={{ minWidth: 560 }}>
            <TableHeadCustom headCells={DIMENSION_HEAD[dimension] ?? []} />
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
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
                    {dimension === 'deal' && (
                      <>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {fCurrency(row.revenue ?? 0, { currencyCode: CURRENCY })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="warning.main">
                            {fCurrency(row.expenses ?? 0, { currencyCode: CURRENCY })}
                          </Typography>
                        </TableCell>
                      </>
                    )}
                    {dimension === 'resource' && (
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main">
                          {fCurrency(row.payroll ?? 0, { currencyCode: CURRENCY })}
                        </Typography>
                      </TableCell>
                    )}
                    {dimension === 'costCenter' && (
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main">
                          {fCurrency(row.expenses ?? 0, { currencyCode: CURRENCY })}
                        </Typography>
                      </TableCell>
                    )}
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
    </Wrapper>
  );
}

// ----------------------------------------------------------------------
// Employee P&L Table
// ----------------------------------------------------------------------

const EMPLOYEE_HEAD = [
  { id: 'rank', label: '#' },
  { id: 'employeeName', label: 'Employee' },
  { id: 'designation', label: 'Designation / Dept' },
  { id: 'payrollCost', label: 'Payroll Cost', align: 'right' },
  { id: 'dealRevenue', label: 'Deal Revenue (BDM)', align: 'right' },
  { id: 'dealCount', label: 'Deals', align: 'right' },
  { id: 'commissionAmount', label: 'Commission', align: 'right' },
  { id: 'netContribution', label: 'Net Contribution', align: 'right' },
  { id: 'profitMargin', label: 'Margin %', align: 'right' },
];

function EmployeePLTable({ year, naked = false }) {
  const Wrapper = naked ? Box : Card;
  const [empData, setEmpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchEmployeePLReport({ year }).then((res) => {
      if (res?.error) setError(res.error);
      else setEmpData(res);
      setLoading(false);
    });
  }, [year]);

  const employees = empData?.employees ?? [];
  const summary = empData?.summary ?? {};

  const handleExport = () => {
    if (!employees.length) return;
    const rows = employees.map((e, i) => ({
      Rank: i + 1,
      Employee: e.employeeName,
      Designation: e.designation ?? '',
      Department: e.department ?? '',
      'Payroll Cost': e.payrollCost,
      'Deal Revenue': e.dealRevenue,
      Deals: e.dealCount,
      Commission: e.commissionAmount,
      'Net Contribution': e.netContribution,
      'Margin %': e.profitMargin.toFixed(2),
    }));
    downloadCSV(rows, `employee_pl_${year}.csv`);
  };

  return (
    <Wrapper>
      <CardHeader
        title="Employee P&L"
        subheader={
          empData
            ? `${summary.employeeCount ?? 0} people — Total payroll: ${fCurrency(summary.totalPayroll ?? 0, { currencyCode: CURRENCY })}`
            : `Employee profitability & costs — ${year}`
        }
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              disabled={!employees.length}
              startIcon={<Iconify icon="solar:download-bold" width={16} />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </Stack>
        }
        sx={{ mb: 1 }}
      />

      {error && (
        <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
          Failed to load employee report: {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ px: 3, pb: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Scrollbar sx={{ minHeight: employees.length > 0 ? 360 : 120 }}>
          <Table sx={{ minWidth: 820 }}>
            <TableHeadCustom headCells={EMPLOYEE_HEAD} />
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      No employee data found for {year}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp, idx) => {
                  const isPositive = emp.netContribution >= 0;
                  const hasDealRevenue = emp.dealRevenue > 0;
                  return (
                    <TableRow key={emp.employeeName} hover>
                      <TableCell>
                        <Label
                          variant="soft"
                          color={RANK_COLORS[Math.min(idx, RANK_COLORS.length - 1)]}
                        >
                          {idx + 1}
                        </Label>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {emp.employeeName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          {emp.designation && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {emp.designation}
                            </Typography>
                          )}
                          {emp.department && (
                            <Typography variant="caption" color="text.disabled" noWrap>
                              {emp.department}
                            </Typography>
                          )}
                          {!emp.designation && !emp.department && (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main">
                          {emp.payrollCost > 0
                            ? fCurrency(emp.payrollCost, { currencyCode: CURRENCY })
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="primary.main">
                          {hasDealRevenue
                            ? fCurrency(emp.dealRevenue, { currencyCode: CURRENCY })
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {emp.dealCount > 0 ? (
                          <Label variant="soft" color="info">
                            {emp.dealCount}
                          </Label>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main">
                          {emp.commissionAmount > 0
                            ? fCurrency(emp.commissionAmount, { currencyCode: CURRENCY })
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Label variant="soft" color={isPositive ? 'success' : 'error'}>
                          {fCurrency(emp.netContribution, { currencyCode: CURRENCY })}
                        </Label>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            !hasDealRevenue
                              ? 'text.disabled'
                              : isPositive
                                ? 'success.main'
                                : 'error.main'
                          }
                        >
                          {hasDealRevenue ? fPercent(emp.profitMargin) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      )}
    </Wrapper>
  );
}

// ----------------------------------------------------------------------
// Main view
// ----------------------------------------------------------------------

export function OverviewReportsView() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [groupBy, setGroupBy] = useState('month');
  const [dimension, setDimension] = useState('overall');
  const [activeTab, setActiveTab] = useState(0);

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
  const prevSummary = data?.prevSummary ?? {};
  const periods = data?.periods ?? [];
  const prevPeriods = data?.prevPeriods ?? [];
  const dimensionRows = data?.dimensionRows ?? [];
  const prevYear = data?.prevYear ?? year - 1;

  const sparkCats = periods.map((p) => p.label);

  const kpiCards = [
    {
      title: 'Total Revenue',
      total: summary.totalRevenue ?? 0,
      prevTotal: prevSummary.totalRevenue ?? 0,
      color: 'primary',
      icon: 'solar:graph-up-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.revenue)), categories: sparkCats },
    },
    {
      title: 'Gross Profit',
      total: summary.grossProfit ?? 0,
      prevTotal: prevSummary.grossProfit ?? 0,
      color: 'success',
      icon: 'solar:chart-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.grossProfit)), categories: sparkCats },
    },
    {
      title: 'Payroll Cost',
      total: summary.totalPayroll ?? 0,
      prevTotal: prevSummary.totalPayroll ?? 0,
      color: 'error',
      icon: 'solar:users-group-rounded-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.payroll)), categories: sparkCats },
    },
    {
      title: 'Op. Expenses',
      total: summary.totalExpenses ?? 0,
      prevTotal: prevSummary.totalExpenses ?? 0,
      color: 'warning',
      icon: 'solar:bill-list-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.expenses)), categories: sparkCats },
    },
    {
      title: 'Net P&L',
      total: summary.netProfit ?? 0,
      prevTotal: prevSummary.netProfit ?? 0,
      color: (summary.netProfit ?? 0) >= 0 ? 'success' : 'error',
      icon:
        (summary.netProfit ?? 0) >= 0 ? 'solar:wallet-bold-duotone' : 'solar:danger-bold-duotone',
      sparkline: { series: periods.map((p) => Math.round(p.netProfit)), categories: sparkCats },
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
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
        {/* KPI Cards */}
        {kpiCards.map((kpi) => (
          <Grid key={kpi.title} size={{ xs: 12, sm: 6, md: 4, lg: 12 / 5 }}>
            <ReportWidgetSummary
              title={kpi.title}
              total={loading ? 0 : kpi.total}
              prevTotal={loading ? 0 : kpi.prevTotal}
              color={kpi.color}
              icon={kpi.icon}
              sparkline={loading ? { series: [], categories: [] } : kpi.sparkline}
            />
          </Grid>
        ))}

        {/* Margin Stats */}
        <MarginStats
          summary={loading ? null : summary}
          prevSummary={loading ? null : prevSummary}
        />

        {/* Chart + Summary */}
        <Grid size={{ xs: 12, md: 8 }}>
          <PLChart
            data={loading ? null : data}
            prevData={loading ? null : { periods: prevPeriods }}
            year={year}
            prevYear={prevYear}
            onYearChange={setYear}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <PLSummaryCard
            summary={loading ? null : summary}
            prevSummary={loading ? null : prevSummary}
          />
        </Grid>

        {/* Period Breakdown Table */}
        <Grid size={{ xs: 12 }}>
          <PeriodBreakdownTable periods={loading ? [] : periods} year={year} groupBy={groupBy} />
        </Grid>

        {/* Tabs: Dimension Breakdown + Employee P&L */}
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: (theme) => theme.customShadows?.card ?? theme.shadows[2],
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 3,
                pt: 1.5,
                borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 1)}`,
              }}
            >
              <Tab label="Dimension Breakdown" />
              <Tab label="Employee P&L" />
            </Tabs>

            {activeTab === 0 && (
              <DimensionTable
                dimension={dimension}
                rows={loading ? [] : dimensionRows}
                year={year}
                onDimensionChange={setDimension}
                naked
              />
            )}
            {activeTab === 1 && <EmployeePLTable year={year} naked />}
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
