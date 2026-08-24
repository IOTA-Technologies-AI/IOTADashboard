'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { fDate } from 'src/utils/format-time';
import { fetchInvoice, getCustomers, fetchOfficeConfigs } from 'src/utils/apiHelper';
import {
  hijriDate,
  vatRateLabel,
  INVOICE_LABELS,
  amountInWordsAr,
  amountInWordsEn,
  paymentTermsLabel,
} from 'src/utils/invoice-i18n';

import { IOTA_OFFICES } from 'src/sections/invoice/invoice-create-edit-address';

// ─────────────────────────────────────────────────────────────────────────────
// How this page works:
//   1. Fetches /public/assets/template/IOTA Invoice Template.html (pure HTML+CSS)
//   2. Fetches invoice data from the API
//   3. Replaces every {{PLACEHOLDER}} in the template with real values
//   4. Renders the filled HTML via dangerouslySetInnerHTML
//   5. Auto-opens the print dialog once fonts and images have loaded
//
// To change the invoice layout/styles, edit only:
//   next-js/public/assets/template/IOTA Invoice Template.html
//
// The template is bilingual (English / Arabic). Static Arabic labels live in the
// template itself; Arabic values (customer name, seller name, amount in words)
// are filled from here. Arabic wording is mirrored in src/utils/invoice-i18n.js,
// which src/sections/invoice/invoice-pdf.jsx uses for the emailed PDF.
// ─────────────────────────────────────────────────────────────────────────────

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
  const vatLabel = vatRateLabel(invoice.vatRate);

  // Line amount is quantity x unit price, so the column sums to the subtotal.
  // Items saved before quantity was persisted have none — they count as 1.
  const itemsRows = (invoice.items || [])
    .map((item) => {
      const qty = Number(item.quantity ?? 1) || 1;
      const unitPrice = Number(item.price ?? 0) || 0;
      return `
        <tr>
          <td>
            <div class="item-title">${esc(item.title)}</div>
            ${item.titleAr ? `<div class="item-title-ar">${esc(item.titleAr)}</div>` : ''}
            ${item.description ? `<div class="item-desc">${esc(item.description)}</div>` : ''}
            ${item.descriptionAr ? `<div class="item-desc-ar">${esc(item.descriptionAr)}</div>` : ''}
          </td>
          <td class="col-right">${qty}</td>
          <td class="col-right">${formatCurrency(unitPrice, invoice.currencyCode)}</td>
          <td class="col-right">${formatCurrency(qty * unitPrice, invoice.currencyCode)}</td>
        </tr>`;
    })
    .join('');

  const discountRow =
    invoice.discount > 0
      ? `<tr class="sum-row">
          <td colspan="3">
            <div class="bi">
              <span class="sum-label en">Discount</span>
              <span class="sum-label ar">الخصم</span>
            </div>
          </td>
          <td class="col-right">-${formatCurrency(invoice.discount, invoice.currencyCode)}</td>
        </tr>`
      : '';

  const shippingRow =
    invoice.shipping > 0
      ? `<tr class="sum-row">
          <td colspan="3">
            <div class="bi">
              <span class="sum-label en">Shipping</span>
              <span class="sum-label ar">الشحن</span>
            </div>
          </td>
          <td class="col-right">${formatCurrency(invoice.shipping, invoice.currencyCode)}</td>
        </tr>`
      : '';

  const metaVatRow = office.vatNumber
    ? `<div class="meta-line bi">
        <span class="en">VAT Registration #: ${esc(office.vatNumber)}</span>
        <span class="ar">الرقم الضريبي للمورد</span>
      </div>`
    : '';

  // The seller's address is mandatory on a KSA tax invoice; the CR number is
  // printed alongside the VAT registration, as on the Finance samples.
  const sellerAddressHtml = office.fullAddress
    ? `<div class="seller-line">${esc(office.fullAddress)}</div>`
    : '';
  const sellerAddressArHtml = office.fullAddressAr
    ? `<div class="seller-line-ar">${esc(office.fullAddressAr)}</div>`
    : '';
  const sellerPhoneHtml = office.phoneNumber
    ? `<div class="seller-line">${INVOICE_LABELS.phone.en}: ${esc(office.phoneNumber)} &nbsp;·&nbsp; ${esc(office.email || '')}</div>`
    : '';
  const metaCrRow = office.registrationNumber
    ? `<div class="meta-line bi">
        <span class="en">${INVOICE_LABELS.crNumber.en}: ${esc(office.registrationNumber)}</span>
        <span class="ar">${INVOICE_LABELS.crNumber.ar}</span>
      </div>`
    : '';

  // Hijri (Umm al-Qura) issue date — the row carries the date in both scripts
  const hijri = hijriDate(invoice.createDate);
  const hijriRow = hijri
    ? `<div class="meta-line bi">
        <span class="en">${INVOICE_LABELS.invoiceDateHijri.en}: ${esc(hijri.en)}</span>
        <span class="ar">${esc(hijri.ar)}</span>
      </div>`
    : '';

  // Payment terms, read off the invoice's own dates
  const terms = paymentTermsLabel(invoice.createDate, invoice.dueDate);
  const paymentTermsRow = terms
    ? `<div class="meta-line bi">
        <span class="en">${INVOICE_LABELS.paymentTerms.en}: ${esc(terms.en)}</span>
        <span class="ar">${INVOICE_LABELS.paymentTerms.ar}</span>
      </div>`
    : '';

  // PO / reference number — only printed when the invoice carries one
  const poRow = invoice.poNumber
    ? `<div class="meta-line bi">
        <span class="en">${INVOICE_LABELS.poNumber.en}: ${esc(invoice.poNumber)}</span>
        <span class="ar">${INVOICE_LABELS.poNumber.ar}</span>
      </div>`
    : '';

  // Arabic bank name / city, printed under their English lines when configured.
  // The account name and IBAN stay in Latin script — they must match the bank's
  // own record.
  const bankNameArHtml = bank.bankAr
    ? `<div class="footer-value-ar">${esc(bank.bankAr)}</div>`
    : '';
  const bankCityArHtml = bank.cityAr
    ? `<div class="footer-value-ar">${esc(bank.cityAr)}</div>`
    : '';

  // Seller identity sits in the header next to the logo. The Arabic company
  // name is required on a KSA tax invoice; the office config can override it.
  const companyNameAr = office.nameAr || INVOICE_LABELS.companyName.ar;

  const customerVatHtml = invoice.invoiceTo.vatNumber
    ? `<div class="body-sm bi">
        <span class="en">VAT #: ${esc(invoice.invoiceTo.vatNumber)}</span>
        <span class="ar">الرقم الضريبي للعميل</span>
      </div>`
    : '';

  const customerNameArHtml = invoice.invoiceTo.nameAr
    ? `<div class="customer-name-ar">${esc(invoice.invoiceTo.nameAr)}</div>`
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
    .split('{{CUSTOMER_NAME_AR_HTML}}')
    .join(customerNameArHtml)
    .split('{{CUSTOMER_VAT_HTML}}')
    .join(customerVatHtml)
    .split('{{META_VAT_ROW}}')
    .join(metaVatRow)
    .split('{{META_CR_ROW}}')
    .join(metaCrRow)
    .split('{{PO_ROW}}')
    .join(poRow)
    .split('{{HIJRI_DATE_ROW}}')
    .join(hijriRow)
    .split('{{PAYMENT_TERMS_ROW}}')
    .join(paymentTermsRow)
    .split('{{SELLER_ADDRESS_HTML}}')
    .join(sellerAddressHtml)
    .split('{{SELLER_ADDRESS_AR_HTML}}')
    .join(sellerAddressArHtml)
    .split('{{SELLER_PHONE_HTML}}')
    .join(sellerPhoneHtml)
    .split('{{BANK_NAME_AR_HTML}}')
    .join(bankNameArHtml)
    .split('{{BANK_CITY_AR_HTML}}')
    .join(bankCityArHtml)
    .split('{{COMPANY_NAME_AR}}')
    .join(esc(companyNameAr))
    .split('{{INVOICE_DATE}}')
    .join(esc(fDate(invoice.createDate)))
    .split('{{SUPPLY_DATE}}')
    .join(esc(fDate(invoice.supplyDate || invoice.createDate)))
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
    .join(esc(vatLabel.en))
    .split('{{VAT_LABEL_AR}}')
    .join(esc(vatLabel.ar))
    .split('{{VAT_AMOUNT}}')
    .join(formatCurrency(invoice.vatAmount, invoice.currencyCode))
    .split('{{TOTAL_AMOUNT}}')
    .join(formatCurrency(invoice.totalAmount, invoice.currencyCode))
    .split('{{AMOUNT_IN_WORDS}}')
    .join(esc(amountInWordsEn(invoice.totalAmount, invoice.currencyCode)))
    .split('{{AMOUNT_IN_WORDS_AR}}')
    .join(esc(amountInWordsAr(invoice.totalAmount, invoice.currencyCode)))
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
  const iframeRef = useRef(null);
  // The iframe document must be written exactly once. Rewriting it after
  // print() has been called wipes the page the print dialog is rendering,
  // which is what produced blank saved PDFs.
  const writtenRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    // The office configs are fetched alongside everything else rather than in
    // their own effect: arriving later they would rebuild the HTML a second
    // time, mid-print. They also carry the live bank details, so the first
    // (and only) build must already have them.
    Promise.all([
      fetch('/assets/template/IOTA Invoice Template.html').then((r) => r.text()),
      fetchInvoice(id),
      getCustomers(),
      fetchOfficeConfigs().catch(() => null),
    ]).then(async ([templateHtml, data, allCustomers, offices]) => {
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
        // Falls back to the issue date when no separate supply date is stored
        supplyDate: data.supplyDate || null,
        poNumber: data.poNumber || '',
        dueDate: data.dueDate,
        currencyCode: data.currencyCode || 'SAR',
        invoiceTo: {
          name: customer?.customerNameEn || data.customerName || '',
          nameAr: customer?.customerNameAr || '',
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
            <div class="qr-caption">Scan to view invoice online</div>
            <div class="qr-caption-ar">امسح الرمز لعرض الفاتورة إلكترونياً</div>
          </div>`;
        } catch {
          viewQrHtml = '';
        }
      }
      const zatcaQrHtml = data.zatcaQrCode
        ? `<div style="text-align:center;">
            <img src="${data.zatcaQrCode}" width="80" height="80" style="display:inline-block;" alt="ZATCA QR" />
            <div class="qr-caption">ZATCA e-Invoice QR</div>
            <div class="qr-caption-ar">رمز الفاتورة الإلكترونية — هيئة الزكاة والضريبة والجمارك</div>
          </div>`
        : '';
      const qrCodeBlock =
        viewQrHtml || zatcaQrHtml
          ? `<div style="display:flex;justify-content:space-between;margin-top:16px;">${viewQrHtml}${zatcaQrHtml}</div>`
          : '';
      let finalHtml = fillTemplate(
        templateHtml,
        invoice,
        offices?.length ? offices : null,
        qrCodeBlock
      );
      // In preview mode, hide the print toolbar
      if (isPreview) {
        finalHtml = finalHtml.replace(
          '</head>',
          '<style>.toolbar{display:none!important}</style></head>'
        );
      }
      setHtml(finalHtml);
    });
  }, [id, isPreview]);

  // Write the filled HTML into the iframe's own document and print from there
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    // Guard against a second write: React's dev double-invoke, or any later
    // render, would call doc.open() on the document the print dialog is
    // rendering and hand the user a blank PDF.
    if (writtenRef.current) return;
    writtenRef.current = true;

    document.title = invoiceNumber || 'IOTA Invoice';

    const iframe = iframeRef.current;

    const write = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();

      if (isPreview) return;

      // Print only once the page has everything it draws with. fonts.ready on
      // its own is not enough — the logo and the QR codes decode separately,
      // and printing ahead of them drops them from the output.
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
        // One more frame so the final layout is committed before the snapshot.
        setTimeout(() => iframe.contentWindow?.print(), 250);
      });
    };

    // iframe may not be interactive yet on first render
    if (iframe.contentDocument) {
      write();
    } else {
      iframe.addEventListener('load', write, { once: true });
    }
  }, [html, invoiceNumber, isPreview]);

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
