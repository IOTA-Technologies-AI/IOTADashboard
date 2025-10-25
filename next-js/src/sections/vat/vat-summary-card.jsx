import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function VATSummaryCard({ quarterInfo, arVAT, apVAT, zatcaPayable }) {
  const theme = useTheme();

  const { label, quarterStart, quarterEnd } = quarterInfo;
  const { netAmount, isPayable, isRefundable, status } = zatcaPayable;

  const getStatusColor = () => {
    if (isPayable) return theme.vars.palette.error.main;
    if (isRefundable) return theme.vars.palette.success.main;
    return theme.vars.palette.text.secondary;
  };

  const getStatusIcon = () => {
    if (isPayable) return 'solar:card-send-bold-duotone';
    if (isRefundable) return 'solar:card-recive-bold-duotone';
    return 'solar:check-circle-bold-duotone';
  };

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          {/* Quarter Info */}
          <Box>
            <Typography variant="h4" gutterBottom>
              {label} VAT Summary
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {quarterStart} - {quarterEnd}
            </Typography>
          </Box>

          <Divider />

          {/* AR VAT */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify
                icon="solar:sale-bold-duotone"
                width={24}
                sx={{ color: theme.vars.palette.info.main }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Accounts Receivable VAT (Collected)
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ color: theme.vars.palette.info.main }}>
              {fCurrency(arVAT, { currency: 'SAR' })}
            </Typography>
          </Stack>

          {/* AP VAT */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify
                icon="solar:bill-list-bold-duotone"
                width={24}
                sx={{ color: theme.vars.palette.warning.main }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Accounts Payable VAT (Paid)
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ color: theme.vars.palette.warning.main }}>
              {fCurrency(apVAT, { currency: 'SAR' })}
            </Typography>
          </Stack>

          <Divider />

          {/* Net ZATCA Amount */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon={getStatusIcon()} width={32} sx={{ color: getStatusColor() }} />
              <Box>
                <Typography variant="subtitle2">Net VAT {status} to ZATCA</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isPayable && 'Amount to be paid'}
                  {isRefundable && 'Amount to be refunded'}
                  {!isPayable && !isRefundable && 'No payment required'}
                </Typography>
              </Box>
            </Stack>
            <Typography
              variant="h4"
              sx={{
                color: getStatusColor(),
                fontWeight: 'bold',
              }}
            >
              {fCurrency(Math.abs(netAmount), { currency: 'SAR' })}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}
