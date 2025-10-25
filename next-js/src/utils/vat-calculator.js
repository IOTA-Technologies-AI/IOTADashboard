import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

// ----------------------------------------------------------------------
// VAT Rate Configuration
// ----------------------------------------------------------------------

/**
 * Get VAT rate based on currency and country
 * @param {string} currency - Invoice currency (SAR, AED, etc.)
 * @param {string} country - Invoice country
 * @returns {number} - VAT rate as decimal (0.15 for 15%)
 */
export function getVATRate(currency, country) {
  // Rule 1: SAR currency in Saudi Arabia = 15% VAT
  if (currency === 'SAR' && country === 'Saudi Arabia') {
    return 0.15;
  }

  // Rule 2: AED currency = 5% VAT (UAE)
  if (currency === 'AED') {
    return 0.05;
  }

  // Rule 3: All other countries/currencies = 0% VAT
  return 0;
}

/**
 * Calculate VAT amount for an invoice (VAT-INCLUSIVE)
 * @param {number} amount - Invoice total amount (including VAT)
 * @param {string} currency - Invoice currency
 * @param {string} country - Invoice country
 * @returns {object} - { vatRate, vatAmount, baseAmount, totalWithVAT }
 */
export function calculateVAT(amount, currency, country) {
  const vatRate = getVATRate(currency, country);

  if (vatRate === 0) {
    // No VAT applicable
    return {
      vatRate: 0,
      vatRatePercent: 0,
      vatAmount: 0,
      baseAmount: amount,
      totalWithVAT: amount,
    };
  }

  // ✅ VAT-EXCLUSIVE CALCULATION (amount is base, we ADD VAT to it)
  // Formula: VAT Amount = Base Amount × VAT Rate
  // Formula: Total With VAT = Base Amount + VAT Amount

  const baseAmount = amount;
  const vatAmount = amount * vatRate;
  const totalWithVAT = amount + vatAmount;

  return {
    vatRate,
    vatRatePercent: vatRate * 100,
    vatAmount,
    baseAmount,
    totalWithVAT,
  };
}
// ----------------------------------------------------------------------
// Quarter Date Utilities
// ----------------------------------------------------------------------

/**
 * Get start and end dates for a specific quarter
 * @param {number} year - Year (e.g., 2025)
 * @param {number} quarter - Quarter number (1-4)
 * @returns {object} - { startDate, endDate, label }
 */
export function getQuarterDates(year, quarter) {
  const startDate = dayjs().year(year).quarter(quarter).startOf('quarter');
  const endDate = dayjs().year(year).quarter(quarter).endOf('quarter');

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    label: `Q${quarter} ${year}`,
    quarterStart: startDate.format('MMM DD, YYYY'),
    quarterEnd: endDate.format('MMM DD, YYYY'),
  };
}

/**
 * Get current quarter information
 * @returns {object} - Current quarter details
 */
export function getCurrentQuarter() {
  const now = dayjs();
  const year = now.year();
  const quarter = now.quarter();

  return {
    year,
    quarter,
    ...getQuarterDates(year, quarter),
  };
}

/**
 * Get last quarter information
 * @returns {object} - Last quarter details
 */
export function getLastQuarter() {
  const now = dayjs();
  let year = now.year();
  let quarter = now.quarter() - 1;

  // If current quarter is 1, go to Q4 of previous year
  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }

  return {
    year,
    quarter,
    ...getQuarterDates(year, quarter),
  };
}

/**
 * Get list of quarters for a given year
 * @param {number} year - Year
 * @returns {array} - Array of quarter objects
 */
export function getQuartersForYear(year) {
  return [1, 2, 3, 4].map((quarter) => ({
    quarter,
    year,
    ...getQuarterDates(year, quarter),
  }));
}

// ----------------------------------------------------------------------
// ZATCA Calculation
// ----------------------------------------------------------------------

/**
 * Calculate net VAT payable to ZATCA
 * @param {number} accountsReceivableVAT - Total AR VAT collected
 * @param {number} accountsPayableVAT - Total AP VAT paid
 * @returns {object} - ZATCA payment calculation
 */
