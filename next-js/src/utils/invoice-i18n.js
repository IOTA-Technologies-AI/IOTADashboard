// ─────────────────────────────────────────────────────────────────────────────
// Bilingual (English / Arabic) invoice labels + amount-in-words.
//
// Single source of truth for every word printed on an invoice. Three renderers
// consume it:
//   1. src/sections/invoice/invoice-pdf.jsx        — the PDF emailed on "Issue"
//   2. src/app/invoice-print/[id]/page.jsx         — Print / Save as PDF
//   3. public/assets/template/IOTA Invoice Template.html — the print layout
//      (Arabic labels are baked into the HTML as static text; if a label below
//      changes, change it in the template too — and in the IOTADocuments copy
//      of the same template, which must stay byte-identical.)
//
// Arabic wording follows the ZATCA-style bilingual tax invoices supplied by
// Finance (MASAR / Starlink samples).
// ─────────────────────────────────────────────────────────────────────────────

export const INVOICE_LABELS = {
  // Header — logo and company name on the left, invoice title centred.
  // `companyName` is the legal entity; the Arabic form is overridden by the
  // office config's nameAr when one is set.
  companyName: { en: 'IOTA Technologies Company', ar: 'شركة آي أو تي إيه تيكنالوجيز' },
  invoiceTitle: { en: 'Tax Invoice', ar: 'فاتورة ضريبية' },

  // Seller identity block (header, under the company name)
  phone: { en: 'Tel', ar: 'هاتف' },
  crNumber: { en: 'CR #', ar: 'رقم السجل التجاري' },

  // Billing block
  billTo: { en: 'Bill To', ar: 'تفاصيل العميل' },
  sellerVatNumber: { en: 'VAT Registration #', ar: 'الرقم الضريبي للمورد' },
  buyerVatNumber: { en: 'VAT #', ar: 'الرقم الضريبي للعميل' },
  invoiceNumber: { en: 'Invoice #', ar: 'رقم الفاتورة' },
  invoiceDate: { en: 'Invoice Date', ar: 'تاريخ إصدار الفاتورة' },
  // ZATCA requires the date of supply whenever it differs from the issue date;
  // invoices with no stored supply date fall back to the issue date.
  supplyDate: { en: 'Supply Date', ar: 'تاريخ التوريد' },
  // The Hijri row carries the date itself in both scripts, so its only label is
  // the short "Hijri" prefix on the English side.
  invoiceDateHijri: { en: 'Hijri', ar: 'هجري' },
  paymentTerms: { en: 'Payment Terms', ar: 'شروط الدفع' },
  poNumber: { en: 'PO / Reference #', ar: 'رقم أمر الشراء / المرجع' },
  dueDate: { en: 'Due Date', ar: 'تاريخ استحقاق الدفعة' },

  // Items table
  description: { en: 'Description', ar: 'وصف السلعة أو الخدمة' },
  quantity: { en: 'Qty', ar: 'الكمية' },
  unitPrice: { en: 'Unit Price', ar: 'سعر الوحدة' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  subtotal: { en: 'Total (Excluding VAT)', ar: 'الإجمالي غير شامل الضريبة' },
  discount: { en: 'Discount', ar: 'الخصم' },
  shipping: { en: 'Shipping', ar: 'الشحن' },
  vat: { en: 'VAT', ar: 'ضريبة القيمة المضافة' },
  vatRate: { en: 'VAT', ar: 'نسبة الضريبة' }, // suffixed with " @ 15%" / " 15%"
  totalAmount: { en: 'Total Amount', ar: 'المبلغ الإجمالي المستحق' },
  amountInWords: { en: 'Amount in words', ar: 'المبلغ بالكلمات' },

  // Footer — bank
  bankDetails: { en: 'Bank Transfer Details', ar: 'تفاصيل التحويل البنكي' },
  accountName: { en: 'A/c Name', ar: 'اسم الحساب' },
  iban: { en: 'IBAN', ar: 'رقم الآيبان' },
  bankName: { en: 'Bank', ar: 'اسم البنك' },
  bankCity: { en: 'City', ar: 'المدينة' },
  // The account name and IBAN are deliberately printed in Latin script only —
  // they must match the record the bank holds, so they are never translated.

  // Footer — queries
  queries: { en: 'In Case of Queries', ar: 'للاستفسارات' },
  writeToUs: { en: 'Write to us at', ar: 'راسلنا على' },
  citeInvoice: {
    en: 'Cite our Invoice # for reference and better tracking.',
    ar: 'يرجى ذكر رقم الفاتورة عند المراسلة لسهولة المتابعة.',
  },

  // QR blocks
  viewOnlineQr: { en: 'Scan to view invoice online', ar: 'امسح الرمز لعرض الفاتورة إلكترونياً' },
  zatcaQr: { en: 'ZATCA e-Invoice QR', ar: 'رمز الفاتورة الإلكترونية — هيئة الزكاة والضريبة والجمارك' },
};

/**
 * The invoice date on the Umm al-Qura calendar — the civil calendar of Saudi
 * Arabia, printed beside the Gregorian date on the Finance samples. Returns the
 * date in both scripts ("Rabiʻ I 9, 1448 AH" / "9 ربيع الأول 1448 هـ"), or null
 * when the date is missing or unparseable so callers can skip the row.
 * Month names are spelled out: a numeric Hijri date is easily misread as
 * day/month in the wrong order.
 */
export function hijriDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  try {
    return {
      en: new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', opts).format(d),
      ar: new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', opts).format(d),
    };
  } catch {
    return null;
  }
}

