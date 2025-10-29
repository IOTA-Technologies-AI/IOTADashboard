'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import CardHeader from '@mui/material/CardHeader';

import { fPercent, fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

export function FinanceOverview({ title, subheader, chart, ...other }) {
  const theme = useTheme();

  const [selectedTab, setSelectedTab] = useState('revenue');

  const chartColors = chart.colors ?? [
    [theme.palette.primary.dark, theme.palette.primary.main],
    [theme.palette.error.dark, theme.palette.error.main],
  ];

  const chartOptions = useChart({
    colors: chartColors.map((color) => color[1]),
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: chartColors.map((color) => [
          { offset: 0, color: color[0], opacity: 1 },
          { offset: 100, color: color[1], opacity: 1 },
        ]),
      },
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    xaxis: {
      categories: chart.categories,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => fCurrency(value),
      },
    },
  });

  const handleChangeSeries = useCallback((newValue) => {
    setSelectedTab(newValue);
  }, []);

  const currentSeries = chart.series.find((i) => i.name.toLowerCase() === selectedTab);

  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <ButtonBase
            onClick={() => {}}
            sx={{
              pl: 1,
              py: 0.5,
              pr: 0.5,
              borderRadius: 1,
              typography: 'subtitle2',
              border: `solid 1px ${theme.palette.divider}`,
            }}
          >
            View Report
            <Iconify width={16} icon="eva:arrow-ios-forward-fill" sx={{ ml: 0.5 }} />
          </ButtonBase>
        }
      />

      <Box sx={{ px: 3, pb: 1 }} dir="ltr">
        <Chart
          type="area"
          series={[{ name: currentSeries.name, data: currentSeries.data.map((item) => item.data) }]}
          options={chartOptions}
          height={290}
        />
      </Box>

      <Box sx={{ px: 3, pb: 3 }}>
        <ChartLegends
          colors={chartOptions?.colors}
          labels={chart.series.map((i) => i.name)}
          values={[fCurrency(225000), fCurrency(158000)]}
          sublabels={[fPercent(12.5), fPercent(8.2)]}
          icons={[
            <Box
              key="revenue"
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: 'success.main',
              }}
            />,
            <Box
              key="expenses"
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: 'error.main',
              }}
            />,
          ]}
        />
      </Box>
    </Card>
  );
}
