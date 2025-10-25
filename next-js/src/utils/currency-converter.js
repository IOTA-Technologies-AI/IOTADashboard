import axios from 'axios';

// ----------------------------------------------------------------------
// Currency Converter Utility
// ----------------------------------------------------------------------

const SUPPORTED_CURRENCIES = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

/**
 * Get list of supported currencies
 * @returns {Array} - List of currency objects
 */
export function getSupportedCurrencies() {
  return SUPPORTED_CURRENCIES;
}

/**
 * Get currency symbol by code
 * @param {string} currencyCode - Currency code (SAR, AED, etc.)
 * @returns {string} - Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * Convert currency amount to SAR (or any target currency)
 * Uses the same API as the backend for consistency
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code (defaults to SAR)
 * @returns {Promise<{convertedAmount: number, rate: number, error?: string}>}
 */
export async function convertCurrency(amount, fromCurrency, toCurrency = 'SAR') {
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: amount,
      rate: 1,
    };
  }

  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const convertedAmount = amount * rate;
    
    console.log(
      `💱 Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency} (rate: ${rate})`
    );

    return {
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
      rate: parseFloat(rate.toFixed(4)),
    };
  } catch (error) {
    console.error('❌ Currency conversion failed:', error.message);
    return {
      convertedAmount: amount,
      rate: 1,
      error: error.message,
    };
  }
}

/**
 * Get current exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<{rate: number, error?: string}>}
 */
export async function getExchangeRate(fromCurrency, toCurrency = 'SAR') {
  if (fromCurrency === toCurrency) {
    return { rate: 1 };
  }

  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return {
      rate: parseFloat(rate.toFixed(4)),
    };
  } catch (error) {
    console.error('❌ Failed to get exchange rate:', error.message);
    return {
      rate: 1,
      error: error.message,
    };
  }
}

/**
 * Format currency amount with proper symbol and locale
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @param {string} locale - Locale (en or ar)
 * @returns {string} - Formatted currency string
 */
export function formatCurrencyAmount(amount, currencyCode, locale = 'en') {
  const symbol = getCurrencySymbol(currencyCode);
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

  return `${symbol} ${formatted}`;
}
