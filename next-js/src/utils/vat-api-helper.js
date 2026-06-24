import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Add these imports:
import { fetchAccountsPayableByDateRange, fetchAccountsReceivableByDateRange } from './apiHelper';
import {
  getQuarterDates,
  getMonthDates,
  processInvoiceVAT,
  aggregateVATTotals,
  calculateZATCAPayable,
} from './vat-calculator';

dayjs.extend(isBetween);

// ----------------------------------------------------------------------
// VAT Data Fetching
// ----------------------------------------------------------------------

/**
 * Fetch and filter invoices for a specific quarter
 * @param {number} year - Year
 * @param {number} quarter - Quarter (1-4)
 * @returns {Promise<object>} - { arInvoices, apPayments }
 */
export async function fetchQuarterlyInvoices(year, quarter) {
  try {
    const { startDate, endDate } = getQuarterDates(year, quarter);
    // DEBUG: Log the quarter dates
    console.log('🗓️ Quarter date range:', {
      year,
      quarter,
      startDate,
      endDate,
      startDateFormatted: dayjs(startDate).format('YYYY-MM-DD'),
      endDateFormatted: dayjs(endDate).format('YYYY-MM-DD'),
    });
    // Format dates for API (YYYY-MM-DD)
    const startDateStr = dayjs(startDate).format('YYYY-MM-DD');
    const endDateStr = dayjs(endDate).format('YYYY-MM-DD');

    // Fetch AR and AP data filtered by date range
    const [arResponse, apResponse] = await Promise.all([
      fetchAccountsReceivableByDateRange(startDateStr, endDateStr),
      fetchAccountsPayableByDateRange(startDateStr, endDateStr),
    ]);

    return {
      arInvoices: arResponse?.invoices || [],
      apPayments: apResponse?.bills || [],
      quarter: { year, quarter, startDate, endDate },
    };
  } catch (error) {
    console.error('Failed to fetch quarterly invoices:', error);
    throw error;
  }
}

/**
 * Fetch and filter invoices for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<object>} - { arInvoices, apPayments }
 */
export async function fetchMonthlyInvoices(year, month) {
  try {
    const { startDate, endDate } = getMonthDates(year, month);
    console.log('🗓️ Month date range:', {
      year,
      month,
      startDate,
      endDate,
      startDateFormatted: dayjs(startDate).format('YYYY-MM-DD'),
      endDateFormatted: dayjs(endDate).format('YYYY-MM-DD'),
    });

    const startDateStr = dayjs(startDate).format('YYYY-MM-DD');
    const endDateStr = dayjs(endDate).format('YYYY-MM-DD');

    const [arResponse, apResponse] = await Promise.all([
      fetchAccountsReceivableByDateRange(startDateStr, endDateStr),
      fetchAccountsPayableByDateRange(startDateStr, endDateStr),
    ]);

    return {
      arInvoices: arResponse?.invoices || [],
      apPayments: apResponse?.bills || [],
      month: { year, month, startDate, endDate },
    };
  } catch (error) {
    console.error('Failed to fetch monthly invoices:', error);
    throw error;
  }
}

/**
 * Process monthly VAT data
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<object>} - Processed VAT data with calculations
 */
