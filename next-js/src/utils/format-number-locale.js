/**
 * Convert English digits (0-9) to Arabic-Indic digits (٠-٩)
 * @param {string} input - String containing numbers
 * @returns {string} - String with Arabic-Indic numerals
 */
export function toArabicNumerals(input) {
  if (!input) return '';

  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  return String(input).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit, 10)]);
}

/**
 * Format number with locale support (English or Arabic numerals)
 * @param {number} value - Number to format
 * @param {string} locale - 'en' or 'ar'
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} - Formatted number
 */
export function fNumberWithLocale(value, locale = 'en', options = {}) {
  if (value == null || Number.isNaN(value)) return '';

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value));

  return locale === 'ar' ? toArabicNumerals(formatted) : formatted;
}

/**
 * Format currency with locale support
 * @param {number} value - Number to format
 * @param {string} locale - 'en' or 'ar'
 * @param {string} currency - Currency code (SAR, AED, USD)
 * @returns {string} - Formatted currency
 */
export function fCurrencyWithLocale(value, locale = 'en', currency = 'SAR') {
  if (value == null || Number.isNaN(value)) return '';

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

  const withCurrency = `${currency} ${formatted}`;

  return locale === 'ar' ? toArabicNumerals(withCurrency) : withCurrency;
}
