import * as XLSX from 'xlsx';

import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------
// VAT Return Excel Export - 3 Sheet Format for ZATCA
// Sheet 1: VAT Sales (Output VAT - Accounts Receivable)
// Sheet 2: VAT Purchases (Input VAT - Accounts Payable)
// Sheet 3: VAT Returns (Summary derived from Sheet 1 & 2)
// ----------------------------------------------------------------------

/**
 * Format number with 2 decimal places
 */
function formatAmount(value) {
  const num = parseFloat(value) || 0;
  return Math.round(num * 100) / 100;
}

/**
 * Get period label from dates
 */
function getPeriodLabel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[start.getMonth()]} to ${months[end.getMonth()]} ${end.getFullYear()}`;
}

/**
 * Create VAT Sales sheet data (Sheet 1 - Output VAT)
 */
function createVATSalesSheet(arRecords) {
  const data = [];
  
  // Header row
  data.push(['VAT Sales']);
  data.push(['S.no', 'Date', 'Invoice no', 'Client', 'Amount', 'VAT', 'Total']);
  
  // Data rows
  let totalAmount = 0;
  let totalVAT = 0;
  let totalGross = 0;
  
  arRecords.forEach((record, index) => {
    const amount = formatAmount(record.baseAmount || 0);
    const vat = formatAmount(record.vatAmount || 0);
    const total = formatAmount(record.totalWithVAT || record.total || 0);
    
    data.push([
      index + 1,
      fDate(record.date) || record.date,
      record.invoice_number || record.invoiceNumber || '-',
      record.customer_name || record.customerName || '-',
      amount,
      vat,
      total,
    ]);
    
    totalAmount += amount;
    totalVAT += vat;
    totalGross += total;
  });
  
  // Total row
  data.push([]);
  data.push(['', '', '', 'Total', formatAmount(totalAmount), formatAmount(totalVAT), formatAmount(totalGross)]);
  
  return {
    data,
    totals: {
      amount: formatAmount(totalAmount),
      vat: formatAmount(totalVAT),
      gross: formatAmount(totalGross),
      count: arRecords.length,
    },
  };
}

/**
 * Create VAT Purchases sheet data (Sheet 2 - Input VAT)
 */
function createVATPurchasesSheet(apRecords) {
  const data = [];
  
  // Header row
  data.push(['VAT Purchases']);
  data.push(['S.no', 'Date', 'Invoice no', 'Client', 'Amount', 'VAT', 'Total']);
  
  // Data rows
  let totalAmount = 0;
  let totalVAT = 0;
  let totalGross = 0;
  
  apRecords.forEach((record, index) => {
    const amount = formatAmount(record.baseAmount || 0);
    const vat = formatAmount(record.vatAmount || 0);
    const total = formatAmount(record.totalWithVAT || record.total || 0);
    
    data.push([
      index + 1,
      fDate(record.date) || record.date,
      record.invoice_number || record.invoiceNumber || '-',
      record.customer_name || record.vendorName || '-',
      amount,
      vat,
      total,
    ]);
    
    totalAmount += amount;
    totalVAT += vat;
    totalGross += total;
  });
  
  // Total row
  data.push([]);
  data.push(['', '', '', 'Total', formatAmount(totalAmount), formatAmount(totalVAT), formatAmount(totalGross)]);
  
  return {
    data,
    totals: {
      amount: formatAmount(totalAmount),
      vat: formatAmount(totalVAT),
      gross: formatAmount(totalGross),
      count: apRecords.length,
    },
  };
}

/**
 * Create VAT Returns sheet data (Sheet 3 - Summary)
 */
function createVATReturnsSheet(salesTotals, purchasesTotals, periodInfo, previousPeriodData = {}) {
  const data = [];
  
  // Title
  const periodLabel = periodInfo.label || getPeriodLabel(periodInfo.startDate, periodInfo.endDate);
  data.push([`VAT RETURN FOR ${periodLabel}`]);
  data.push([]);
  
  // VAT on Sales section
  data.push(['Vat on Sales', '', 'Amount', 'Adjustments', 'VAT Amount']);
  data.push([1, 'Standard Rated Sale', salesTotals.amount, '-', salesTotals.vat]);
  data.push([2, 'Private Healthcare/Private Education/First House Sales', '-', '-', '-']);
  data.push([3, 'Zero Rated Domestic Sales', '-', '-', '-']);
  data.push([4, 'Exports', '-', '-', '-']);
  data.push([5, 'Exempt Sales', '-', '-', '-']);
  data.push([6, 'Total Sales', salesTotals.amount, '-', salesTotals.vat]);
  data.push([]);
  
  // VAT on Purchases section
  data.push(['Vat on Purchase', '', '', '', '']);
  data.push([7, 'Standard Rated Domestic purchase', purchasesTotals.amount, '-', purchasesTotals.vat]);
  data.push([8, 'Imports Subject to VAT Paid at Customs', '-', '-', '-']);
  data.push([9, 'Imports Subject to VAT accounted for through RCM', '-', '-', '-']);
  data.push([10, 'Zero Rated purchases', '-', '-', '-']);
  data.push([11, 'Exempt Purchase', '-', '-', '-']);
  data.push([12, 'Total Purchase', purchasesTotals.amount, '-', purchasesTotals.vat]);
  data.push([]);
  
  // VAT Calculation section
  const totalVATDue = formatAmount(salesTotals.vat - purchasesTotals.vat);
  const correctionFromPrevious = formatAmount(previousPeriodData.correction || 0);
  const vatCreditCarriedForward = formatAmount(previousPeriodData.creditCarriedForward || 0);
  const netVATDue = formatAmount(totalVATDue - correctionFromPrevious - vatCreditCarriedForward);
  
  data.push([13, 'Total Vat Due for Current Period', '', '', totalVATDue]);
  data.push([14, 'Correction from previous Period', '', '', correctionFromPrevious]);
  data.push([15, 'Vat Credit carried forward from previous period', '', '', vatCreditCarriedForward]);
  data.push([]);
  data.push(['', 'Net VAT due', '', '', netVATDue]);
  
  return {
    data,
    summary: {
      totalSalesAmount: salesTotals.amount,
      totalSalesVAT: salesTotals.vat,
      totalPurchaseAmount: purchasesTotals.amount,
      totalPurchaseVAT: purchasesTotals.vat,
      totalVATDue,
      correctionFromPrevious,
      vatCreditCarriedForward,
      netVATDue,
      salesCount: salesTotals.count,
      purchaseCount: purchasesTotals.count,
    },
  };
}

/**
 * Apply styling to worksheet
 */
function applyWorksheetStyles(ws, sheetType) {
  // Set column widths
  if (sheetType === 'sales' || sheetType === 'purchases') {
    ws['!cols'] = [
      { wch: 6 },   // S.no
      { wch: 12 },  // Date
      { wch: 18 },  // Invoice no
      { wch: 35 },  // Client
      { wch: 15 },  // Amount
      { wch: 15 },  // VAT
      { wch: 15 },  // Total
    ];
  } else if (sheetType === 'returns') {
    ws['!cols'] = [
      { wch: 6 },   // S.no
      { wch: 50 },  // Description
      { wch: 15 },  // Amount
      { wch: 15 },  // Adjustments
      { wch: 15 },  // VAT Amount
    ];
  }
  
  return ws;
}

/**
 * Export VAT Return to Excel with 3 sheets
 * @param {object} vatData - The VAT data containing ar and ap records
 * @param {object} periodInfo - Period information { year, quarter, startDate, endDate, label }
 * @param {object} previousPeriodData - Optional previous period corrections
 * @returns {object} - { blob, summary } for download and database storage
 */
export function exportVATReturnToExcel(vatData, periodInfo, previousPeriodData = {}) {
  const { records } = vatData;
  const arRecords = records?.ar || [];
  const apRecords = records?.ap || [];
  
  // Create sheet data
  const salesSheet = createVATSalesSheet(arRecords);
  const purchasesSheet = createVATPurchasesSheet(apRecords);
  const returnsSheet = createVATReturnsSheet(
    salesSheet.totals,
    purchasesSheet.totals,
    periodInfo,
    previousPeriodData
  );
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Add VAT Sales sheet
  const ws1 = XLSX.utils.aoa_to_sheet(salesSheet.data);
  applyWorksheetStyles(ws1, 'sales');
  XLSX.utils.book_append_sheet(wb, ws1, 'VAT Sales');
  
  // Add VAT Purchases sheet
  const ws2 = XLSX.utils.aoa_to_sheet(purchasesSheet.data);
  applyWorksheetStyles(ws2, 'purchases');
  XLSX.utils.book_append_sheet(wb, ws2, 'VAT Purchases');
  
  // Add VAT Returns sheet
  const ws3 = XLSX.utils.aoa_to_sheet(returnsSheet.data);
  applyWorksheetStyles(ws3, 'returns');
  XLSX.utils.book_append_sheet(wb, ws3, 'VAT Returns');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Return blob and summary for storage
  return {
    blob,
    summary: returnsSheet.summary,
    salesData: salesSheet,
    purchasesData: purchasesSheet,
  };
}

/**
 * Download VAT Return Excel file
 */
export function downloadVATReturnExcel(vatData, periodInfo, previousPeriodData = {}) {
  const { blob, summary } = exportVATReturnToExcel(vatData, periodInfo, previousPeriodData);
  
  // Create download link
  const periodLabel = periodInfo.label || `Q${periodInfo.quarter}-${periodInfo.year}`;
  const fileName = `VAT-Return-${periodLabel}-${Date.now()}.xlsx`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
  
  return { fileName, summary };
}

/**
 * Prepare VAT Return data for database storage
 */
export function prepareVATReturnForStorage(vatData, periodInfo, previousPeriodData = {}) {
  const { summary } = exportVATReturnToExcel(
    vatData,
    periodInfo,
    previousPeriodData
  );
  
  return {
    taxPeriod: periodInfo.label || `Q${periodInfo.quarter}-${periodInfo.year}`,
    periodStartDate: periodInfo.startDate,
    periodEndDate: periodInfo.endDate,
    fiscalYear: periodInfo.year,
    quarter: periodInfo.quarter || null,
    
    // VAT on Sales
    standardRatedSalesAmount: summary.totalSalesAmount,
    standardRatedSalesVAT: summary.totalSalesVAT,
    totalSalesAmount: summary.totalSalesAmount,
    totalSalesVAT: summary.totalSalesVAT,
    
    // VAT on Purchases
    standardRatedPurchaseAmount: summary.totalPurchaseAmount,
    standardRatedPurchaseVAT: summary.totalPurchaseVAT,
    totalPurchaseAmount: summary.totalPurchaseAmount,
    totalPurchaseVAT: summary.totalPurchaseVAT,
    
    // VAT Calculation
    totalVATDueForPeriod: summary.totalVATDue,
    correctionFromPreviousPeriod: summary.correctionFromPrevious,
    vatCreditCarriedForward: summary.vatCreditCarriedForward,
    netVATDue: summary.netVATDue,
    
    // Counts
    salesInvoiceCount: summary.salesCount,
    purchaseInvoiceCount: summary.purchaseCount,
    
    // Status
    status: 'draft',
  };
}
