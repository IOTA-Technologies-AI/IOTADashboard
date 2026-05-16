'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { fDate } from 'src/utils/format-time';
import { fetchInvoice, fetchOfficeConfigs, getCustomers } from 'src/utils/apiHelper';
import { IOTA_OFFICES } from 'src/sections/invoice/invoice-create-edit-address';

// ─────────────────────────────────────────────────────────────────────────────
// How this page works:
//   1. Fetches /public/assets/template/IOTA Invoice Template.html (pure HTML+CSS)
//   2. Fetches invoice data from the API
//   3. Replaces every {{PLACEHOLDER}} in the template with real values
//   4. Renders the filled HTML via dangerouslySetInnerHTML
//   5. Auto-opens the print dialog after 800 ms
//
// To change the invoice layout/styles, edit only:
//   next-js/public/assets/template/IOTA Invoice Template.html
// ─────────────────────────────────────────────────────────────────────────────

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}

function getOffice(currencyCode, officeList) {
  const list = officeList?.length ? officeList : IOTA_OFFICES;
  return list.find((o) => o.currency === currencyCode) || list[0];
}

// Escape user-supplied strings before inserting into HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Fill every {{PLACEHOLDER}} in the template with real invoice data
function fillTemplate(templateHtml, invoice, officeList, qrCodeBlock) {
  const office = getOffice(invoice.currencyCode, officeList);
  const bank = office.bankDetails || {};
  const qrHtml = qrCodeBlock || '';
  const vatLabel = invoice.vatRate ? `VAT @ ${invoice.vatRate}%` : 'VAT';

  const itemsRows = (invoice.items || [])
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-title">${esc(item.title)}</div>
            ${item.description ? `<div class="item-desc">${esc(item.description)}</div>` : ''}
          </td>
          <td class="col-right">${formatCurrency(item.price, invoice.currencyCode)}</td>
        </tr>`
    )
    .join('');

  const discountRow =
    invoice.discount > 0
      ? `<tr>
          <td><div class="item-title">Discount</div></td>
          <td class="col-right">-${formatCurrency(invoice.discount, invoice.currencyCode)}</td>
        </tr>`
      : '';

  const shippingRow =
    invoice.shipping > 0
      ? `<tr>
          <td><div class="item-title">Shipping</div></td>
          <td class="col-right">${formatCurrency(invoice.shipping, invoice.currencyCode)}</td>
        </tr>`
      : '';

  const metaVatRow = office.vatNumber
    ? `<div class="meta-line">VAT Registration #: ${esc(office.vatNumber)}</div>`
    : '';

  const customerVatHtml = invoice.invoiceTo.vatNumber
    ? `<div class="body-sm">VAT #: ${esc(invoice.invoiceTo.vatNumber)}</div>`
    : '';

  return templateHtml
    .split('{{INVOICE_NUMBER}}')
    .join(esc(invoice.invoiceNumber))
    .split('{{CUSTOMER_NAME}}')
    .join(esc(invoice.invoiceTo.name))
    .split('{{CUSTOMER_ADDRESS_STREET_HTML}}')
    .join(
      invoice.invoiceTo.addressStreet
        ? `<div class="body-sm">${esc(invoice.invoiceTo.addressStreet)}</div>`
        : ''
    )
    .split('{{CUSTOMER_ADDRESS_CITY}}')
    .join(esc(invoice.invoiceTo.addressCity))
    .split('{{CUSTOMER_VAT_HTML}}')
    .join(customerVatHtml)
    .split('{{META_VAT_ROW}}')
    .join(metaVatRow)
    .split('{{INVOICE_DATE}}')
    .join(esc(fDate(invoice.createDate)))
    .split('{{DUE_DATE}}')
    .join(esc(fDate(invoice.dueDate)))
    .split('{{ITEMS_ROWS}}')
    .join(itemsRows)
    .split('{{SUBTOTAL}}')
    .join(formatCurrency(invoice.subtotal, invoice.currencyCode))
    .split('{{DISCOUNT_ROW}}')
    .join(discountRow)
    .split('{{SHIPPING_ROW}}')
    .join(shippingRow)
    .split('{{VAT_LABEL}}')
    .join(esc(vatLabel))
    .split('{{VAT_AMOUNT}}')
    .join(formatCurrency(invoice.vatAmount, invoice.currencyCode))
    .split('{{TOTAL_AMOUNT}}')
    .join(formatCurrency(invoice.totalAmount, invoice.currencyCode))
    .split('{{AMOUNT_IN_WORDS}}')
    .join(esc(amountInWords(invoice.totalAmount, invoice.currencyCode)))
    .split('{{BANK_ACCOUNT_NAME}}')
    .join(esc(bank.accountName || ''))
    .split('{{BANK_IBAN}}')
    .join(esc(bank.iban || ''))
    .split('{{BANK_NAME}}')
    .join(esc(bank.bank || ''))
    .split('{{BANK_CITY}}')
    .join(esc(bank.city || ''))
    .split('{{OFFICE_EMAIL}}')
    .join(esc(office.email || ''))
    .split('{{QR_CODE_BLOCK}}')
    .join(qrHtml);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InvoicePrintPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [html, setHtml] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [liveOffices, setLiveOffices] = useState(null);
  const iframeRef = useRef(null);

  // Fetch live office configs once on mount so PDF uses up-to-date bank details
  useEffect(() => {
    fetchOfficeConfigs().then((offices) => {
      if (offices?.length) setLiveOffices(offices);
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch('/assets/template/IOTA Invoice Template.html').then((r) => r.text()),
      fetchInvoice(id),
      getCustomers(),
    ]).then(async ([templateHtml, data, allCustomers]) => {
      if (!data) return;

      const customer = (allCustomers || []).find((c) => String(c.id) === String(data?.customerId));
      const baseAmount = data?.baseAmount || 0;

      // Build structured address (street lines + city/country last line)
      let addressStreet = '';
      let addressCity = '';
      if (customer?.addresses) {
        const addr = customer.addresses;
        const streetParts = [];
        if (addr.addressLine1) streetParts.push(addr.addressLine1);
        if (addr.addressLine2) streetParts.push(addr.addressLine2);
        addressStreet = streetParts.join(', ');
        const cityParts = [];
        if (addr.city) cityParts.push(addr.city);
        if (addr.state && addr.state !== addr.city) cityParts.push(addr.state);
        if (addr.zipCode) cityParts.push(addr.zipCode);
        if (addr.country) cityParts.push(addr.country);
        addressCity = cityParts.join(', ');
      } else if (customer?.customerNameOfBusiness) {
        addressStreet = customer.customerNameOfBusiness;
        addressCity =
          customer.customerBillingCountryCode === 'KSA'
            ? 'Saudi Arabia'
            : customer.customerBillingCountryCode || '';
      }

      const invoice = {
        invoiceNumber: data.invoiceNumber,
        createDate: data.invoiceDate,
        dueDate: data.dueDate,
        currencyCode: data.currencyCode || 'SAR',
        invoiceTo: {
          name: customer?.customerNameEn || data.customerName || '',
          addressStreet,
          addressCity,
          vatNumber: customer?.['VAT#'] || '',
        },
        items: (() => {
          // Try to parse structured items stored as JSON in the description field
          if (data.description) {
            try {
              const parsed = JSON.parse(data.description);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch {
              // Not JSON — treat description as plain text for the single item
              return [
                {
                  title: data.invoiceTypeName || 'Service',
                  description: data.description,
                  price: baseAmount,
                },
              ];
            }
          }
          return [
            {
              title: data.invoiceTypeName || 'Service',
              description: '',
              price: baseAmount,
            },
          ];
        })(),
        subtotal: baseAmount,
        vatAmount: data.vatAmount || 0,
        vatRate: data.vatRate || 0,
        totalAmount: data.total || 0,
        discount: Math.abs(data.adjustment || 0),
        shipping: data.shippingCharge || 0,
        zatcaQrCode: data.zatcaQrCode || null,
      };

      setInvoiceNumber(invoice.invoiceNumber);

      // Generate QR code block (view URL QR + ZATCA QR)
      let viewQrHtml = '';
      if (data.viewToken) {
        try {
          const QRCode = await import('qrcode');
          const viewUrl = `https://docs.iotatechnologies.io/view/${data.viewToken}`;
          const qrDataUrl = await QRCode.toDataURL(viewUrl, { width: 120, margin: 1 });
          viewQrHtml = `<div style="text-align:center;">
            <img src="${qrDataUrl}" width="80" height="80" style="display:inline-block;" alt="Scan to view invoice" />
            <div style="font-size:9px;color:#888;margin-top:4px;">Scan to view invoice online</div>
          </div>`;
        } catch {
          viewQrHtml = '';
        }
      }
      const zatcaQrHtml = data.zatcaQrCode
        ? `<div style="text-align:center;">
            <img src="${data.zatcaQrCode}" width="80" height="80" style="display:inline-block;" alt="ZATCA QR" />
            <div style="font-size:9px;color:#888;margin-top:4px;">ZATCA e-Invoice QR</div>
          </div>`
        : '';
      const qrCodeBlock =
        viewQrHtml || zatcaQrHtml
          ? `<div style="display:flex;justify-content:space-between;margin-top:16px;">${viewQrHtml}${zatcaQrHtml}</div>`
          : '';
      let finalHtml = fillTemplate(templateHtml, invoice, liveOffices, qrCodeBlock);
      // In preview mode, hide the print toolbar
      if (isPreview) {
        finalHtml = finalHtml.replace(
          '</head>',
          '<style>.toolbar{display:none!important}</style></head>'
        );
      }
      setHtml(finalHtml);
    });
  }, [id, liveOffices]);

  // Write the filled HTML into the iframe's own document and print from there
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    document.title = invoiceNumber || 'IOTA Invoice';

    const iframe = iframeRef.current;

    const write = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();

      // Wait for fonts/images then print (skip in preview mode)
      if (!isPreview) {
        const doPrint = () => iframe.contentWindow?.print();
        if (iframe.contentDocument?.fonts) {
          iframe.contentDocument.fonts.ready.then(() => setTimeout(doPrint, 300));
        } else {
          setTimeout(doPrint, 800);
        }
      }
    };

    // iframe may not be interactive yet on first render
    if (iframe.contentDocument) {
      write();
    } else {
      iframe.addEventListener('load', write, { once: true });
    }
  }, [html, invoiceNumber]);

  if (!html) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'sans-serif',
          fontSize: 16,
          color: '#555',
        }}
      >
        Loading invoice…
      </div>
    );
  }

  // Render inside a hidden iframe so the template's @page rules are not
  // polluted by Next.js's own <html>/<body> wrapping.
  return (
    <iframe
      ref={iframeRef}
      title="invoice-print"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#e8e8e8',
      }}
    />
  );
}
