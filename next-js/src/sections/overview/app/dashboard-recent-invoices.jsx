import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const STATUS_COLOR = {
  paid: 'success',
  approved: 'info',
  sent: 'info',
  pending: 'warning',
  draft: 'default',
  rejected: 'error',
  overdue: 'error',
};

/** The latest invoices, each linking to its page. Amounts in their own currency. */
export function DashboardRecentInvoices({ invoices = [], sx }) {
  return (
    <Card sx={sx}>
      <CardHeader title="Recent invoices" sx={{ mb: 2 }} />
      <Scrollbar sx={{ minHeight: 280 }}>
        {invoices.length ? (
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.invoiceId || inv.invoiceNumber}
                  hover
                  component={RouterLink}
                  href={paths.dashboard.invoice.details(inv.invoiceId)}
                  sx={{ textDecoration: 'none' }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{inv.invoiceNumber || '—'}</TableCell>
                  <TableCell>{inv.customerName || '—'}</TableCell>
                  <TableCell>{inv.invoiceDate ? fDate(inv.invoiceDate) : '—'}</TableCell>
                  <TableCell align="right">
                    {fCurrency(inv.total, { currency: inv.currencyCode || 'SAR' })}
                  </TableCell>
                  <TableCell>
                    <Label
                      variant="soft"
                      color={STATUS_COLOR[String(inv.status).toLowerCase()] || 'default'}
                    >
                      {inv.status || '—'}
                    </Label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
            No invoices yet.
          </Typography>
        )}
      </Scrollbar>
      <Button
        component={RouterLink}
        href={paths.dashboard.invoice.root}
        size="small"
        color="inherit"
        endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
        sx={{ m: 2, float: 'right' }}
      >
        All invoices
      </Button>
    </Card>
  );
}
