'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { fDate } from 'src/utils/format-time';
import { fetchOfficeConfigs, fetchProformaInvoice } from 'src/utils/apiHelper';

import { IOTA_OFFICES } from 'src/sections/invoice/invoice-create-edit-address';

// ─────────────────────────────────────────────────────────────────────────────
// How this page works — same shape as src/app/invoice-print/[id]/page.jsx:
//   1. Fetches /public/assets/template/IOTA Proforma Invoice Template.html
//   2. Fetches the proforma from the API
//   3. Replaces every {{PLACEHOLDER}} with real values
//   4. Writes the filled HTML into an iframe's own document
//   5. Auto-opens the print dialog once fonts and images have loaded
//
// The template is three A4 pages: a cover, the detail page, and a fixed back
// cover. Only the middle page carries data.
//
// To change the layout/styles, edit only:
//   next-js/public/assets/template/IOTA Proforma Invoice Template.html
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount, currencyCode = 'SAR') {
  if (amount == null || Number.isNaN(Number(amount))) return '';
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

// Escape, then turn newlines into <br> — for the stored multi-line address and
// instruction blocks, which are plain text.
function escMultiline(str) {
  return esc(str).replace(/\n/g, '<br>');
}

// "AUGUST 2026" — the month strip on the cover page
function coverMonth(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

// Line items are stored as the same JSON array the invoice keeps in its
// description column. Anything that is not JSON is treated as a single item's
// free text, which is how older invoices stored it.
function parseItems(proforma) {
  const raw = proforma.description;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return [{ title: '', description: raw, quantity: 1, price: proforma.baseAmount ?? 0 }];
    }
  }
  return [{ title: '', description: '', quantity: 1, price: proforma.baseAmount ?? 0 }];
}

// The Customer ID printed on page 2 is the document reference typed out on a
// phone keypad: IOTA, then the issuing office country, then the first six
// letters of the customer name. RIYAD BANK out of the Riyadh office gives
// 4682-572-749232.
const KEYPAD_LETTERS = [
  ['ABC', 2], ['DEF', 3], ['GHI', 4], ['JKL', 5],
  ['MNO', 6], ['PQRS', 7], ['TUV', 8], ['WXYZ', 9],
];

function keypadDigits(text, maxLetters) {
  const letters = String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
  const taken = maxLetters ? letters.slice(0, maxLetters) : letters;
  return taken
    .split('')
    .map((ch) => {
      const group = KEYPAD_LETTERS.find(([chars]) => chars.includes(ch));
      return group ? group[1] : '';
    })
    .join('');
}

// Six letters is what the reference carries; shorter names simply encode short.
const CUSTOMER_ID_LETTERS = 6;

function buildCustomerId(customerName, office) {
  const customer = keypadDigits(customerName, CUSTOMER_ID_LETTERS);
  if (!customer) return '';
  return [keypadDigits('IOTA'), keypadDigits(office?.country), customer]
    .filter(Boolean)
    .join('-');
}

// Office addresses are stored as one comma-separated string. The document
// prints them as a postal block, so pack the comma-separated parts into lines
// of at most MAX_ADDRESS_LINE characters. Any newlines already in the stored
// address are honoured as deliberate breaks and left alone.
const MAX_ADDRESS_LINE = 34;

function wrapAddress(address) {
  if (!address) return '';
  return String(address)
    .split('\n')
    .map((segment) => {
      const parts = segment
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const lines = [];
      parts.forEach((part) => {
        const current = lines[lines.length - 1];
        if (current && `${current}, ${part}`.length <= MAX_ADDRESS_LINE) {
          lines[lines.length - 1] = `${current}, ${part}`;
        } else {
          lines.push(part);
        }
      });
      return lines.join('\n');
    })
    .join('\n');
}

