import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Add these imports:
import { fetchAccountsPayableByDateRange, fetchAccountsReceivableByDateRange } from './apiHelper';
import {
  getQuarterDates,
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

    // In getQuarterlyVATData function, update the processing:

    const arRecords = arInvoices.map((invoice) =>
      processInvoiceVAT(
        {
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber, // Changed from invoice_number
          date: invoice.invoiceDate, // Changed from date
          customer_name: invoice.customerName, // Changed from customer_name
          country: invoice.country || 'Saudi Arabia',
          currency: invoice.currencyCode || 'SAR', // Changed from currency_code
          total: invoice.totalAmount || 0, // Changed from total
        },
        'AR'
      )
    );

    const apRecords = apPayments.map((payment) =>
      processInvoiceVAT(
        {
          payment_id: payment.id,
          invoice_number: payment.billNumber, // Changed from payment_number
          date: payment.billDate, // Changed from date
          customer_name: payment.vendorName, // Changed from customer_name
          country: payment.country || 'Saudi Arabia',
          currency: payment.currencyCode || 'SAR', // Changed from currency_code
          total: payment.totalAmount || 0, // Changed from amount
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