export async function getMonthlyVATData(year, month) {
  try {
    console.log('📅 Fetching monthly VAT data:', { year, month });

    const { arInvoices, apPayments, month: monthInfo } = await fetchMonthlyInvoices(year, month);

    console.log('📊 Raw data fetched:', {
      arInvoicesCount: arInvoices?.length || 0,
      apPaymentsCount: apPayments?.length || 0,
      monthInfo,
    });

    // VAT liability is based on the date of supply (tax point), not payment status.
    // Only SAR-currency transactions are in scope for KSA VAT (ZATCA).
    // Exclude voided/cancelled records and VAT-exempt AP expenses.
    const EXCLUDED_STATUSES = ['void', 'voided', 'cancelled', 'canceled'];

    // AR: SAR currency only, non-void
    const vatARInvoices = arInvoices.filter((invoice) => {
      const s = invoice.status?.toLowerCase();
      if (s && EXCLUDED_STATUSES.includes(s)) return false;
      const currency = invoice.currencyCode;
      return !currency || currency === 'SAR'; // include SAR or unset (defaults to SAR)
    });

    // AP: SAR currency only, non-void, non-VAT-exempt
    const vatAPPayments = apPayments.filter((payment) => {
      const s = payment.status?.toLowerCase();
      if (s && EXCLUDED_STATUSES.includes(s)) return false;
      const currency = payment.currencyCode;
      if (currency && currency !== 'SAR') return false; // exclude non-SAR
      if (payment.isVATExempt) return false; // exclude VAT-exempt
      return true;
    });

    console.log('📋 VAT-applicable records:', {
      totalAR: arInvoices.length,
      vatAR: vatARInvoices.length,
      arExcludedNonSAR: arInvoices.length - vatARInvoices.length,
      totalAP: apPayments.length,
      vatAP: vatAPPayments.length,
      apExcludedNonSAR: apPayments.filter((p) => p.currencyCode && p.currencyCode !== 'SAR').length,
      apExcludedVATExempt: apPayments.filter((p) => p.isVATExempt).length,
    });

    const arRecords = vatARInvoices.map((invoice) =>
      processInvoiceVAT(
        {
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          customer_name: invoice.customerName,
          country: invoice.country || 'Saudi Arabia',
          currency: invoice.currencyCode || 'SAR',
          total: invoice.totalAmount || 0,
          vatTaxPeriod: invoice.vatTaxPeriod || null,
        },
        'AR'
      )
    );

    const apRecords = vatAPPayments.map((payment) =>
      processInvoiceVAT(
        {
          payment_id: payment.id,
          invoice_number: payment.billNumber,
          date: payment.billDate,
          customer_name: payment.vendorName,
          country: payment.country || 'Saudi Arabia',
          currency: payment.currencyCode || 'SAR',
          total: payment.totalAmount || 0,
          vatTaxPeriod: payment.vatTaxPeriod || null,
          isVATExempt: false, // already filtered out above
        },
        'AP'
      )
    );

    const arTotals = aggregateVATTotals(arRecords);
    const apTotals = aggregateVATTotals(apRecords);

    const zatcaPayable = calculateZATCAPayable(arTotals.totalVAT, apTotals.totalVAT);

    const allRecords = [...arRecords, ...apRecords].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return {
      monthInfo,
      records: {
        all: allRecords,
        ar: arRecords,
        ap: apRecords,
      },
      totals: {
        ar: arTotals,
        ap: apTotals,
      },
      zatcaPayable,
      summary: {
        totalInvoices: allRecords.length,
        arCount: arRecords.length,
        apCount: apRecords.length,
        totalVATCollected: arTotals.totalVAT,
        totalVATPaid: apTotals.totalVAT,
        netVATPayable: zatcaPayable.netAmount,
        zatcaStatus: zatcaPayable.status,
      },
    };
  } catch (error) {
    console.error('❌ Failed to get monthly VAT data:', error);
    throw error;
  }
}

/**
 * Process quarterly VAT data
 * @param {number} year - Year
 * @param {number} quarter - Quarter (1-4)
 * @returns {Promise<object>} - Processed VAT data with calculations
 */
