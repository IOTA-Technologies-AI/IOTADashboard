import { sumBy } from 'es-toolkit';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { inputBaseClasses } from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';

import { calculateVAT, computeDocumentTotals } from 'src/utils/vat-calculator';
import { hasArabicText, hasEnglishText } from 'src/utils/invoice-lines';
import { getVatConfigs, suggestInvoiceLineTranslations } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

export const defaultItem = {
  title: '',
  // Arabic title / description — printed under the English text on the
  // bilingual invoice. The Arabic title is mandatory; the Arabic description
  // is mandatory whenever an English description is given.
  titleAr: '',
  description: '',
  descriptionAr: '',
  service: '',
  price: 0.0,
  quantity: 1,
  total: 0,
};

// The four text fields of a line, as English / Arabic pairs.
const LINE_TEXT_PAIRS = [
  ['title', 'titleAr'],
  ['description', 'descriptionAr'],
];
const LINE_TEXT_FIELDS = LINE_TEXT_PAIRS.flat();

const trimmed = (value) => String(value || '').trim();

// True when one language of a pair is written and the other is still empty —
// the case an AI suggestion can fill without touching anything typed.
const hasMissingTranslation = (line) =>
  LINE_TEXT_PAIRS.some(([en, ar]) => {
    const english = trimmed(line?.[en]);
    const arabic = trimmed(line?.[ar]);
    return (hasEnglishText(english) && !arabic) || (hasArabicText(arabic) && !english);
  });

const SUGGESTION_HINT = 'AI suggestion — review and edit before saving';

const getFieldNames = (index) => ({
  title: `items[${index}].title`,
  titleAr: `items[${index}].titleAr`,
  description: `items[${index}].description`,
  descriptionAr: `items[${index}].descriptionAr`,
  service: `items[${index}].service`,
  quantity: `items[${index}].quantity`,
  price: `items[${index}].price`,
  total: `items[${index}].total`,
});

