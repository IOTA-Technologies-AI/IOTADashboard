'use client';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { updateProformaInvoice } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

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

const emptyItem = { title: '', description: '', quantity: 1, price: 0 };

// A price left blank is not the same as a price of zero: blank means "this
// item carries no price on the document", which is what the pricing-free
// variant of the proforma is for. Blank contributes nothing to the subtotal.
const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function ProformaEditView({ proforma: initialProforma }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState(initialProforma?.customerName || '');
  const [customerAttention, setCustomerAttention] = useState(
    initialProforma?.customerAttention || ''
  );
  const [customerAddress, setCustomerAddress] = useState(initialProforma?.customerAddress || '');
  const [preparedForName, setPreparedForName] = useState(initialProforma?.preparedForName || '');
  const [preparedForCompany, setPreparedForCompany] = useState(
    initialProforma?.preparedForCompany || ''
  );

  const [items, setItems] = useState(() =>
    parseItems(initialProforma).map((item) => ({
      title: item.title || '',
      description: item.description || '',
      quantity: item.quantity ?? 1,
      price: item.price ?? '',
    }))
  );

  const [hidePricing, setHidePricing] = useState(Boolean(initialProforma?.hidePricing));
  const [discount, setDiscount] = useState(
    Math.abs(Number(initialProforma?.adjustment ?? 0)) || ''
  );
  const [shipping, setShipping] = useState(Number(initialProforma?.shippingCharge ?? 0) || '');
  const [vatRate, setVatRate] = useState(Number(initialProforma?.vatRate ?? 0) || '');
  const [specialInstructions, setSpecialInstructions] = useState(
    initialProforma?.specialInstructions || ''
  );

  const currency = initialProforma?.currencyCode || 'SAR';

  // Totals are recomputed here rather than trusted from the record, so what is
  // saved always agrees with the rows above it.
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const price = toNumberOrNull(item.price);
      if (price === null) return sum;
      const qty = Number(item.quantity) || 0;
      return sum + qty * price;
    }, 0);
    const discountValue = Math.abs(toNumberOrNull(discount) ?? 0);
    const shippingValue = toNumberOrNull(shipping) ?? 0;
    const rate = toNumberOrNull(vatRate) ?? 0;
    const net = subtotal - discountValue + shippingValue;
    const vat = +((net * rate) / 100).toFixed(2);
    return { subtotal, discountValue, shippingValue, rate, vat, total: +(net + vat).toFixed(2) };
  }, [items, discount, shipping, vatRate]);

  const updateItem = useCallback((index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const addItem = useCallback(() => setItems((prev) => [...prev, { ...emptyItem }]), []);

  const removeItem = useCallback(
    (index) => setItems((prev) => prev.filter((_, i) => i !== index)),
    []
  );

  const handleSave = async () => {
    try {
      setSaving(true);

      // Prices are persisted as null when blank so the print page can tell a
      // deliberately unpriced line from a genuine zero.
      const payloadItems = items
        .filter((item) => item.title.trim() || item.description.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          quantity: Number(item.quantity) || 1,
          price: toNumberOrNull(item.price),
        }));

      await updateProformaInvoice(initialProforma.proformaId, {
        customerName: customerName.trim() || null,
        customerAttention: customerAttention.trim() || null,
        customerAddress: customerAddress.trim() || null,
        preparedForName: preparedForName.trim() || null,
        preparedForCompany: preparedForCompany.trim() || null,
        description: JSON.stringify(payloadItems),
        hidePricing,
        baseAmount: totals.subtotal,
        adjustment: totals.discountValue,
        shippingCharge: totals.shippingValue,
        vatRate: totals.rate,
        vatAmount: totals.vat,
        total: totals.total,
        specialInstructions: specialInstructions.trim() || null,
      });

      toast.success('Proforma invoice updated.');
      router.push(paths.dashboard.proformaInvoice.details(initialProforma.proformaId));
    } catch {
      toast.error('Failed to save the proforma. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!initialProforma) return null;

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
        heading={`Edit ${initialProforma.proformaNumber}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Proforma Invoice', href: paths.dashboard.proformaInvoice.root },
          {
            name: initialProforma.proformaNumber,
            href: paths.dashboard.proformaInvoice.details(initialProforma.proformaId),
          },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* ── Addressee ──────────────────────────────────────────────────── */}
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Addressee
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Who this proforma is addressed to inside the customer organisation. This is printed
            in the CUSTOMER block on page 2 and as “Prepared For” on the cover.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            <TextField
              fullWidth
              label="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Kind Attn."
              placeholder="e.g. Nadia Al-Rasheed, Head of Digital Operations"
              value={customerAttention}
              onChange={(e) => setCustomerAttention(e.target.value)}
            />
            <TextField
              fullWidth
              label="Prepared for (name)"
              value={preparedForName}
              onChange={(e) => setPreparedForName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Prepared for (company)"
              value={preparedForCompany}
              onChange={(e) => setPreparedForCompany(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Customer address"
              helperText="One line per address line — printed as-is."
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
          </Box>
        </Card>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={2}
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">Line items</Typography>

            <Tooltip title="Print the items and quantities only, with no prices or totals on the document">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hidePricing}
                    onChange={(e) => setHidePricing(e.target.checked)}
                  />
                }
                label="Send as an order, without pricing"
              />
            </Tooltip>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {hidePricing
              ? 'Pricing is withheld: the document will print the description and quantity columns only. Prices entered below are still saved, so the commercials can be restored later.'
              : 'Leave a price blank to carry that item on the document without a price. Blank lines contribute nothing to the subtotal.'}
          </Typography>

          <Stack spacing={3}>
            {items.map((item, index) => (
              <Box key={index}>
                {index > 0 && <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />}

                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <TextField
                      fullWidth
                      label="Item"
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                    />
                    <Tooltip title="Remove this item">
                      <span>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          sx={{ mt: 1 }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>

                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    }}
                  >
                    <TextField
                      type="number"
                      label="Quantity"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                    <TextField
                      type="number"
                      label="Unit price"
                      placeholder="Leave blank for no price"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">{currency}</InputAdornment>
                          ),
                        },
                      }}
                    />
                    <TextField
                      disabled
                      label="Amount"
                      value={
                        toNumberOrNull(item.price) === null
                          ? '—'
                          : fCurrency(
                              (Number(item.quantity) || 0) * toNumberOrNull(item.price),
                              { currencyCode: currency }
                            )
                      }
                    />
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>

          <Button
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={addItem}
            sx={{ mt: 3 }}
          >
            Add item
          </Button>
        </Card>

        {/* ── Commercials ────────────────────────────────────────────────── */}
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Commercials
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Apply a discount agreed after the source invoice was raised. Totals recalculate as you
            type.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              mb: 4,
            }}
          >
            <TextField
              type="number"
              label="Discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                },
              }}
            />
            <TextField
              type="number"
              label="Shipping"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                },
              }}
            />
            <TextField
              type="number"
              label="VAT rate"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              }}
            />
          </Box>

          <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />

          <Stack spacing={1}>
            {totalLine('Subtotal', fCurrency(totals.subtotal, { currencyCode: currency }))}
            {totals.discountValue > 0 &&
              totalLine('Discount', `-${fCurrency(totals.discountValue, { currencyCode: currency })}`)}
            {totals.shippingValue > 0 &&
              totalLine('Shipping', fCurrency(totals.shippingValue, { currencyCode: currency }))}
            {totalLine(
              totals.rate > 0 ? `VAT @ ${totals.rate}%` : 'VAT',
              fCurrency(totals.vat, { currencyCode: currency })
            )}
            {totalLine('Total', fCurrency(totals.total, { currencyCode: currency }), true)}
          </Stack>

          {hidePricing && (
            <Typography variant="caption" sx={{ color: 'warning.main', mt: 2, display: 'block' }}>
              These totals are saved on the record but will not appear on the printed document
              while “Send as an order, without pricing” is ticked.
            </Typography>
          )}
        </Card>

        {/* ── Special instructions ───────────────────────────────────────── */}
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Special instructions
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={5}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            helperText="Printed beside the CUSTOMER block on page 2. One line per instruction."
          />
        </Card>

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button
            color="inherit"
            variant="outlined"
            size="large"
            onClick={() =>
              router.push(paths.dashboard.proformaInvoice.details(initialProforma.proformaId))
            }
          >
            Cancel
          </Button>
          <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
