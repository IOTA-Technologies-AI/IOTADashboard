import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { fCurrency } from 'src/utils/format-number';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

/**
 * Azure Cloud Billing card — last 6 months, stacked by category.
 * Only rendered for superAdmin (caller must gate visibility).
 *
 * Props:
 *   data     – array of { month, office365, azure, foundry, total }
 *   currency – e.g. "USD"
 *   loading  – show skeletons while fetching
 */
export function AppAzureBilling({
  data = [],
  currency = 'USD',
  loading = false,
  error,
  sx,
  ...other
}) {
  const theme = useTheme();

  const categories = data.map((d) => d.month);
  const office365Series = data.map((d) => d.office365);
  const azureSeries = data.map((d) => d.azure);
  const foundrySeries = data.map((d) => d.foundry);

  const totalOffice365 = office365Series.reduce((a, b) => a + b, 0);
  const totalAzure = azureSeries.reduce((a, b) => a + b, 0);
  const totalFoundry = foundrySeries.reduce((a, b) => a + b, 0);
  const grandTotal = totalOffice365 + totalAzure + totalFoundry;

  const chartColors = [
    theme.palette.info.main, // Office 365
    theme.palette.warning.main, // Azure
    theme.palette.success.main, // AI Foundry
  ];

  const chartOptions = useChart({
    chart: { stacked: true },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories },
    yaxis: {
      labels: {
        formatter: (val) => `$${Math.round(val)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) => fCurrency(val, { currency }),
      },
    },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 2 } },
    legend: { show: false },
  });

  const series = [
    { name: 'Office 365', data: office365Series },
    { name: 'Azure', data: azureSeries },
    { name: 'AI Foundry', data: foundrySeries },
  ];

  if (loading) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader title="Azure Cloud Billing" subheader="Last 6 months" />
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title="Azure Cloud Billing"
        subheader="Last 6 months · Super Admin only"
        sx={{ mb: 1 }}
      />

      {error && (
        <Tooltip title={error} placement="bottom">
          <Alert severity="warning" sx={{ mx: 3, mb: 1 }}>
            Cost data unavailable — IAM permission required.
          </Alert>
        </Tooltip>
      )}

      <ChartLegends
        colors={chartColors}
        labels={['Office 365', 'Azure', 'AI Foundry']}
        values={[fCurrency(totalOffice365), fCurrency(totalAzure), fCurrency(totalFoundry)]}
        sx={{ px: 3, gap: 3, mb: 1 }}
      />

      <Chart
        type="bar"
        series={series}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ pl: 1, py: 2.5, pr: 2.5, height: 240 }}
      />

      <Divider sx={{ mx: 3, borderStyle: 'dashed' }} />

      {/* Summary row */}
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
        sx={{ py: 2 }}
      >
        {[
          { label: 'Office 365', value: totalOffice365, color: theme.palette.info.main },
          { label: 'Azure', value: totalAzure, color: theme.palette.warning.main },
          { label: 'AI Foundry', value: totalFoundry, color: theme.palette.success.main },
          { label: 'Total', value: grandTotal, color: theme.palette.text.primary },
        ].map((item) => (
          <Box key={item.label} sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {item.label}
            </Typography>
            <Typography variant="subtitle2" sx={{ color: item.color }}>
              {fCurrency(item.value)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Card>
  );
}
