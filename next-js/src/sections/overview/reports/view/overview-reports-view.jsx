'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { DataGrid } from '@mui/x-data-grid';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fCurrency } from 'src/utils/format-number';

import { fetchPLReport } from 'src/actions/reports';
import { DashboardContent } from 'src/layouts/dashboard';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const CURRENCY = 'SAR';
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ----------------------------------------------------------------------

function KpiCard({ title, value, color, subtitle }) {
  const isNegative = typeof value === 'number' && value < 0;
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{ color: isNegative ? 'error.main' : 'text.primary', fontWeight: 700 }}
        >
          {typeof value === 'number' ? fCurrency(value, { currencyCode: CURRENCY }) : '—'}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

const DIMENSION_COLUMNS = {
  deal: [
    { field: 'label', headerName: 'Deal', flex: 2, minWidth: 200 },
    {
      field: 'revenue',
      headerName: 'Revenue',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
    {
      field: 'netProfit',
      headerName: 'Contribution',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
  ],
  resource: [
    { field: 'label', headerName: 'Employee', flex: 2, minWidth: 200 },
    {
      field: 'payroll',
      headerName: 'Payroll Cost',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
    {
      field: 'netProfit',
      headerName: 'Impact on P&L',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
  ],
  costCenter: [
    { field: 'label', headerName: 'Cost Center', flex: 2, minWidth: 200 },
    {
      field: 'expenses',
      headerName: 'Expenses',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
    {
      field: 'netProfit',
      headerName: 'Impact on P&L',
      flex: 1,
      minWidth: 140,
      type: 'number',
      valueFormatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
    },
  ],
};

// ----------------------------------------------------------------------

export function OverviewReportsView() {
  const theme = useTheme();

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
    if (result?.error) {
      setError(result.error);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [year, groupBy, dimension]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ── Chart setup ──────────────────────────────────────────────────────────

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.error.light,
  ];

  const chartSeries = data?.periods
    ? [
        { name: 'Revenue', data: data.periods.map((p) => p.revenue) },
        { name: 'Expenses', data: data.periods.map((p) => p.expenses) },
        { name: 'Payroll', data: data.periods.map((p) => p.payroll) },
      ]
    : [];

  const chartOptions = useChart({
    colors: chartColors,
    stroke: { width: 0 },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    xaxis: {
      categories: data?.periods?.map((p) => p.label) ?? [],
    },
    yaxis: {
      labels: {
        formatter: (v) => {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
          return String(Math.round(v));
        },
      },
    },
    tooltip: {
      y: {
        formatter: (v) => fCurrency(v, { currencyCode: CURRENCY }),
      },
    },
    legend: { position: 'top', horizontalAlign: 'right' },
  });

  // ── Dimension table rows ─────────────────────────────────────────────────

  const tableRows = (data?.dimensionRows ?? []).map((row, idx) => ({ id: idx, ...row }));
  const tableColumns = dimension !== 'overall' ? (DIMENSION_COLUMNS[dimension] ?? []) : [];

  // ── summary values ───────────────────────────────────────────────────────

  const summary = data?.summary ?? {};

  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            Profit & Loss overview by period and dimension
          </Typography>
        </Box>
      </Stack>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            flexWrap="wrap"
          >
            {/* Year selector */}
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Year</InputLabel>
              <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEAR_OPTIONS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Period grouping */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                Period
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={groupBy}
                onChange={(_, v) => v && setGroupBy(v)}
              >
                <ToggleButton value="month">Monthly</ToggleButton>
                <ToggleButton value="quarter">Quarterly</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Dimension */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                Breakdown by
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={dimension}
                onChange={(_, v) => v && setDimension(v)}
              >
                <ToggleButton value="overall">Overall</ToggleButton>
                <ToggleButton value="deal">Deal</ToggleButton>
                <ToggleButton value="resource">Resource</ToggleButton>
                <ToggleButton value="costCenter">Cost Center</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load report: {error}
        </Alert>
      )}

      {/* Loading overlay */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Total Revenue"
                value={summary.totalRevenue}
                color={theme.palette.primary.main}
                subtitle="Won deals in period"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Operating Expenses"
                value={summary.totalExpenses}
                color={theme.palette.warning.main}
                subtitle="Approved expenses"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Payroll Cost"
                value={summary.totalPayroll}
                color={theme.palette.error.light}
                subtitle="Net payroll (excl. rejected/draft)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                title="Net P&L"
                value={summary.netProfit}
                color={
                  (summary.netProfit ?? 0) >= 0
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
                subtitle="Revenue − Payroll − Expenses"
              />
            </Grid>
          </Grid>

          {/* Chart */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={`P&L — ${year} (${groupBy === 'month' ? 'Monthly' : 'Quarterly'})`}
              subheader="Revenue vs Expenses vs Payroll"
            />
            <Divider sx={{ borderStyle: 'dashed' }} />
            {chartSeries.length > 0 && (
              <Chart
                type="bar"
                series={chartSeries}
                options={chartOptions}
                sx={{ p: 2, height: 340 }}
              />
            )}
          </Card>

          {/* Dimension breakdown table */}
          {dimension !== 'overall' && tableRows.length > 0 && (
            <Card>
              <CardHeader
                title={
                  dimension === 'deal'
                    ? 'Revenue by Deal'
                    : dimension === 'resource'
                      ? 'Payroll Cost by Resource'
                      : 'Expenses by Cost Center'
                }
                subheader={`${tableRows.length} record${tableRows.length !== 1 ? 's' : ''} — ${year}`}
              />
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Box sx={{ p: 2 }}>
                <DataGrid
                  rows={tableRows}
                  columns={tableColumns}
                  autoHeight
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  sx={{ border: 'none' }}
                />
              </Box>
            </Card>
          )}

          {dimension !== 'overall' && tableRows.length === 0 && (
            <Alert severity="info">
              No {dimension} data found for {year}.
            </Alert>
          )}
        </>
      )}
    </DashboardContent>
  );
}
