/**
 * BDM Commission Calculation Utilities
 */

/**
 * Calculate commission for a BDM on an invoice
 * @param {Object} invoice - Invoice object
 * @param {Object} bdm - BDM object with commission settings
 * @returns {number} - Commission amount in SAR
 */
export function calculateBDMCommission(invoice, bdm) {
  if (!invoice || !bdm) return 0;

  const invoiceTotal = invoice.totalAmount || invoice.total || 0;

  // Check if BDM has commission settings for this invoice
  const commissionType = bdm.commissionType || invoice.bdmCommissionType;
  const commissionValue = bdm.commissionValue || invoice.bdmCommissionValue;

  if (!commissionType || !commissionValue) return 0;

  let commission = 0;

  if (commissionType === 'fixed') {
    // Fixed absolute value (e.g., SAR 5000.00)
    commission = parseFloat(commissionValue);
  } else if (commissionType === 'percentage') {
    // Percentage of invoice total (e.g., 50%)
    commission = (invoiceTotal * parseFloat(commissionValue)) / 100;
  }

  return Math.round(commission * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate total commissions for a BDM across multiple invoices
 * @param {Array} invoices - Array of invoices
 * @param {Object} bdm - BDM object
 * @returns {Object} - { total, byInvoice: [] }
 */
export function calculateTotalBDMCommissions(invoices, bdm) {
  const byInvoice = invoices.map((invoice) => ({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    invoiceTotal: invoice.totalAmount,
    commissionType: invoice.bdmCommissionType || bdm.commissionType,
    commissionValue: invoice.bdmCommissionValue || bdm.commissionValue,
    commission: calculateBDMCommission(invoice, bdm),
  }));

  const total = byInvoice.reduce((sum, item) => sum + item.commission, 0);

  return {
    total: Math.round(total * 100) / 100,
    byInvoice,
    count: byInvoice.length,
  };
}

/**
 * Format commission display
 * @param {number} amount - Commission amount
 * @param {string} type - 'fixed' or 'percentage'
 * @param {number} value - Commission value
 * @returns {string} - Formatted string
 */
export function formatCommission(amount, type, value) {
  if (type === 'fixed') {
    return `SAR ${amount.toLocaleString()} (Fixed)`;
  }
  if (type === 'percentage') {
    return `SAR ${amount.toLocaleString()} (${value}%)`;
  }
  return `SAR ${amount.toLocaleString()}`;
}
