import { useEffect } from 'react';
import { sumBy } from 'es-toolkit';
import { useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { inputBaseClasses } from '@mui/material/InputBase';

// VAT calculator import
import { calculateVAT } from 'src/utils/vat-calculator';

import { INVOICE_SERVICE_OPTIONS } from 'src/_mock';

import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

export const defaultItem = {
  title: '',
  description: '',
  service: INVOICE_SERVICE_OPTIONS[0].name,
  price: 0.0,
  quantity: 1,
  total: 0,
};

const getFieldNames = (index) => ({
  title: `items[${index}].title`,
  description: `items[${index}].description`,
  service: `items[${index}].service`,
  quantity: `items[${index}].quantity`,
  price: `items[${index}].price`,
  total: `items[${index}].total`,
});

export function InvoiceCreateEditDetails() {
  const { control, setValue, watch } = useFormContext();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Watch values that change
  const items = watch('items');
  const discount = watch('discount') || 0;
  const shipping = watch('shipping') || 0;
  const invoiceTo = watch('invoiceTo'); // ✅ ADD THIS

  // ✅ Get currency and country from selected customer
  const currency = invoiceTo?.currency || 'SAR';
  // Convert country code to full name for VAT calculator
  const country =
    invoiceTo?.country === 'KSA'
      ? 'Saudi Arabia'
      : invoiceTo?.country === 'ARE'
        ? 'UAE'
        : invoiceTo?.country || 'Saudi Arabia';

  // Calculate subtotal
  const subtotal = sumBy(items || [], (item) => (item.quantity || 0) * (item.price || 0));

  // ✅ Use VAT calculator with customer's currency and country
  const vatDetails = calculateVAT(subtotal || 0, currency, country);

  // Calculate total after discount and shipping
  const totalAmount = vatDetails.totalWithVAT - discount - shipping;

  // ✅ Extract primitive values BEFORE useEffect
  const baseAmountValue = vatDetails?.baseAmount || 0;
  const vatAmountValue = vatDetails?.vatAmount || 0;
  const vatRatePercentValue = vatDetails?.vatRatePercent || 0;

  useEffect(() => {
    setValue('subtotal', parseFloat(baseAmountValue.toFixed(2)));
    setValue('vatAmount', parseFloat(vatAmountValue.toFixed(2)));
    setValue('vatRate', parseFloat(vatRatePercentValue.toFixed(2)));
    setValue('totalAmount', parseFloat(totalAmount.toFixed(2)));
  }, [setValue, baseAmountValue, vatAmountValue, vatRatePercentValue, totalAmount]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: 'text.disabled', mb: 3 }}>
        Details:
      </Typography>

      <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />} spacing={3}>
        {fields.map((item, index) => (
          <InvoiceItem
            key={item.id}
            fieldNames={getFieldNames(index)}
            onRemoveItem={() => remove(index)}
            currency={currency} // ✅ ADD THIS
          />
        ))}
      </Stack>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          gap: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Button
          size="small"
          color="primary"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => append(defaultItem)}
          sx={{ flexShrink: 0 }}
        >
          Add item
        </Button>

        <Box
          sx={{
            gap: 2,
            width: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <Field.Text
            size="small"
            label="Shipping($)"
            name="shipping"
            type="number"
            sx={{ maxWidth: { md: 120 } }}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Field.Text
            size="small"
            label="Discount($)"
            name="discount"
            type="number"
            sx={{ maxWidth: { md: 120 } }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {/* Removed manual taxes field - VAT is now automatic */}
        </Box>
      </Box>
      <br />
      <InvoiceTotalSummary
        vatDetails={
          vatDetails || { baseAmount: 0, vatAmount: 0, vatRatePercent: 0, totalWithVAT: 0 }
        }
        shipping={shipping || 0}
        subtotal={vatDetails?.baseAmount || 0}
        discount={discount || 0}
        totalAmount={totalAmount || 0}
        currencyCode={currency}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function InvoiceItem({ onRemoveItem, fieldNames, currency }) {
  const { watch } = useFormContext();
  const quantity = watch(fieldNames.quantity);
  const price = watch(fieldNames.price);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: 1 }}>
        <Field.Text name={fieldNames.title} label="Title" InputLabelProps={{ shrink: true }} />

        <Field.Select
          name={fieldNames.service}
          label="Service type"
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: { md: 160 } }}
        >
          {INVOICE_SERVICE_OPTIONS.map((service) => (
            <MenuItem key={service.name} value={service.name}>
              {service.name}
            </MenuItem>
          ))}
        </Field.Select>

        <Field.Text
          name={fieldNames.quantity}
          label="Quantity"
          type="number"
          placeholder="0"
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: { md: 96 } }}
        />

        <Field.Text
          name={fieldNames.price}
          label="Price"
          placeholder="0.00"
          type="number"
          InputLabelProps={{ shrink: true }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
            },
          }}
          sx={{ maxWidth: { md: 160 } }}
        />

        <Field.Text
          disabled
          name={fieldNames.total}
          label="Total"
          placeholder="0.00"
          value={price * quantity}
          InputLabelProps={{ shrink: true }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
            },
          }}
          sx={{
            maxWidth: { md: 160 },
            [`& .${inputBaseClasses.input}`]: {
              textAlign: { md: 'right' },
            },
          }}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ width: 1 }}>
        <Field.Text
          multiline
          rows={3}
          name={fieldNames.description}
          label="Description"
          InputLabelProps={{ shrink: true }}
        />

        <Button
          size="small"
          color="error"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          onClick={onRemoveItem}
          sx={{ flexShrink: 0 }}
        >
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}