export async function getQuarterlyVATData(year, quarter) {
  try {
    console.log('📅 Fetching quarterly VAT data:', { year, quarter });

    // Fetch filtered invoices for the quarter
    const {
      arInvoices,
      apPayments,
      quarter: quarterInfo,
    } = await fetchQuarterlyInvoices(year, quarter);
    console.log('📋 AR Invoices raw:', arInvoices);
    console.log('📋 AP Payments raw:', apPayments);
    console.log('📊 Raw data fetched:', {
      arInvoicesCount: arInvoices?.length || 0,
      apPaymentsCount: apPayments?.length || 0,
      quarterInfo,
    });

    // VAT liability is based on the date of supply (tax point), not payment status.
    // Only SAR-currency transactions are in scope for KSA VAT (ZATCA).
    // Exclude voided/cancelled records and VAT-exempt AP expenses.
    const EXCLUDED_STATUSES = ['void', 'voided', 'cancelled', 'canceled'];

    // AR: SAR currency only, non-void
    const vatARInvoices = arInvoices.filter((invoice) => {
      const s = invoice.status?.toLowerCase();
      if (s && EXCLUDED_STATUSES.includes(s)) return false;
      const currency = invoice.currencyCode;
      return !currency || currency === 'SAR'; // include SAR or unset (defaults to SAR)
    });

    // AP: SAR currency only, non-void, non-VAT-exempt
    const vatAPPayments = apPayments.filter((payment) => {
      const s = payment.status?.toLowerCase();
      if (s && EXCLUDED_STATUSES.includes(s)) return false;
      const currency = payment.currencyCode;
      if (currency && currency !== 'SAR') return false; // exclude non-SAR
      if (payment.isVATExempt) return false; // exclude VAT-exempt
      return true;
    });

    console.log('📋 VAT-applicable records:', {
      totalAR: arInvoices.length,
      vatAR: vatARInvoices.length,
      arExcludedNonSAR: arInvoices.length - vatARInvoices.length,
      totalAP: apPayments.length,
      vatAP: vatAPPayments.length,
      apExcludedNonSAR: apPayments.filter((p) => p.currencyCode && p.currencyCode !== 'SAR').length,
      apExcludedVATExempt: apPayments.filter((p) => p.isVATExempt).length,
    });
    const arRecords = vatARInvoices.map((invoice) =>
      processInvoiceVAT(
        {
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          customer_name: invoice.customerName,
          country: invoice.country || 'Saudi Arabia',
          currency: invoice.currencyCode || 'SAR',
          total: invoice.totalAmount || 0,
          vatTaxPeriod: invoice.vatTaxPeriod || null,
        },
        'AR'
      )
    );

    const apRecords = vatAPPayments.map((payment) =>
      processInvoiceVAT(
        {
          payment_id: payment.id,
          invoice_number: payment.billNumber,
          date: payment.billDate,
          customer_name: payment.vendorName,
          country: payment.country || 'Saudi Arabia',
          currency: payment.currencyCode || 'SAR',
          total: payment.totalAmount || 0,
          vatTaxPeriod: payment.vatTaxPeriod || null,
          isVATExempt: false, // already filtered out above
        },
        'AP'
      )
    );

    // Aggregate totals
    const arTotals = aggregateVATTotals(arRecords);
    const apTotals = aggregateVATTotals(apRecords);

    console.log('📈 Aggregated totals:', { arTotals, apTotals });

    // Calculate ZATCA payable
    const zatcaPayable = calculateZATCAPayable(arTotals.totalVAT, apTotals.totalVAT);

    console.log('🏦 ZATCA calculation:', zatcaPayable);

    // Combine all records
    const allRecords = [...arRecords, ...apRecords].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const result = {
      quarterInfo,
      records: {
        all: allRecords,
        ar: arRecords,
        ap: apRecords,
      },
      totals: {
        ar: arTotals,
        ap: apTotals,
      },
      zatcaPayable,
      summary: {
        totalInvoices: allRecords.length,
        arCount: arRecords.length,
        apCount: apRecords.length,
        totalVATCollected: arTotals.totalVAT,
        totalVATPaid: apTotals.totalVAT,
        netVATPayable: zatcaPayable.netAmount,
        zatcaStatus: zatcaPayable.status,
      },
    };

    console.log('✨ Final result:', result);

    return result;
  } catch (error) {
    console.error('❌ Failed to get quarterly VAT data:', error);
    throw error;
  }
}
/**
 * Get VAT data for multiple quarters
 * @param {number} year - Year
 * @param {array} quarters - Array of quarter numbers [1,2,3,4]
 * @returns {Promise<array>} - Array of quarterly VAT data
 */
export async function getMultiQuarterVATData(year, quarters = [1, 2, 3, 4]) {
  try {
    const quarterlyData = await Promise.all(
      quarters.map((quarter) => getQuarterlyVATData(year, quarter))
    );

    return quarterlyData;
  } catch (error) {
    console.error('Failed to get multi-quarter VAT data:', error);
    throw error;
  }
}

/**
 * Get annual VAT summary
 * @param {number} year - Year
 * @returns {Promise<object>} - Annual VAT summary
 */
