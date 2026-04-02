'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { fDate } from 'src/utils/format-time';
import { fetchInvoice, getCustomers } from 'src/utils/apiHelper';

import { IOTA_OFFICES } from 'src/sections/invoice/invoice-create-edit-address';

// ── Colours matching IOTA brand ───────────────────────────────────────────────
const IOTA_BLUE = '#0166ff';
const IOTA_GREEN = '#013927';

// ── Number-to-words ───────────────────────────────────────────────────────────
const ONES = [
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
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWords(n) {
  if (!n || n === 0) return 'Zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1000)
    return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 1_000_000)
    return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  return (
    toWords(Math.floor(n / 1_000_000)) +
    ' Million' +
    (n % 1_000_000 ? ' ' + toWords(n % 1_000_000) : '')
  );
}

const CURRENCY_NAMES = {
  SAR: 'Saudi Riyals',
  AED: 'UAE Dirhams',
  USD: 'US Dollars',
  EUR: 'Euros',
  GBP: 'British Pounds',
  INR: 'Indian Rupees',
};

function amountInWords(amount, currencyCode = 'SAR') {
  if (!amount || isNaN(amount)) return '';
  const currency = CURRENCY_NAMES[currencyCode] || currencyCode;
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  let words = toWords(whole) + ' ' + currency;
  if (cents > 0) words += ' and ' + toWords(cents) + ' Fils';
  return words + ' only.';
}

