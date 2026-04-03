import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import { InvoiceToolbar } from './invoice-toolbar';
import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

export function InvoiceDetails({ invoice }) {
  const [currentStatus, setCurrentStatus] = useState(invoice?.status || 'draft');

  const handleChangeStatus = useCallback((event) => {
    setCurrentStatus(event.target.value);
  }, []);

  const renderFooter = () => (
    <Box
      sx={{
        py: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          NOTES
        </Typography>
        <Typography variant="body2">
          We appreciate your business. Should you need us to add VAT or extra notes let us know!
        </Typography>
      </div>

      <Box sx={{ flexGrow: { md: 1 }, textAlign: { md: 'right' } }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Have a question?
        </Typography>
        <Typography variant="body2">accounts@iotatechnologies.ai</Typography>
      </Box>
    </Box>
  );

  const renderList = () => (
    <Scrollbar sx={{ mt: 5 }}>
      <Table sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell sx={{ typography: 'subtitle2' }}>Description</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {invoice?.items.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>

              <TableCell>
                <Box sx={{ maxWidth: 560 }}>
                  <Typography variant="subtitle2">{row.title}</Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                    {row.description}
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>{row.quantity}</TableCell>
              <TableCell align="right">
                {fCurrency(row.price, { currency: invoice?.currencyCode })}
              </TableCell>
              <TableCell align="right">
                {fCurrency(row.price * row.quantity, { currency: invoice?.currencyCode })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );

  return (
    <>
      <InvoiceToolbar invoice={invoice} currentStatus={currentStatus || ''} />

      <Card sx={{ pt: 5, px: 5 }}>
        <Box
          sx={{
            rowGap: 5,
            display: 'grid',
            alignItems: 'flex-start',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Box
            component="img"
            alt="Invoice logo"
            src="/logo/logo-single.png"
            sx={{ width: 100, height: 'auto' }}
          />

          <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Label
              variant="soft"
              color={
                (currentStatus === 'paid' && 'success') ||
                (currentStatus === 'pending' && 'warning') ||
                (currentStatus === 'overdue' && 'error') ||
                'default'
              }
            >
              {currentStatus}
            </Label>

            <Typography variant="h6">{invoice?.invoiceNumber}</Typography>
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice from
            </Typography>
            {invoice?.invoiceFrom.name}
            <br />
            {invoice?.invoiceFrom.fullAddress + ', '}
            <br />
            {invoice?.invoiceFrom.district + ', '}
            {invoice?.invoiceFrom.city + ','}
            <br />
            {invoice?.invoiceFrom.country + ' - ' + invoice?.invoiceFrom.postalCode}
            <br />
            <br />
            Phone: {invoice?.invoiceFrom.phoneNumber}
            <br />
            Email: {invoice?.invoiceFrom.email}
            <br />
            VAT Number: {invoice?.invoiceFrom.vatNumber}
            <br />
            Registration: {invoice?.invoiceFrom.registrationNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice to
            </Typography>
            {invoice?.invoiceTo.name}
            <br />
            {invoice?.invoiceTo.fullAddress}
            <br />
            Phone: {invoice?.invoiceTo.phoneNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Date create
            </Typography>
            {fDate(invoice?.createDate)}
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Due date
            </Typography>
            {fDate(invoice?.dueDate)}
          </Stack>
        </Box>

        {renderList()}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <InvoiceTotalSummary
          vatDetails={{
            baseAmount: invoice?.subtotal || 0,
            vatAmount: invoice?.vatAmount || 0,
            vatRatePercent: invoice?.vatRate || 0,
            totalWithVAT: invoice?.totalAmount || 0,
          }}
          subtotal={invoice?.subtotal || 0}
          discount={invoice?.discount || 0}
          shipping={invoice?.shipping || 0}
          totalAmount={invoice?.totalAmount || 0}
          currencyCode={invoice?.currencyCode}
        />

        <Divider sx={{ mt: 5, borderStyle: 'dashed' }} />

        {renderFooter()}
      </Card>
    </>
  );
}
