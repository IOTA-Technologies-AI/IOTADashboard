'use client';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency } from 'src/utils/format-number';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

export function FinanceExpenseCategories({ title, subheader, chart, ...other }) {
  const theme = useTheme();

  const chartColors = chart?.colors ?? [[theme.palette.primary.dark, theme.palette.primary.main]];

  const chartSeries = chart?.series?.map((item) => item.value) ?? [];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors.map((color) => color[1]),
    labels: chart?.series?.map((item) => item.label) ?? [],
    stroke: { width: 0 },
    dataLabels: { enabled: false, dropShadow: { enabled: false } },
    tooltip: {
      y: {
        formatter: (value) => fCurrency(value),
        title: { formatter: (seriesName) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => fCurrency(chartSeries.reduce((a, b) => a + b, 0)),
            },
          },
        },
      },
    },
  });

  if (!chart?.series || chartSeries.length === 0) {
    return null;
  }

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Chart
        type="donut"
        series={chartSeries}
        options={chartOptions}
        width="100%"
        height={320}
        sx={{ my: 6 }}
      />

      <ChartLegends
        labels={chartOptions?.labels}
        colors={chartOptions?.colors}
        sx={{ p: 3, justifyContent: 'center' }}
      />
    </Card>
  );
}