function formatCurrency(amount, currencyCode = 'SAR') {
  if (amount == null || isNaN(amount)) return '';
  try {
    const localeMap = {
      SAR: 'ar-SA',
      AED: 'en-AE',
      USD: 'en-US',
      GBP: 'en-GB',
      INR: 'en-IN',
      EUR: 'de-DE',
    };
    return new Intl.NumberFormat(localeMap[currencyCode] || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}

// Infer IOTA office from currencyCode stored on the invoice
function getOffice(currencyCode) {
  return IOTA_OFFICES.find((o) => o.currency === currencyCode) || IOTA_OFFICES[0];
}

// ── Inline styles (avoids MUI / Tailwind dependency in print page) ────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #e8e8e8;
    color: #1e1e1e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── paged.js / @page ─────────────────────────────────────── */
  @page {
    size: A4 portrait;
    margin: 0;
  }

  /* ── Screen: show A4 shadow ───────────────────────────────── */
  @media screen {
    .page-wrapper {
      padding: 12mm;
    }
  }

  @media print {
    html, body { background: white; }
    .page-wrapper { padding: 0; }
    .print-toolbar { display: none !important; }
    .pagedjs_pages { margin: 0 !important; }
  }

  /* ── Print toolbar (screen only) ─────────────────────────── */
  .print-toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    background: ${IOTA_GREEN};
    padding: 10px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .print-toolbar span {
    color: white;
    font-size: 14px;
    font-weight: 600;
    flex: 1;
  }
  .btn-print {
    background: ${IOTA_BLUE};
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .btn-print:hover { background: #0050cc; }
  .btn-close {
    background: rgba(255,255,255,0.15);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  /* ── A4 page ──────────────────────────────────────────────── */
  .invoice-page {
    width: 210mm;
    min-height: 297mm;
    background: white;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 32px rgba(0,0,0,0.18);
  }

  /* ── Decorative circles ───────────────────────────────────── */
  .circle-tr {
    position: absolute;
    top: -70px; right: -70px;
    width: 260px; height: 260px;
    border-radius: 50%;
    background: ${IOTA_BLUE};
    opacity: 0.08;
    pointer-events: none;
  }
  .circle-bl {
    position: absolute;
    bottom: -70px; left: -70px;
    width: 260px; height: 260px;
    border-radius: 50%;
    background: ${IOTA_BLUE};
    opacity: 0.08;
    pointer-events: none;
  }

  /* ── Content padding ──────────────────────────────────────── */
  .content {
    padding: 38px 42px 32px;
    position: relative;
  }

  /* ── Header ───────────────────────────────────────────────── */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .logo { width: 52px; height: 52px; object-fit: contain; }
  .invoice-title {
    font-size: 28px;
    font-weight: 800;
    color: #1e1e1e;
    letter-spacing: 8px;
    text-transform: uppercase;
  }

  /* ── Accent line ──────────────────────────────────────────── */
  .accent-line {
    height: 2px;
    background: ${IOTA_BLUE};
    margin-bottom: 20px;
  }

  /* ── Billing row ──────────────────────────────────────────── */
  .billing-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .bill-to-col { width: 52%; }
  .meta-col { width: 45%; }

  .section-label {
    font-size: 8px;
    font-weight: 700;
    color: ${IOTA_BLUE};
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 5px;
  }
  .customer-name {
    font-size: 13px;
    font-weight: 700;
    color: #1e1e1e;
    margin-bottom: 3px;
  }
  .body-text {
    font-size: 9.5px;
    color: #444;
    line-height: 1.65;
  }

  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table td { font-size: 9.5px; padding: 2.5px 0; vertical-align: top; }
  .meta-label { font-weight: 700; color: #1e1e1e; padding-right: 10px; white-space: nowrap; }
  .meta-value { text-align: right; color: #1e1e1e; }
  .meta-bold { font-weight: 700; }

  /* ── Divider ──────────────────────────────────────────────── */
  .divider { height: 1px; background: ${IOTA_BLUE}; opacity: 0.25; margin: 0 0 16px; }

  /* ── Items table ──────────────────────────────────────────── */
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table thead tr { border-bottom: 1.5px solid ${IOTA_BLUE}; }
  .items-table th {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e1e1e;
    padding: 0 0 7px;
    text-align: left;
  }
  .items-table th.col-right { text-align: right; }
  .items-table td { padding: 9px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .items-table td.col-right { text-align: right; font-size: 10.5px; }
  .item-title { font-size: 10.5px; font-weight: 700; color: #1e1e1e; }
  .item-desc { font-size: 9px; color: #888; margin-top: 2px; }

  /* ── Summary ──────────────────────────────────────────────── */
  .summary-outer { display: flex; justify-content: flex-end; margin-top: 6px; }
  .summary-inner { width: 50%; }
  .summary-row { display: flex; justify-content: space-between; padding: 3.5px 0; }
  .s-label { font-size: 9.5px; color: #888; }
  .s-value { font-size: 9.5px; color: #1e1e1e; }
  .s-label-bold { font-size: 9.5px; font-weight: 700; color: #1e1e1e; }
  .s-value-bold { font-size: 9.5px; font-weight: 700; color: #1e1e1e; }
  .summary-vat-row {
    border-top: 1px solid #eee;
    margin-top: 4px;
    padding-top: 6px !important;
  }

  /* ── Total box ────────────────────────────────────────────── */
  .total-box {
    background: ${IOTA_GREEN};
    padding: 15px 18px;
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-label {
    font-size: 11px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .total-value { font-size: 17px; font-weight: 700; color: white; }

  .amount-words {
    font-size: 8.5px;
    color: #888;
    text-align: right;
    margin-top: 7px;
    font-style: italic;
  }

  /* ── Footer ───────────────────────────────────────────────── */
  .footer-divider { height: 1px; background: #e8e8e8; margin: 18px 0 14px; }
  .footer-row { display: flex; justify-content: space-between; }
  .footer-col { width: 48%; }
  .footer-col-right { width: 48%; text-align: right; }
  .footer-heading {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1e1e1e;
    margin-bottom: 5px;
  }
  .footer-text { font-size: 9px; color: #1e1e1e; line-height: 1.8; }
  .footer-link { font-size: 9px; color: ${IOTA_BLUE}; line-height: 1.8; }
`;

// ── Main component ────────────────────────────────────────────────────────────

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([fetchInvoice(id), getCustomers()]).then(([data, allCustomers]) => {
      if (!data) return;

      const customer = (allCustomers || []).find((c) => String(c.id) === String(data?.customerId));
      const baseAmount = data?.baseAmount || 0;

      // Build full address from address record
      let fullAddress = '';
      if (customer?.addresses) {
        const addr = customer.addresses;
        const parts = [];
        if (addr.addressLine1) parts.push(addr.addressLine1);
        if (addr.addressLine2) parts.push(addr.addressLine2);
        if (addr.city) parts.push(addr.city);
        if (addr.state && addr.state !== addr.city) parts.push(addr.state);
        if (addr.zipCode) parts.push(addr.zipCode);
        if (addr.country) parts.push(addr.country);
        fullAddress = parts.join(', ');
      } else if (customer?.customerNameOfBusiness) {
        fullAddress = `${customer.customerNameOfBusiness}, ${
          customer.customerBillingCountryCode === 'KSA'
            ? 'Saudi Arabia'
            : customer.customerBillingCountryCode || ''
        }`;
      }

      setInvoice({
        invoiceNumber: data.invoiceNumber,
        createDate: data.invoiceDate,
        dueDate: data.dueDate,
        currencyCode: data.currencyCode || 'SAR',
        invoiceTo: {
          name: customer?.customerNameEn || data.customerName || '',
          fullAddress,
          phoneNumber: customer?.addresses?.phone || customer?.addresses?.fax || '',
          vatNumber: customer?.['VAT#'] || '',
        },
        items: [
          {
            title: data.invoiceTypeName || 'Service',
            description: data.description || '',
            price: baseAmount,
          },
        ],
        subtotal: baseAmount,
        vatAmount: data.vatAmount || 0,
        vatRate: data.vatRate || 0,
        totalAmount: data.total || 0,
        discount: Math.abs(data.adjustment || 0),
        shipping: data.shippingCharge || 0,
      });
    });
  }, [id]);

  // Set page title and trigger print after invoice data is ready
  useEffect(() => {
    if (!invoice) return;
    document.title = invoice.invoiceNumber || 'IOTA Invoice';
    // Small delay so fonts/styles render before the print dialog opens
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [invoice]);

  if (!invoice) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'Inter, sans-serif',
          fontSize: 16,
          color: '#555',
        }}
      >
        Loading invoice…
      </div>
    );
  }

  const office = getOffice(invoice.currencyCode);
  const bank = office.bankDetails;
  const vatLabel = invoice.vatRate ? `VAT @ ${invoice.vatRate}%` : 'VAT';
  const amountWords = amountInWords(invoice.totalAmount, invoice.currencyCode);

  return (
    <>
      {/* ── Inject styles ── */}
      {}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ── Screen-only toolbar ── */}
      <div className="print-toolbar">
        <span>
          {invoice.invoiceNumber} — {invoice.invoiceTo.name}
        </span>
        <button className="btn-close" onClick={() => window.close()}>
          Close
        </button>
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* ── Page wrapper (adds padding on screen, zero on print) ── */}
      <div className="page-wrapper" style={{ paddingTop: '52px' }}>
        <div className="invoice-page">
          {/* Decorative circles */}
          <div className="circle-tr" />
          <div className="circle-bl" />

          <div className="content">
            {/* ── HEADER ── */}
            <div className="header-row">
              {/* logo */}
              <img src="/logo/logo-single.png" className="logo" alt="IOTA" />
              <span className="invoice-title">Invoice</span>
            </div>

            {/* Blue accent line */}
            <div className="accent-line" />

            {/* ── BILLING ROW ── */}
            <div className="billing-row">
              {/* Bill To */}
              <div className="bill-to-col">
                <div className="section-label">Bill To</div>
                <div className="customer-name">{invoice.invoiceTo.name}</div>
                {invoice.invoiceTo.fullAddress && (
                  <div className="body-text">{invoice.invoiceTo.fullAddress}</div>
                )}
                {invoice.invoiceTo.phoneNumber && (
                  <div className="body-text">{invoice.invoiceTo.phoneNumber}</div>
                )}
                {invoice.invoiceTo.vatNumber && (
                  <div className="body-text">VAT #: {invoice.invoiceTo.vatNumber}</div>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="meta-col">
                <table className="meta-table">
                  <tbody>
                    {office.vatNumber && (
                      <tr>
                        <td className="meta-label">VAT Registration #:</td>
                        <td className="meta-value">{office.vatNumber}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="meta-label">Invoice #:</td>
                      <td className="meta-value meta-bold">{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td className="meta-label">Invoice Date:</td>
                      <td className="meta-value">{fDate(invoice.createDate)}</td>
                    </tr>
                    <tr>
                      <td className="meta-label">Due Date:</td>
                      <td className="meta-value">{fDate(invoice.dueDate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="divider" />

            {/* ── LINE ITEMS TABLE ── */}
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="col-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className="item-title">{item.title}</div>
                      {item.description && <div className="item-desc">{item.description}</div>}
                    </td>
                    <td className="col-right">
                      {formatCurrency(item.price, invoice.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── SUMMARY ── */}
            <div className="summary-outer">
              <div className="summary-inner">
                <div className="summary-row">
                  <span className="s-label">Subtotal</span>
                  <span className="s-value">
                    {formatCurrency(invoice.subtotal, invoice.currencyCode)}
                  </span>
                </div>
                {invoice.discount > 0 && (
                  <div className="summary-row">
                    <span className="s-label">Discount</span>
                    <span className="s-value">
                      -{formatCurrency(invoice.discount, invoice.currencyCode)}
                    </span>
                  </div>
                )}
                {invoice.shipping > 0 && (
                  <div className="summary-row">
                    <span className="s-label">Shipping</span>
                    <span className="s-value">
                      {formatCurrency(invoice.shipping, invoice.currencyCode)}
                    </span>
                  </div>
                )}
                <div className="summary-row summary-vat-row">
                  <span className="s-label-bold">{vatLabel}</span>
                  <span className="s-value-bold">
                    {formatCurrency(invoice.vatAmount, invoice.currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── TOTAL BOX ── */}
            <div className="total-box">
              <span className="total-label">Total Amount</span>
              <span className="total-value">
                {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
              </span>
            </div>

            {amountWords && <div className="amount-words">{amountWords}</div>}

            {/* ── FOOTER ── */}
            <div className="footer-divider" />
            <div className="footer-row">
              <div className="footer-col">
                <div className="footer-heading">Bank Transfer Details</div>
                {bank?.accountName && (
                  <div className="footer-text">A/c Name: {bank.accountName}</div>
                )}
                {bank?.iban && <div className="footer-text">IBAN: {bank.iban}</div>}
                {bank?.bank && <div className="footer-text">Bank: {bank.bank}</div>}
                {bank?.city && <div className="footer-text">City: {bank.city}</div>}
              </div>
              <div className="footer-col-right">
                <div className="footer-heading">In Case of Queries</div>
                <div className="footer-text">Write to us at</div>
                <div className="footer-link">{office.email}</div>
                <div className="footer-text" style={{ marginTop: 5 }}>
                  Cite our Invoice # for reference
                  <br />
                  and better tracking.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
