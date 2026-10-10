import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

/**
 * `percent` is optional: without it the trend line is replaced by `caption`.
 * `caption` labels the comparison (default "last 7 days"); `unit` (e.g. "SAR")
 * is shown before the total.
 */
export function AppWidgetSummary({
  title,
  percent,
  total,
  chart,
  caption = 'last 7 days',
  unit,
  sx,
  ...other
}) {
  const theme = useTheme();

  const chartColors = chart?.colors ?? [theme.palette.primary.main];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories: chart?.categories },
    tooltip: {
      y: { formatter: (value) => fNumber(value), title: { formatter: () => '' } },
    },
    plotOptions: { bar: { borderRadius: 1.5, columnWidth: '64%' } },
    ...chart?.options,
  });

  const renderTrending = () => (
    <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
      <Iconify
        width={24}
        icon={
          percent < 0
            ? 'solar:double-alt-arrow-down-bold-duotone'
            : 'solar:double-alt-arrow-up-bold-duotone'
        }
        sx={{
          flexShrink: 0,
          color: 'success.main',
          ...(percent < 0 && { color: 'error.main' }),
        }}
      />

      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>

      <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
        {caption}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          display: 'flex',
          zIndex: 'unset',
          overflow: 'unset',
          alignItems: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

        <Box sx={{ mt: 1.5, mb: 1, typography: 'h3' }}>
          {unit ? (
            <Box
              component="span"
              sx={{ typography: 'subtitle1', color: 'text.secondary', mr: 0.75 }}
            >
              {unit}
            </Box>
          ) : null}
          {fNumber(total)}
        </Box>

        {percent === null || percent === undefined || !Number.isFinite(percent) ? (
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{caption}</Box>
        ) : (
          renderTrending()
        )}
      </Box>

      {chart?.series?.length ? (
        <Chart
          type="bar"
          series={[{ data: chart.series }]}
          options={chartOptions}
          sx={{ width: 60, height: 40 }}
        />
      ) : null}
    </Card>
  );
}
