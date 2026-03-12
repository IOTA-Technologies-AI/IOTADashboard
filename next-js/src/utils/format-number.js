import { formatNumberLocale } from 'src/locales';

// ----------------------------------------------------------------------

/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

const DEFAULT_LOCALE = { code: 'en-US', currency: 'USD' };

function processInput(inputValue) {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------

export function fNumber(inputValue, options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

/**
 * Format currency with support for multiple currencies (AED, SAR, USD, etc.)
 * @param {number} inputValue - Amount to format
 * @param {object} options - Options including currencyCode
 * @param {string} options.currencyCode - Currency code (AED, SAR, USD, etc.)
 * @returns {string} Formatted currency string
 * @example
 * fCurrency(1000) // $1,000 (default)
 * fCurrency(1000, { currencyCode: 'AED' }) // AED 1,000
 * fCurrency(1000, { currencyCode: 'SAR' }) // ﷼ 1,000
 */
export function fCurrency(inputValue, options = {}) {
  const number = processInput(inputValue);
  if (number === null) return '';

  // Accept both 'currencyCode' (preferred) and 'currency' (legacy alias) as the
  // IOTA custom-symbol key. Any remaining keys are forwarded to Intl.NumberFormat.
  const { currencyCode, currency: currencyAlias, ...intlOptions } = options;
  const effectiveCurrencyCode = currencyCode || currencyAlias;

  // If a currency code is provided, format with IOTA custom symbol (safe path)
  if (effectiveCurrencyCode) {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...intlOptions,
    }).format(number);

    // Use ﷼ (U+FDFC) for SAR, otherwise use currency code as prefix
    const symbol = effectiveCurrencyCode === 'SAR' ? '\uFDFC' : effectiveCurrencyCode;
    return `${symbol} ${formatted}`;
  }

  // Default behavior - use locale settings with safe fallbacks
  const locale = formatNumberLocale() || DEFAULT_LOCALE;
  const safeCurrency = locale.currency || DEFAULT_LOCALE.currency;
  const safeCode = locale.code || DEFAULT_LOCALE.code;

  const fm = new Intl.NumberFormat(safeCode, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...intlOptions,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

export function fPercent(inputValue, options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);

  return fm;
}

// ----------------------------------------------------------------------

export function fShortenNumber(inputValue, options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm.replace(/[A-Z]/g, (match) => match.toLowerCase());
}

// ----------------------------------------------------------------------

export function fData(inputValue) {
  const number = processInput(inputValue);
  if (number === null || number === 0) return '0 bytes';

  const units = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
  const decimal = 2;
  const baseValue = 1024;

  const index = Math.floor(Math.log(number) / Math.log(baseValue));
  const fm = `${parseFloat((number / baseValue ** index).toFixed(decimal))} ${units[index]}`;

  return fm;
}
