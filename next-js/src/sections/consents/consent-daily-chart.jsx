'use client';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// Categorical slots 1 and 2 of the validated reference palette, stepped per
// mode; checked against this theme's card surfaces (#FFFFFF / #1C252E) —
// CVD ΔE ≥ 24, normal-vision ΔE ≥ 31, ≥ 3:1 contrast in both modes.
const SERIES_COLORS = {
  light: { accepted: '#2a78d6', essential: '#eb6834' },
  dark: { accepted: '#3987e5', essential: '#d95926' },
};

/** Every day of `month` ("YYYY-MM") up to today, so quiet days show as gaps, not missing columns. */
function daysOf(month, byDay) {
  const counts = new Map(byDay.map((d) => [d.day, d]));
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  for (let d = 1; d <= last; d += 1) {
    const day = `${month}-${String(d).padStart(2, '0')}`;
    if (day > today) break;
    out.push({
      day,
      accepted: counts.get(day)?.accepted ?? 0,
      essential: counts.get(day)?.essential ?? 0,
    });
  }
  return out;
}

/**
 * Cookie-banner choices per day, accepted all vs essential only, stacked.
 * Hover shows both counts for the day; "View as table" gives the same numbers
 * without the chart.
 */
export function ConsentDailyChart({ month, byDay }) {
  const theme = useTheme();
  const [asTable, setAsTable] = useState(false);
  const colors = SERIES_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const days = useMemo(() => daysOf(month, byDay), [month, byDay]);

  const series = [
    { name: 'Accepted all', data: days.map((d) => d.accepted) },
    { name: 'Essential only', data: days.map((d) => d.essential) },
  ];

  const options = useChart({
    chart: { stacked: true, toolbar: { show: false }, zoom: { enabled: false } },
    colors: [colors.accepted, colors.essential],
    // A 2px surface-coloured gap between stacked segments.
    stroke: { show: true, width: 2, colors: [theme.palette.background.paper] },
    plotOptions: {
      bar: {
        columnWidth: '24px',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: days.map((d) => d.day.slice(8)),
      labels: { hideOverlappingLabels: true },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => fNumber(v) || '0' }, forceNiceScale: true, min: 0 },
    grid: { strokeDashArray: 3, borderColor: theme.vars?.palette.divider ?? theme.palette.divider },
    legend: { show: true, position: 'top', horizontalAlign: 'right' },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (_, { dataPointIndex }) => days[dataPointIndex]?.day ?? '' },
      y: { formatter: (v) => fNumber(v) || '0' },
    },
    states: { hover: { filter: { type: 'darken', value: 0.9 } } },
  });

  return (
    <Card>
      <CardHeader
        title="Choices per day"
        subheader="Accepted all vs essential only"
        action={
          <Button size="small" color="inherit" onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'View as chart' : 'View as table'}
          </Button>
        }
      />
      {asTable ? (
        <TableContainer sx={{ mt: 1, maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell align="right">Accepted all</TableCell>
                <TableCell align="right">Essential only</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.day}>
                  <TableCell>{d.day}</TableCell>
                  <TableCell align="right">{fNumber(d.accepted) || 0}</TableCell>
                  <TableCell align="right">{fNumber(d.essential) || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Chart
          type="bar"
          series={series}
          options={options}
          aria-label="Cookie-banner choices per day, accepted all versus essential only"
          sx={{ height: 280, px: 2, pb: 1 }}
        />
      )}
    </Card>
  );
}