export function calculateZATCAPayable(accountsReceivableVAT, accountsPayableVAT) {
  // ZATCA Formula: AR VAT (collected) - AP VAT (paid) = Net Payable
  const netAmount = accountsReceivableVAT - accountsPayableVAT;

  return {
    arVAT: accountsReceivableVAT,
    apVAT: accountsPayableVAT,
    netAmount,
    isPayable: netAmount > 0, // True if you need to pay ZATCA
    isRefundable: netAmount < 0, // True if ZATCA owes you
    status: netAmount > 0 ? 'Payable' : netAmount < 0 ? 'Refundable' : 'Neutral',
  };
}

// ----------------------------------------------------------------------
// VAT Record Processing
// ----------------------------------------------------------------------

/**
 * Process invoice and add VAT calculation
 * @param {object} invoice - Invoice object
 * @param {string} type - 'AR' or 'AP'
 * @returns {object} - Invoice with VAT details
 */
export function processInvoiceVAT(invoice, type = 'AR') {
  const currency = invoice.currency || invoice.currencyCode || 'SAR';
  const country = invoice.country || 'Saudi Arabia';
  const amount =
    invoice.baseAmount ||
    invoice.base_amount ||
    invoice.total ||
    invoice.totalAmount ||
    invoice.amount ||
    0;
  const hasBaseAmount = !!(invoice.baseAmount || invoice.base_amount);

  let vatCalculation;

  if (hasBaseAmount) {
    // New invoices: baseAmount exists, calculate VAT by adding
    vatCalculation = calculateVAT(amount, currency, country);
  } else {
    // Old invoices: only total exists, extract base amount
    const vatRate = getVATRate(currency, country);
    if (vatRate === 0) {
      vatCalculation = {
        vatRate: 0,
        vatRatePercent: 0,
        vatAmount: 0,
        baseAmount: amount,
        totalWithVAT: amount,
      };
    } else {
      const baseAmount = amount / (1 + vatRate);
      const vatAmount = amount - baseAmount;
      vatCalculation = {
        vatRate,
        vatRatePercent: vatRate * 100,
        vatAmount,
        baseAmount,
        totalWithVAT: amount,
      };
    }
  }

  return {
    ...invoice,
    type, // 'AR' or 'AP'
    currency,
    country,
    baseAmount: vatCalculation.baseAmount,
    ...vatCalculation,
    zatcaCompliant: currency === 'SAR' && country === 'Saudi Arabia',
  };
}

/**
 * Aggregate VAT totals from invoice array
 * @param {array} invoices - Array of processed invoices
 * @returns {object} - Aggregated VAT totals
 */
export function aggregateVATTotals(invoices) {
  const totals = invoices.reduce(
    (acc, inv) => {
      acc.totalInvoices += 1;
      acc.totalAmount += inv.baseAmount || 0;
      acc.totalVAT += inv.vatAmount || 0;

      if (inv.isVATApplicable) {
        acc.vatApplicableCount += 1;
        acc.vatApplicableAmount += inv.baseAmount || 0;
      } else {
        acc.nonVATCount += 1;
        acc.nonVATAmount += inv.baseAmount || 0;
      }

      // Group by currency
      const curr = inv.currency || 'SAR';
      if (!acc.byCurrency[curr]) {
        acc.byCurrency[curr] = { count: 0, amount: 0, vat: 0 };
      }
      acc.byCurrency[curr].count += 1;
      acc.byCurrency[curr].amount += inv.baseAmount || 0;
      acc.byCurrency[curr].vat += inv.vatAmount || 0;

      return acc;
    },
    {
      totalInvoices: 0,
      totalAmount: 0,
      totalVAT: 0,
      vatApplicableCount: 0,
      vatApplicableAmount: 0,
      nonVATCount: 0,
      nonVATAmount: 0,
      byCurrency: {},
    }
  );

  return totals;
}