// Fill every {{PLACEHOLDER}} in the template with real proforma data
function fillTemplate(templateHtml, proforma, officeList) {
  const currency = proforma.currencyCode || 'SAR';
  const office = getOffice(currency, officeList);

  // Line amount is quantity x unit price, so the column sums to the subtotal.
  // Items saved before quantity was persisted have none — they count as 1.
  // A proforma sent as a pure order carries the items and quantities only. An
  // individual line can also be unpriced on an otherwise priced document: its
  // price is stored as null, and its money cells print empty.
  const hidePricing = Boolean(proforma.hidePricing);

  const itemsHead = hidePricing
    ? `<thead>
            <tr>
              <th class="col-desc" style="width: 78%;">DESCRIPTION</th>
              <th style="width: 22%;">QTY</th>
            </tr>
          </thead>`
    : `<thead>
            <tr>
              <th class="col-desc" style="width: 46%;">DESCRIPTION</th>
              <th style="width: 12%;">QTY</th>
              <th style="width: 21%;">PRICE</th>
              <th style="width: 21%;">TOTAL</th>
            </tr>
          </thead>`;

  const itemsRows = parseItems(proforma)
    .map((item) => {
      const qty = Number(item.quantity ?? 1) || 1;
      const unitPrice = item.price == null || item.price === '' ? null : Number(item.price);
      const titleHtml = item.title ? `<div class="item-title">${esc(item.title)}</div>` : '';
      const descHtml = item.description
        ? `<div class="item-desc">${escMultiline(item.description)}</div>`
        : '';
      const moneyCells =
        hidePricing || unitPrice === null || Number.isNaN(unitPrice)
          ? hidePricing
            ? ''
            : `
          <td class="col-center"></td>
          <td class="col-center"></td>`
          : `
          <td class="col-center">${formatCurrency(unitPrice, currency)}</td>
          <td class="col-center">${formatCurrency(qty * unitPrice, currency)}</td>`;
      return `
        <tr>
          <td class="col-desc">${titleHtml}${descHtml}</td>
          <td class="col-center">${qty}</td>${moneyCells}
        </tr>`;
    })
    .join('');

  // The brand line ("LOGRYTHM" on the sample) names the vendor product range.
  // It cannot be derived from the invoice, so the cover simply omits the line
  // until someone fills it in on the proforma.
  const brandTitleHtml = proforma.brandTitle
    ? `<div class="cover-brand-title">${esc(proforma.brandTitle)}</div>`
    : '';

  // Derived from the customer name rather than the stored customerRefId, so the
  // printed reference always agrees with the customer named on the document.
  const customerId = buildCustomerId(proforma.customerName, office);
  const customerRefRow = customerId
    ? `<div><b>Customer ID:</b> ${esc(customerId)}</div>`
    : '';

  // The CUSTOMER panel: attention line, name, then the postal address
  const customerBlockHtml = [
    proforma.customerAttention ? `Kind Attn.: ${esc(proforma.customerAttention)},` : '',
    esc(proforma.customerName),
    escMultiline(proforma.customerAddress),
  ]
    .filter(Boolean)
    .join('<br>');

  const sellerAddressHtml = [
    escMultiline(wrapAddress(office.fullAddress)),
    office.phoneNumber ? esc(office.phoneNumber) : '',
  ]
    .filter(Boolean)
    .join('<br>');

  // Who the supplier should contact with questions about this document
  const footerNoteHtml = `If you have any questions concerning this proforma invoice, please contact <b>${esc(
    proforma.contactEmail || office.email || ''
  )}</b>.`;

  const discount = Math.abs(Number(proforma.adjustment ?? 0)) || 0;
  const discountRow =
    discount > 0
      ? `<div class="total-line">
          <span class="label">DISCOUNT:</span>
          <span class="value">-${formatCurrency(discount, currency)}</span>
        </div>`
      : '';

  const shipping = Number(proforma.shippingCharge ?? 0) || 0;
  const shippingRow =
    shipping > 0
      ? `<div class="total-line">
          <span class="label">SHIPPING:</span>
          <span class="value">${formatCurrency(shipping, currency)}</span>
        </div>`
      : '';

  const vatRate = Number(proforma.vatRate ?? 0) || 0;
  const vatLabel = vatRate > 0 ? `VAT @ ${vatRate}%` : 'VAT';

  const totalsBlock = hidePricing
    ? ''
    : `<div class="totals">
            <div class="total-line">
              <span class="label">SUBTOTAL:</span>
              <span class="value">${formatCurrency(proforma.baseAmount ?? 0, currency)}</span>
            </div>
            ${discountRow}
            ${shippingRow}
            <div class="total-line">
              <span class="label">${esc(vatLabel)}</span>
              <span class="value">${formatCurrency(proforma.vatAmount ?? 0, currency)}</span>
            </div>
            <div class="total-line grand">
              <span class="label">TOTAL:</span>
              <span class="value">${formatCurrency(proforma.total ?? 0, currency)}</span>
            </div>
          </div>`;

  return templateHtml
    .split('{{PROFORMA_NUMBER}}')
    .join(esc(proforma.proformaNumber))
    .split('{{DOCUMENT_ID}}')
    .join(esc(proforma.documentId))
    .split('{{DOCUMENT_MONTH}}')
    .join(esc(coverMonth(proforma.issueDate || proforma.createdAt)))
    .split('{{BRAND_TITLE_HTML}}')
    .join(brandTitleHtml)
    .split('{{DOCUMENT_TITLE}}')
    .join(esc(proforma.documentTitle || 'PROFORMA INVOICE'))
    .split('{{PREPARED_BY_TEAM}}')
    .join(esc(proforma.preparedByTeam || 'Engagements Team'))
    .split('{{PREPARED_BY_COMPANY}}')
    .join(esc(proforma.preparedByCompany || 'IOTA Technologies'))
    .split('{{PREPARED_FOR_NAME}}')
    .join(esc(proforma.preparedForName))
    .split('{{PREPARED_FOR_COMPANY}}')
    .join(esc(proforma.preparedForCompany || proforma.customerName))
    .split('{{CONTACT_EMAIL}}')
    .join(esc(proforma.contactEmail || office.email || ''))
    .split('{{ISSUE_DATE}}')
    .join(esc(fDate(proforma.issueDate || proforma.createdAt)))
    .split('{{VALID_UNTIL}}')
    .join(esc(fDate(proforma.validUntil)))
    .split('{{CUSTOMER_REF_ROW}}')
    .join(customerRefRow)
    .split('{{SELLER_ADDRESS_HTML}}')
    .join(sellerAddressHtml)
    .split('{{CUSTOMER_BLOCK_HTML}}')
    .join(customerBlockHtml)
    .split('{{CUSTOMER_NAME}}')
    .join(esc(proforma.customerName))
    .split('{{SPECIAL_INSTRUCTIONS}}')
    .join(escMultiline(proforma.specialInstructions))
    .split('{{ITEMS_HEAD}}')
    .join(itemsHead)
    .split('{{ITEMS_ROWS}}')
    .join(itemsRows)
    .split('{{FOOTER_NOTE_HTML}}')
    .join(footerNoteHtml)
    .split('{{TOTALS_BLOCK}}')
    .join(totalsBlock);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProformaPrintPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [html, setHtml] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [proformaNumber, setProformaNumber] = useState('');
  const iframeRef = useRef(null);
  // The iframe document must be written exactly once. Rewriting it after
  // print() has been called wipes the page the print dialog is rendering,
  // which hands the user a blank PDF.
  const writtenRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    // Everything is fetched in one go so the HTML is built exactly once — a
    // second build arriving mid-print is what produces empty saved PDFs.
    Promise.all([
      fetch('/assets/template/IOTA Proforma Invoice Template.html').then((r) => r.text()),
      fetchProformaInvoice(id),
      fetchOfficeConfigs().catch(() => null),
    ]).then(([templateHtml, proforma, offices]) => {
      if (!proforma) {
        setNotFound(true);
        return;
      }

      setProformaNumber(proforma.proformaNumber || '');

      let finalHtml = fillTemplate(templateHtml, proforma, offices?.length ? offices : null);
      // In preview mode, hide the print toolbar
      if (isPreview) {
        finalHtml = finalHtml.replace(
          '</head>',
          '<style>.toolbar{display:none!important}.page-wrapper{padding-top:20px}</style></head>'
        );
      }
      setHtml(finalHtml);
    });
  }, [id, isPreview]);

  // Write the filled HTML into the iframe's own document and print from there
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    if (writtenRef.current) return;
    writtenRef.current = true;

    document.title = proformaNumber || 'IOTA Proforma Invoice';

    const iframe = iframeRef.current;

    const write = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();

      if (isPreview) return;

      // Print only once the page has everything it draws with. fonts.ready on
      // its own is not enough — the logo marks decode separately, and printing
      // ahead of them drops them from the output.
      const imagesReady = Promise.all(
        Array.from(doc.images || []).map(
          (img) =>
            img.complete ||
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
        )
      );
      const assetsReady = Promise.all([doc.fonts ? doc.fonts.ready : null, imagesReady]);
      // A font or image that never resolves must not swallow the print dialog.
      const deadline = new Promise((resolve) => setTimeout(resolve, 4000));

      Promise.race([assetsReady, deadline]).then(() => {
        setTimeout(() => iframe.contentWindow?.print(), 250);
      });
    };

    // iframe may not be interactive yet on first render
    if (iframe.contentDocument) {
      write();
    } else {
      iframe.addEventListener('load', write, { once: true });
    }
  }, [html, proformaNumber, isPreview]);

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
        {notFound ? 'Proforma invoice not found.' : 'Loading proforma invoice…'}
      </div>
    );
  }

  // Render inside an iframe so the template's @page rules are not polluted by
  // Next.js's own <html>/<body> wrapping.
  return (
    <iframe
      ref={iframeRef}
      title="proforma-print"
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
