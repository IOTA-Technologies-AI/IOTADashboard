'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function FinanceCashFlowStatistics({ title, subheader, chart, ...other }) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [[theme.palette.primary.dark, theme.palette.primary.main]];

  const chartOptions = useChart({
    colors: chartColors.map((color) => color[1]),
    stroke: {
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: chart.categories,
    },
    tooltip: {
      y: {
        formatter: (value) => fCurrency(value),
      },
    },
    plotOptions: {
      bar: {
        columnWidth: '56%',
        borderRadius: 4,
      },
    },
  });

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ mx: 3 }} dir="ltr">
        <Chart type="bar" series={chart.series} options={chartOptions} height={320} />
      </Box>
    </Card>
  );
}