/**
 * Payment terms read off the invoice's own dates — "Net 30 days" / "صافي 30
 * يوماً" — so no extra field has to be captured. Returns null when the two
 * dates are missing or identical (nothing meaningful to state).
 */
export function paymentTermsLabel(invoiceDate, dueDate) {
  if (!invoiceDate || !dueDate) return null;
  const from = new Date(invoiceDate);
  const to = new Date(dueDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const days = Math.round((to - from) / 86400000);
  if (days <= 0) return null;
  return { en: `Net ${days} days`, ar: `صافي ${days} يوماً` };
}

/** `VAT @ 15%` / `نسبة الضريبة 15%` — built from the invoice's stored rate. */
export function vatRateLabel(rate) {
  if (!rate) return { en: INVOICE_LABELS.vat.en, ar: INVOICE_LABELS.vat.ar };
  return {
    en: `${INVOICE_LABELS.vatRate.en} @ ${rate}%`,
    ar: `${INVOICE_LABELS.vatRate.ar} ${rate}%`,
  };
}

// ── Currency names ────────────────────────────────────────────────────────────
// Arabic nouns change form with the number that counts them, so each currency
// carries all four: 1 → singular, 2 → dual, 3–10 → plural, 11–99 → accusative
// singular (the form the Finance sample uses: "… ثمانية و عشرون ريالاً سعودياً").

const arForms = (singular, dual, plural, accusative) => ({
  singular,
  dual,
  plural,
  accusative,
});

export const CURRENCY_NAMES = {
  SAR: {
    en: 'Saudi Riyals',
    enFraction: 'Fils',
    ar: arForms('ريال سعودي', 'ريالان سعوديان', 'ريالات سعودية', 'ريالاً سعودياً'),
    arFraction: arForms('هللة', 'هللتان', 'هللات', 'هللة'),
  },
  AED: {
    en: 'UAE Dirhams',
    enFraction: 'Fils',
    ar: arForms('درهم إماراتي', 'درهمان إماراتيان', 'دراهم إماراتية', 'درهماً إماراتياً'),
    arFraction: arForms('فلس', 'فلسان', 'فلوس', 'فلساً'),
  },
  USD: {
    en: 'US Dollars',
    enFraction: 'Cents',
    ar: arForms('دولار أمريكي', 'دولاران أمريكيان', 'دولارات أمريكية', 'دولاراً أمريكياً'),
    arFraction: arForms('سنت', 'سنتان', 'سنتات', 'سنتاً'),
  },
  EUR: {
    en: 'Euros',
    enFraction: 'Cents',
    ar: arForms('يورو', 'يورو', 'يورو', 'يورو'),
    arFraction: arForms('سنت', 'سنتان', 'سنتات', 'سنتاً'),
  },
  GBP: {
    en: 'British Pounds',
    enFraction: 'Pence',
    ar: arForms('جنيه إسترليني', 'جنيهان إسترلينيان', 'جنيهات إسترلينية', 'جنيهاً إسترلينياً'),
    arFraction: arForms('بنس', 'بنسان', 'بنسات', 'بنساً'),
  },
  INR: {
    en: 'Indian Rupees',
    enFraction: 'Paise',
    ar: arForms('روبية هندية', 'روبيتان هنديتان', 'روبيات هندية', 'روبية هندية'),
    arFraction: arForms('بيسة', 'بيستان', 'بيسات', 'بيسة'),
  },
};

// ── English amount in words ───────────────────────────────────────────────────

const ONES_EN = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS_EN = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

export function toWordsEn(n) {
  if (!n || n === 0) return 'Zero';
  if (n < 20) return ONES_EN[n];
  if (n < 100) return TENS_EN[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES_EN[n % 10] : '');
  if (n < 1000)
    return ONES_EN[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWordsEn(n % 100) : '');
  if (n < 1_000_000)
    return (
      toWordsEn(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWordsEn(n % 1000) : '')
    );
  return (
    toWordsEn(Math.floor(n / 1_000_000)) +
    ' Million' +
    (n % 1_000_000 ? ' ' + toWordsEn(n % 1_000_000) : '')
  );
}

export function amountInWordsEn(amount, currencyCode = 'SAR') {
  if (amount == null || isNaN(amount)) return '';
  const whole = Math.floor(amount);
  const fraction = Math.round((amount - whole) * 100);
  const currency = CURRENCY_NAMES[currencyCode];
  let words = toWordsEn(whole) + ' ' + (currency?.en || currencyCode);
  if (fraction > 0) words += ' and ' + toWordsEn(fraction) + ' ' + (currency?.enFraction || 'Fils');
  return words + ' Only.';
}

// ── Arabic amount in words (تفقيط) ────────────────────────────────────────────
// Masculine forms are used throughout because the counted nouns on an invoice
// (ريال / درهم / دولار) are masculine.

const ONES_AR = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];
const TENS_AR = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];
const HUNDREDS_AR = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

