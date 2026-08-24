'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { ProformaToolbar } from '../proforma-toolbar';
import { ProformaSupplierDialog } from '../proforma-supplier-dialog';
import { ProformaApprovalDialog } from '../proforma-approval-dialog';

// ----------------------------------------------------------------------

const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

// Line items are stored as the same JSON array the invoice keeps in its
// description column; anything that is not JSON is a single item's free text.
function parseItems(proforma) {
  const raw = proforma?.description;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return [{ title: '', description: raw, quantity: 1, price: proforma.baseAmount ?? 0 }];
    }
  }
  return [{ title: '', description: '', quantity: 1, price: proforma?.baseAmount ?? 0 }];
}

export function ProformaDetailsView({ proforma: initialProforma, onRefresh }) {
  const { user } = useAuthContext();
  const [proforma, setProforma] = useState(initialProforma);

  const editDialog = useBoolean();
  const approvalDialog = useBoolean();

  const role = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canApprove = role === 'admin' || role === 'superAdmin';

  const handleUpdated = useCallback(
    (updated) => {
      if (updated) setProforma(updated);
      onRefresh?.();
    },
    [onRefresh]
  );

  if (!proforma) return null;

  const currency = proforma.currencyCode || 'SAR';
  const items = parseItems(proforma);
  const discount = Math.abs(Number(proforma.adjustment ?? 0)) || 0;
  const shipping = Number(proforma.shippingCharge ?? 0) || 0;

  const detail = (label, value) => (
    <Stack direction="row" justifyContent="space-between" sx={{ typography: 'body2' }}>
      <Box sx={{ color: 'text.secondary' }}>{label}</Box>
      <Box sx={{ textAlign: 'right' }}>{value || '—'}</Box>
    </Stack>
  );

  const totalLine = (label, value, strong = false) => (
    <Stack
      direction="row"
      justifyContent="flex-end"
      sx={{ typography: strong ? 'subtitle1' : 'body2' }}
    >
      <Box sx={{ color: strong ? 'text.primary' : 'text.secondary', width: 160 }}>{label}</Box>
      <Box sx={{ width: 140, textAlign: 'right' }}>{value}</Box>
    </Stack>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={proforma.proformaNumber}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Proforma Invoice', href: paths.dashboard.proformaInvoice.root },
          { name: proforma.proformaNumber },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ProformaToolbar
        proforma={proforma}
        canApprove={canApprove}
        onOpenEdit={editDialog.onTrue}
        onOpenApproval={approvalDialog.onTrue}
        onRefresh={onRefresh}
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            mb: 5,
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Document
            </Typography>
            {detail('Document ID', proforma.documentId)}
            {detail('Issued', fDate(proforma.issueDate))}
            {detail('Valid until', fDate(proforma.validUntil))}
            {detail('Source invoice', proforma.invoiceNumber)}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Customer (ship to)
            </Typography>
            {detail('Name', proforma.customerName)}
            {detail('Attention', proforma.customerAttention)}
            {detail('Customer ID', proforma.customerRefId)}
            <Box sx={{ typography: 'body2', color: 'text.secondary', whiteSpace: 'pre-line' }}>
              {proforma.customerAddress}
            </Box>
          </Stack>

          {/* The supplier is the one field a human must supply — the rest is
              snapshotted from the invoice — so its absence is stated plainly. */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Supplier (dispatch to)
            </Typography>
            {proforma.supplierName ? (
              <>
                {detail('Name', proforma.supplierName)}
                {detail('Contact', proforma.supplierContactName)}
                {detail('Email', proforma.supplierEmail)}
              </>
            ) : (
              <Typography variant="body2" sx={{ color: 'warning.main' }}>
                No supplier tagged yet. Use the edit action above to pick one before dispatching.
              </Typography>
            )}
          </Stack>
        </Box>

        {!!proforma.specialInstructions && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Special instructions
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}>
              {proforma.specialInstructions}
            </Typography>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Line items
        </Typography>

        <Scrollbar sx={{ mb: 3 }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => {
                const qty = Number(item.quantity ?? 1) || 1;
                const price = Number(item.price ?? 0) || 0;
                return (
                  <TableRow key={index}>
                    <TableCell>
                      {!!item.title && (
                        <Typography variant="subtitle2">{item.title}</Typography>
                      )}
                      {!!item.description && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}
                        >
                          {item.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{qty}</TableCell>
                    <TableCell align="right">
                      {fCurrency(price, { currencyCode: currency })}
                    </TableCell>
                    <TableCell align="right">
                      {fCurrency(qty * price, { currencyCode: currency })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Scrollbar>

        <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />

        <Stack spacing={1}>
          {totalLine('Subtotal', fCurrency(proforma.baseAmount, { currencyCode: currency }))}
          {discount > 0 &&
            totalLine('Discount', `-${fCurrency(discount, { currencyCode: currency })}`)}
          {shipping > 0 && totalLine('Shipping', fCurrency(shipping, { currencyCode: currency }))}
          {totalLine(
            proforma.vatRate ? `VAT (${proforma.vatRate}%)` : 'VAT',
            fCurrency(proforma.vatAmount, { currencyCode: currency })
          )}
          {totalLine('Total', fCurrency(proforma.total, { currencyCode: currency }), true)}
        </Stack>
      </Card>

      <ProformaSupplierDialog
        open={editDialog.value}
        onClose={editDialog.onFalse}
        proforma={proforma}
        onSaved={handleUpdated}
      />

      <ProformaApprovalDialog
        open={approvalDialog.value}
        onClose={approvalDialog.onFalse}
        proforma={proforma}
        onComplete={handleUpdated}
      />
    </DashboardContent>
  );
}
