import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

export function InvoiceTotalSummary({
  vatDetails,
  shipping,
  subtotal,
  discount,
  totalAmount,
  currencyCode = 'SAR',
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Row
          label="Subtotal (excl. VAT)"
          value={fCurrency(subtotal || 0, { currency: currencyCode })}
        />
        <Row
          label={`VAT (${vatDetails?.vatRatePercent || 0}%)`}
          value={fCurrency(vatDetails?.vatAmount || 0, { currency: currencyCode })}
          sx={{ color: (vatDetails?.vatAmount || 0) > 0 ? 'error.main' : 'text.secondary' }}
        />
        <Row label="Discount" value={fCurrency(discount || 0, { currency: currencyCode })} />
        <Row label="Shipping" value={fCurrency(shipping || 0, { currency: currencyCode })} />
        <Divider sx={{ borderStyle: 'dashed' }} />
        <Row
          label="Total (incl. VAT)"
          value={fCurrency(totalAmount || 0, { currency: currencyCode })}
          sx={{ typography: 'h6', color: 'primary.main' }}
        />
        {vatDetails?.vatRatePercent === 15 && (
          <Typography variant="caption" color="success.main">
            ✅ ZATCA Compliant (Saudi VAT)
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

function Row({ label, value, sx }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={sx}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