export async function getAnnualVATSummary(year) {
  try {
    const quarterlyData = await getMultiQuarterVATData(year);

    // Aggregate annual totals
    const annualTotals = quarterlyData.reduce(
      (acc, quarter) => {
        acc.totalInvoices += quarter.summary.totalInvoices;
        acc.totalVATCollected += quarter.summary.totalVATCollected;
        acc.totalVATPaid += quarter.summary.totalVATPaid;
        acc.quarters.push({
          quarter: quarter.quarterInfo.quarter,
          netPayable: quarter.summary.netVATPayable,
          status: quarter.summary.zatcaStatus,
        });
        return acc;
      },
      {
        year,
        totalInvoices: 0,
        totalVATCollected: 0,
        totalVATPaid: 0,
        netVATPayable: 0,
        quarters: [],
      }
    );

    annualTotals.netVATPayable = annualTotals.totalVATCollected - annualTotals.totalVATPaid;

    return {
      ...annualTotals,
      quarterlyData,
    };
  } catch (error) {
    console.error('Failed to get annual VAT summary:', error);
    throw error;
  }
}

/**
 * Export VAT data with filtering
 * @param {object} filters - Filter object
 * @returns {Promise<array>} - Filtered VAT records
 */
export async function getFilteredVATData(filters = {}) {
  const { year, quarter, type, currency, country } = filters;

  try {
    const data = await getQuarterlyVATData(year, quarter);

    let filtered = data.records.all;

    // Filter by type (AR/AP)
    if (type && type !== 'all') {
      filtered = filtered.filter((record) => record.type === type);
    }

    // Filter by currency
    if (currency && currency !== 'All') {
      filtered = filtered.filter((record) => record.currency === currency);
    }

    // Filter by country
    if (country && country !== 'All') {
      filtered = filtered.filter((record) => record.country === country);
    }

    return {
      ...data,
      filteredRecords: filtered,
    };
  } catch (error) {
    console.error('Failed to get filtered VAT data:', error);
    throw error;
  }
}

/**
 * Validate VAT calculation against ZATCA rules
 * @param {object} record - VAT record
 * @returns {object} - Validation result
 */
export function validateZATCACompliance(record) {
  const validations = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check if SAR currency has correct VAT rate
  if (record.currency === 'SAR' && record.country === 'Saudi Arabia') {
    if (record.vatRatePercent !== 15) {
      validations.isValid = false;
      validations.errors.push('SAR invoices in Saudi Arabia must have 15% VAT');
    }
  }

  // Check if AED currency has correct VAT rate
  if (record.currency === 'AED') {
    if (record.vatRatePercent !== 5) {
      validations.isValid = false;
      validations.errors.push('AED invoices must have 5% VAT');
    }
  }

  // Check for missing country
  if (!record.country || record.country === 'N/A') {
    validations.warnings.push('Country information missing');
  }

  // Check for negative amounts
  if (record.baseAmount < 0) {
    validations.warnings.push('Negative invoice amount detected');
  }

  return validations;
}

/**
 * Generate ZATCA report data
 * @param {number} year - Year
 * @param {number} quarter - Quarter
 * @returns {Promise<object>} - ZATCA report data
 */
export async function generateZATCAReport(year, quarter) {
  try {
    const data = await getQuarterlyVATData(year, quarter);

    // Validate all records
    const validatedRecords = data.records.all.map((record) => ({
      ...record,
      validation: validateZATCACompliance(record),
    }));

    // Separate compliant and non-compliant records
    const compliantRecords = validatedRecords.filter((r) => r.validation.isValid);
    const nonCompliantRecords = validatedRecords.filter((r) => !r.validation.isValid);

    return {
      ...data,
      report: {
        generatedAt: new Date().toISOString(),
        quarter: `Q${quarter} ${year}`,
        totalRecords: validatedRecords.length,
        compliantRecords: compliantRecords.length,
        nonCompliantRecords: nonCompliantRecords.length,
        validationIssues: nonCompliantRecords.map((r) => ({
          invoice: r.invoice_number,
          errors: r.validation.errors,
        })),
      },
      validatedRecords,
    };
  } catch (error) {
    console.error('Failed to generate ZATCA report:', error);
    throw error;
  }
}