export function InvoiceCreateEditDetails() {
  const { control, setValue, getValues, watch } = useFormContext();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // ── AI suggestions for the second language ────────────────────────────────
  // Every line must be in English and Arabic. Staff type one language and the
  // other is proposed straight into the form field, where it stays editable;
  // nothing is saved until the invoice is. `suggested` remembers what was
  // proposed (per line id, per field) so the field can say it is unreviewed.
  const [suggested, setSuggested] = useState({});
  const [busyLines, setBusyLines] = useState({});
  const busyRef = useRef({});
  // Line ids by position, readable from the async callback below.
  const fieldIdsRef = useRef([]);
  fieldIdsRef.current = fields.map((field) => field.id);

  const suggestLines = useCallback(
    async (indexes, { replaceArabic = false, silent = false } = {}) => {
      const sent = getValues('items') || [];
      const targets = indexes.filter(
        (index) =>
          sent[index] &&
          !busyRef.current[index] &&
          (replaceArabic || hasMissingTranslation(sent[index]))
      );
      if (!targets.length) {
        if (!silent) toast.info('Every line already has both languages.');
        return;
      }

      const markBusy = (value) => {
        targets.forEach((index) => {
          busyRef.current[index] = value;
        });
        setBusyLines({ ...busyRef.current });
      };

      markBusy(true);
      try {
        const res = await suggestInvoiceLineTranslations(
          targets.map((index) =>
            Object.fromEntries(
              LINE_TEXT_FIELDS.map((field) => [field, trimmed(sent[index][field])])
            )
          ),
          { replaceArabic }
        );

        const latest = getValues('items') || [];
        const proposals = {};
        targets.forEach((index, position) => {
          const proposal = res?.lines?.[position];
          const lineId = fieldIdsRef.current[index];
          if (!proposal || !lineId) return;
          LINE_TEXT_FIELDS.forEach((field) => {
            const text = trimmed(proposal[field]);
            const before = trimmed(sent[index][field]);
            const now = trimmed(latest[index]?.[field]);
            // Nothing new, or the person typed here while we were waiting.
            if (!text || text === now || now !== before) return;
            setValue(`items[${index}].${field}`, text, { shouldDirty: true, shouldValidate: true });
            proposals[lineId] = { ...proposals[lineId], [field]: text };
          });
        });
        if (Object.keys(proposals).length) {
          setSuggested((prev) => {
            const next = { ...prev };
            Object.entries(proposals).forEach(([lineId, byField]) => {
              next[lineId] = { ...next[lineId], ...byField };
            });
            return next;
          });
        } else if (!silent) {
          toast.info('Nothing new to suggest. If the English text is empty, write it first.');
        }
      } catch (err) {
        console.error('[InvoiceCreateEditDetails] Suggestion failed:', err);
        if (!silent) {
          toast.error(
            err?.response?.data?.message || 'Could not get a suggestion. Type the text yourself.'
          );
        }
      } finally {
        markBusy(false);
      }
    },
    [getValues, setValue]
  );

  const anyLineBusy = Object.values(busyLines).some(Boolean);

  // Load VAT configs from DB once
  const [vatConfigs, setVatConfigs] = useState([]);
  useEffect(() => {
    getVatConfigs()
      .then(setVatConfigs)
      .catch(() => setVatConfigs([]));
  }, []);

  // Watch values that change
  const items = watch('items');
  const discount = watch('discount') || 0;
  const shipping = watch('shipping') || 0;
  const invoiceFrom = watch('invoiceFrom'); // VAT driven by IOTA billing office
  const invoiceTypeName = watch('invoiceTypeName') || '';

  // VAT is based on the IOTA office issuing the invoice, not the customer
  const officeCountryCode = invoiceFrom?.country || 'KSA';
  const currency = invoiceFrom?.currency || 'SAR';

  // Calculate subtotal
  const subtotal = sumBy(items || [], (item) => (item.quantity || 0) * (item.price || 0));

  // The office's rate and label, from DB-loaded configs (hardcoded rates until they load)
  const { vatRatePercent, vatLabel } = calculateVAT(0, officeCountryCode, vatConfigs);

  // VAT on the items less the discount plus shipping, rounded; see computeDocumentTotals
  const totals = computeDocumentTotals({
    subtotal: subtotal || 0,
    discount,
    shipping,
    ratePercent: vatRatePercent,
  });
  const vatDetails = { vatLabel, vatRatePercent, vatAmount: totals.vatAmount };
  const totalAmount = totals.total;

  // Extract primitive values BEFORE useEffect
  const baseAmountValue = totals.subtotal;
  const vatAmountValue = totals.vatAmount;
  const vatRatePercentValue = vatRatePercent || 0;

  useEffect(() => {
    setValue('subtotal', parseFloat(baseAmountValue.toFixed(2)));
    setValue('vatAmount', parseFloat(vatAmountValue.toFixed(2)));
    setValue('vatRate', parseFloat(vatRatePercentValue.toFixed(2)));
    setValue('totalAmount', parseFloat(totalAmount.toFixed(2)));
  }, [setValue, baseAmountValue, vatAmountValue, vatRatePercentValue, totalAmount]);

  // Auto-fill service field on all existing line items when invoice type changes
  useEffect(() => {
    if (!invoiceTypeName) return;
    (items || []).forEach((_, idx) => {
      setValue(`items[${idx}].service`, invoiceTypeName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceTypeName]);

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
            currency={currency}
            suggested={suggested[item.id]}
            suggesting={!!busyLines[index]}
            // Leaving a field proposes the missing language, quietly
            onAutoSuggest={() => suggestLines([index], { silent: true })}
            // The button re-proposes the Arabic from the current English
            onSuggestArabic={() => suggestLines([index], { replaceArabic: true })}
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
          onClick={() => append({ ...defaultItem, service: invoiceTypeName })}
          sx={{ flexShrink: 0 }}
        >
          Add item
        </Button>

        <Tooltip title="Fills every empty Arabic or English field from its counterpart. Text already written is left alone.">
          <span>
            <Button
              size="small"
              color="inherit"
              disabled={anyLineBusy}
              startIcon={
                anyLineBusy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:magic-stick-3-bold" />
                )
              }
              onClick={() => suggestLines(fields.map((_, index) => index))}
              sx={{ flexShrink: 0 }}
            >
              Fill missing translations
            </Button>
          </span>
        </Tooltip>

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
        vatDetails={vatDetails}
        shipping={totals.shipping}
        subtotal={totals.subtotal}
        discount={totals.discount}
        taxableAmount={totals.taxableAmount}
        totalAmount={totalAmount || 0}
        currencyCode={currency}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function InvoiceItem({
  onRemoveItem,
  fieldNames,
  currency,
  suggested,
  suggesting = false,
  onAutoSuggest,
  onSuggestArabic,
}) {
  const { watch } = useFormContext();
  const quantity = watch(fieldNames.quantity);
  const price = watch(fieldNames.price);

  // A field still holding exactly what the AI proposed has not been reviewed
  // by a person yet; the hint goes away as soon as it is edited.
  const [title, titleAr, description, descriptionAr] = watch([
    fieldNames.title,
    fieldNames.titleAr,
    fieldNames.description,
    fieldNames.descriptionAr,
  ]);
  const current = { title, titleAr, description, descriptionAr };
  const hintFor = (field) =>
    suggested?.[field] && trimmed(current[field]) === suggested[field]
      ? SUGGESTION_HINT
      : undefined;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: 1 }}>
        <Field.Text
          required
          name={fieldNames.title}
          label="Title (English)"
          helperText={hintFor('title')}
          onBlur={onAutoSuggest}
          InputLabelProps={{ shrink: true }}
        />

        <Field.Text
          required
          name={fieldNames.titleAr}
          label="Title (Arabic)"
          placeholder="عنوان البند بالعربية"
          helperText={hintFor('titleAr')}
          onBlur={onAutoSuggest}
          InputLabelProps={{ shrink: true }}
          inputProps={{ dir: 'rtl' }}
        />

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
          label="Description (English)"
          helperText={hintFor('description')}
          onBlur={onAutoSuggest}
          InputLabelProps={{ shrink: true }}
        />

        <Field.Text
          multiline
          rows={3}
          name={fieldNames.descriptionAr}
          label="Description (Arabic)"
          placeholder="وصف البند بالعربية — مطلوب عند إدخال وصف بالإنجليزية"
          helperText={hintFor('descriptionAr')}
          onBlur={onAutoSuggest}
          InputLabelProps={{ shrink: true }}
          inputProps={{ dir: 'rtl' }}
        />

        <Stack spacing={1} sx={{ flexShrink: 0, alignItems: 'flex-start' }}>
          <Tooltip title="Writes an Arabic suggestion from the English title and description, replacing the Arabic that is there. You can edit it afterwards.">
            <span>
              <Button
                size="small"
                color="primary"
                disabled={suggesting}
                startIcon={
                  suggesting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:magic-stick-3-bold" />
                  )
                }
                onClick={onSuggestArabic}
              >
                Suggest Arabic
              </Button>
            </span>
          </Tooltip>

          <Button
            size="small"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={onRemoveItem}
          >
            Remove
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