const AR_JOIN = ' و ';

/** 1–999 in Arabic, e.g. 428 → "أربعمائة و ثمانية و عشرون" (units precede tens). */
function arBelowThousand(n) {
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(HUNDREDS_AR[hundreds]);
  if (rest) {
    if (rest < 20) {
      parts.push(ONES_AR[rest]);
    } else {
      const unit = rest % 10;
      const ten = Math.floor(rest / 10);
      // Arabic says the unit before the ten: "ثمانية و أربعون"
      parts.push(unit ? ONES_AR[unit] + AR_JOIN + TENS_AR[ten] : TENS_AR[ten]);
    }
  }
  return parts.join(AR_JOIN);
}

/**
 * Picks the right form of a counted noun for `n`, per Arabic number agreement:
 *   1 → singular, 2 → dual, last two digits 3–10 → plural,
 *   last two digits 11–99 → accusative singular, otherwise (…00) → singular.
 * e.g. 28 ريالاً سعودياً · 5 ريالات سعودية · 1000 ريال سعودي
 */
function arCountedForm(n, forms) {
  if (n === 1) return forms.singular;
  if (n === 2) return forms.dual;
  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return forms.plural;
  if (lastTwo >= 11) return forms.accusative;
  return forms.singular;
}

/**
 * Arabic drops the final nun of a dual/مائتان when it is immediately followed by
 * the noun it counts: "مائتا ألف" (not مائتان ألف), "ألفا ريال" (not ألفان ريال).
 */
function arDropNun(words) {
  return words
    .replace(/مائتان$/, 'مائتا')
    .replace(/ألفان$/, 'ألفا')
    .replace(/مليونان$/, 'مليونا');
}

/** Applies the same agreement to a scale word (ألف / مليون). */
function arScale(count, forms) {
  if (count === 1) return forms.singular;
  if (count === 2) return forms.dual;
  const word = arCountedForm(count, forms);
  return arDropNun(arBelowThousand(count)) + ' ' + word;
}

const THOUSAND_FORMS = arForms('ألف', 'ألفان', 'آلاف', 'ألفاً');
const MILLION_FORMS = arForms('مليون', 'مليونان', 'ملايين', 'مليوناً');

export function toWordsAr(n) {
  if (!n || n === 0) return 'صفر';

  const parts = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  if (millions) parts.push(arScale(millions, MILLION_FORMS));
  if (thousands) parts.push(arScale(thousands, THOUSAND_FORMS));
  if (rest) parts.push(arBelowThousand(rest));

  return parts.join(AR_JOIN);
}

/**
 * Full Arabic tafqeet, matching the Finance sample:
 *   48,428.80 → "ثمانية و أربعون ألفاً و أربعمائة و ثمانية و عشرون ريالاً سعودياً و ثمانون هللة فقط."
 */
export function amountInWordsAr(amount, currencyCode = 'SAR') {
  if (amount == null || isNaN(amount)) return '';
  const whole = Math.floor(amount);
  const fraction = Math.round((amount - whole) * 100);
  const currency = CURRENCY_NAMES[currencyCode];
  if (!currency) return '';

  // "ريال سعودي واحد" reads better than "واحد ريال سعودي" for 1 and 2.
  let words =
    whole === 1 || whole === 2
      ? arCountedForm(whole, currency.ar)
      : arDropNun(toWordsAr(whole)) + ' ' + arCountedForm(whole, currency.ar);

  if (fraction > 0) {
    const fractionWords =
      fraction === 1 || fraction === 2
        ? arCountedForm(fraction, currency.arFraction)
        : arDropNun(toWordsAr(fraction)) + ' ' + arCountedForm(fraction, currency.arFraction);
    words += AR_JOIN + fractionWords;
  }
  return words + ' فقط.';
}
