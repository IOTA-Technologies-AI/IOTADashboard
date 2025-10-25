import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

export function exportVATToExcel(data, quarterInfo) {
  const { records, totals, zatcaPayable, summary } = data;

  // Create CSV content
  const headers = [
    'Invoice Number',
    'Date',
    'Customer/Vendor',
    'Country',
    'Currency',
    'Base Amount',
    'VAT Rate (%)',
    'VAT Amount',
    'Total Amount',
    'Type (AR/AP)',
  ];

  const rows = records.all.map((record) => [
    record.invoice_number || '-',
    fDate(record.date),
    record.customer_name || '-',
    record.country || '-',
    record.currency,
    fNumber(record.baseAmount),
    record.vatRatePercent?.toFixed(2) || '0.00',
    fNumber(record.vatAmount),
    fNumber(record.totalWithVAT),
    record.type,
  ]);

  // Add summary rows
  const summaryRows = [
    [],
    ['=== ZATCA SUMMARY ==='],
    ['Quarter', quarterInfo.label],
    ['Period', `${quarterInfo.quarterStart} - ${quarterInfo.quarterEnd}`],
    [],
    ['AR - VAT Collected', `SAR ${fNumber(totals.ar.totalVAT)}`],
    ['AP - VAT Paid', `SAR ${fNumber(totals.ap.totalVAT)}`],
    ['Net VAT Payable to ZATCA', `SAR ${fNumber(Math.abs(zatcaPayable.netAmount))}`],
    ['Status', zatcaPayable.status],
    [],
    ['Total AR Invoices', summary.arCount],
    ['Total AP Payments', summary.apCount],
    ['Total Transactions', summary.totalInvoices],
  ];

  // Combine all data
  const csvData = [headers, ...rows, ...summaryRows];

  // Convert to CSV string
  const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ZATCA-VAT-Report-${quarterInfo.label}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportVATToJSON(data, quarterInfo) {
  const exportData = {
    metadata: {
      reportType: 'ZATCA VAT Return',
      quarter: quarterInfo.label,
      period: {
        start: quarterInfo.quarterStart,
        end: quarterInfo.quarterEnd,
      },
      generatedAt: new Date().toISOString(),
    },
    summary: data.summary,
    zatcaCalculation: data.zatcaPayable,
    totals: {
      accountsReceivable: data.totals.ar,
      accountsPayable: data.totals.ap,
    },
    transactions: data.records.all.map((record) => ({
      invoiceNumber: record.invoice_number,
      date: record.date,
      customerVendor: record.customer_name,
      country: record.country,
      currency: record.currency,
      baseAmount: record.baseAmount,
      vatRate: record.vatRatePercent,
      vatAmount: record.vatAmount,
      totalAmount: record.totalWithVAT,
      type: record.type,
      zatcaCompliant: record.zatcaCompliant,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ZATCA-VAT-Report-${quarterInfo.label}-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
