import { useMemo, useState, useEffect } from 'react';
import {
  Page,
  Text,
  View,
  Font,
  Image,
  Document,
  PDFViewer,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import {
  hijriDate,
  vatRateLabel,
  INVOICE_LABELS,
  amountInWordsAr,
  amountInWordsEn,
  paymentTermsLabel,
} from 'src/utils/invoice-i18n';

import { Iconify } from 'src/components/iconify';

import { IOTA_OFFICES } from './invoice-create-edit-address';

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual (English / Arabic) invoice PDF — this is the document attached to
// the customer email when an invoice is issued (see invoice-toolbar.jsx).
//
// It mirrors, layout for layout, the print template at
//   public/assets/template/IOTA Invoice Template.html
// Every label is English-left / Arabic-right on the same line. Wording comes
// from src/utils/invoice-i18n.js — keep the HTML template in step with it.
// ─────────────────────────────────────────────────────────────────────────────

const L = INVOICE_LABELS;

// ── Fonts ─────────────────────────────────────────────────────────────────────

Font.register({
  family: 'Roboto',
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 }],
});

// Arabic face — fontkit applies the Arabic shaper, so text is joined and
// right-to-left ordered automatically; no manual reversing anywhere.
//
// Cairo, not Noto Naskh Arabic: react-pdf's subsetter drops glyphs from the
// Noto Arabic faces, so words come out truncated in the generated PDF
// ("فاتورة ضريبية" → "فاتورة ضر"). Cairo embeds cleanly. The print template
// (public/assets/template/IOTA Invoice Template.html) uses the same face so
// the printed and emailed invoices look identical.
Font.register({
  family: 'Cairo',
  fonts: [{ src: '/fonts/Cairo-Regular.ttf' }, { src: '/fonts/Cairo-Bold.ttf', fontWeight: 700 }],
});

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = () =>
  useMemo(
    () =>
      StyleSheet.create({
        page: {
          fontFamily: 'Roboto',
          backgroundColor: '#ffffff',
          fontSize: 9,
        },
        content: {
          flex: 1,
          paddingTop: 40,
          paddingBottom: 36,
          paddingHorizontal: 48,
          flexDirection: 'column',
        },
        // ── Bilingual line: English left, Arabic right ──
        biRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        // English takes whatever width the Arabic label leaves and wraps within
        // it; the Arabic label always keeps its natural width. Without this a
        // long value (a 15-digit VAT number) overlaps the Arabic text.
        biEn: { flexGrow: 1, flexBasis: 0, flexShrink: 1, paddingRight: 6 },
        biAr: { flexShrink: 0 },
        ar: { fontFamily: 'Cairo', textAlign: 'right' },
        // ── Header: logo + company name left, title centred ──
        // Equal-width flanks keep the title centred on the page, not on the
        // space the logo happens to leave.
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        },
        headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
        companyBlock: { flexShrink: 1 },
        headerCenter: { alignItems: 'center' },
        companyName: {
          fontSize: 8.25, // 11px in the template
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.3,
        },
        companyNameAr: {
          fontFamily: 'Cairo',
          fontSize: 7.5, // 10px in the template
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.5,
        },
        invoiceTitle: {
          fontSize: 17.25, // 23px in the template
          fontWeight: 700,
          letterSpacing: 3.75,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          textAlign: 'center',
        },
        invoiceTitleAr: {
          fontFamily: 'Cairo',
          fontSize: 10.125, // 13.5px in the template
          fontWeight: 700,
          color: '#1a1a1a',
          marginTop: 3,
          textAlign: 'center',
        },
        logo: { width: 36, height: 36, marginRight: 7.5 }, // 48px + 10px gap
        // Seller address / tel under the company name — ZATCA requires the
        // seller's address on a standard tax invoice.
        sellerLine: { fontSize: 6, color: '#444444', lineHeight: 1.45 },
        sellerLineAr: {
          fontFamily: 'Cairo',
          fontSize: 6,
          color: '#444444',
          lineHeight: 1.5,
        },
        // ── Blue accent line ──
        accent: {
          height: 1.5,
          backgroundColor: '#0166ff',
          marginBottom: 22,
        },
        // ── Billing row ──
        billingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 26,
        },
        billCol: { width: '48%' },
        metaCol: { width: '48%' },
        billLabel: {
          fontSize: 8,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        billLabelAr: {
          fontFamily: 'Cairo',
          fontSize: 8.5,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        billLabelRow: { marginBottom: 4 },
        customerName: {
          fontSize: 11,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 2,
        },
        customerNameAr: {
          fontFamily: 'Cairo',
          fontSize: 11,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 3,
        },
        bodySm: { fontSize: 9, color: '#1a1a1a', lineHeight: 1.65, marginBottom: 1 },
        bodySmAr: { fontFamily: 'Cairo', fontSize: 8.5, color: '#1a1a1a' },
        // Meta lines
        metaRow: { marginBottom: 3 },
        metaLine: { fontSize: 8.5, color: '#1a1a1a' },
        metaLineAr: { fontFamily: 'Cairo', fontSize: 8, color: '#1a1a1a' },
        metaSeller: { fontWeight: 700 },
        // ── Items table — outer blue border, flex:1 fills remaining page height ──
        tableOuter: {
          flex: 1,
          borderWidth: 1.5,
          borderColor: '#0166ff',
          borderStyle: 'solid',
          marginBottom: 8,
          flexDirection: 'column',
        },
        // Table header row
        tableHeaderRow: {
          flexDirection: 'row',
          borderBottomWidth: 1.5,
          borderBottomColor: '#0166ff',
          borderBottomStyle: 'solid',
        },
        thDesc: { flex: 1, paddingVertical: 9, paddingHorizontal: 14 },
        thQty: {
          width: 38,
          paddingVertical: 9,
          paddingHorizontal: 6,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        thUnit: {
          width: 76,
          paddingVertical: 9,
          paddingHorizontal: 8,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        thAmount: {
          width: 120,
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        thText: {
          fontSize: 8,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        thTextRight: { textAlign: 'right', width: '100%' },
        thTextAr: {
          fontFamily: 'Cairo',
          fontSize: 8.5,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        // Item rows
        itemRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#d8e4ff',
          borderBottomStyle: 'solid',
        },
        tdDesc: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
        tdQty: {
          width: 38,
          paddingVertical: 12,
          paddingHorizontal: 6,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        tdUnit: {
          width: 76,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        tdAmount: {
          width: 120,
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: 12,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
        },
        itemTitle: { fontSize: 9, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 },
        itemTitleAr: {
          fontFamily: 'Cairo',
          fontSize: 9,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        itemDesc: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.5 },
        itemDescAr: {
          fontFamily: 'Cairo',
          fontSize: 8.5,
          color: '#1a1a1a',
          textAlign: 'right',
          lineHeight: 1.6,
        },
        // ── Summary rows (subtotal / discount / shipping): label fills the
        // description + qty + unit-price width, value sits in the amount column ──
        sumRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#d8e4ff',
          borderBottomStyle: 'solid',
          alignItems: 'center',
        },
        tdSumLabel: { flex: 1, paddingVertical: 7, paddingHorizontal: 14 },
        tdSumAmount: {
          width: 120,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          justifyContent: 'center',
        },
        sumLabel: { fontSize: 9, fontWeight: 700, color: '#1a1a1a' },
        sumLabelAr: {
          fontFamily: 'Cairo',
          fontSize: 9,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        itemAmount: { fontSize: 9, color: '#1a1a1a', width: '100%', textAlign: 'right' },
        // ── VAT row — compact ──
        vatRow: {
          flexDirection: 'row',
          borderBottomWidth: 1.5,
          borderBottomColor: '#0166ff',
          borderBottomStyle: 'solid',
          minHeight: 38,
          alignItems: 'center',
        },
        tdVatDesc: { flex: 1, paddingVertical: 7, paddingHorizontal: 14 },
        tdVatAmount: {
          width: 120,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          justifyContent: 'center',
        },
        vatMain: { fontSize: 9, fontWeight: 700, color: '#1a1a1a' },
        vatMainAr: {
          fontFamily: 'Cairo',
          fontSize: 9,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        vatSub: { fontSize: 8.5, color: '#1a1a1a' },
        vatSubAr: { fontFamily: 'Cairo', fontSize: 8.5, color: '#1a1a1a', textAlign: 'right' },
        // ── Total row — compact, white bg ──
        totalRow: {
          flexDirection: 'row',
          minHeight: 42,
          alignItems: 'center',
        },
        tdTotalDesc: { flex: 1, paddingVertical: 9, paddingHorizontal: 14 },
        tdTotalAmount: {
          width: 120,
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          justifyContent: 'center',
        },
        totalLabel: {
          fontSize: 11,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        totalLabelAr: {
          fontFamily: 'Cairo',
          fontSize: 10,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        totalValue: { fontSize: 13, fontWeight: 700, color: '#1a1a1a', width: '100%', textAlign: 'right' },
        // ── Amount in words ──
        amountWordsBlock: { marginTop: 8 },
        amountWords: { fontSize: 8, color: '#666666', textAlign: 'right' },
        amountWordsAr: {
          fontFamily: 'Cairo',
          fontSize: 8,
          color: '#666666',
          textAlign: 'right',
          lineHeight: 1.6,
          marginTop: 1,
        },
        // ── Footer ──
        footerDivider: {
          height: 1,
          backgroundColor: '#e0e0e0',
          marginTop: 18,
          marginBottom: 12,
        },
        footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
        footerCol: { width: '48%' },
        footerColRight: { width: '48%' },
        footerHeading: {
          fontSize: 7.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#1a1a1a',
        },
        footerHeadingAr: {
          fontFamily: 'Cairo',
          fontSize: 8,
          fontWeight: 700,
          color: '#1a1a1a',
          textAlign: 'right',
        },
        footerHeadingRow: { marginBottom: 4 },
        footerText: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.8 },
        footerTextAr: {
          fontFamily: 'Cairo',
          fontSize: 8,
          color: '#333333',
          textAlign: 'right',
          lineHeight: 1.8,
        },
        footerLink: { fontSize: 8.5, color: '#0166ff', lineHeight: 1.8 },
        footerValueAr: {
          fontFamily: 'Cairo',
          fontSize: 8,
          color: '#333333',
          lineHeight: 1.5,
        },
        // ── QR code block ──
        qrBlock: { marginTop: 12, alignItems: 'center' },
        qrImage: { width: 64, height: 64 },
        qrLabel: { fontSize: 7, color: '#888888', marginTop: 3, textAlign: 'center' },
        qrLabelAr: {
          fontFamily: 'Cairo',
          fontSize: 7,
          color: '#888888',
          textAlign: 'center',
          lineHeight: 1.5,
        },
      }),
    []
  );

// ── Public PDF document (exported for direct use) ─────────────────────────────

export function InvoicePdfDocument({ invoice, currentStatus, offices, viewQrBase64, zatcaQrCode }) {
  const {
    items,
    dueDate,
    discount,
    shipping,
    invoiceTo,
    createDate,
    supplyDate,
    poNumber,
    subtotal,
    totalAmount,
    invoiceNumber,
    vatRate,
    vatAmount,
    currencyCode,
  } = invoice ?? {};

  const styles = useStyles();
  const officeList = offices?.length ? offices : IOTA_OFFICES;
  const office = officeList.find((o) => o.currency === currencyCode) || officeList[0];
  const bank = office.bankDetails || {};
  const vatLabel = vatRateLabel(vatRate);
  // Office config can override the Arabic company name without a deploy
  const companyNameAr = office.nameAr || L.companyName.ar;
  const wordsEn = amountInWordsEn(totalAmount, currencyCode);
  const wordsAr = amountInWordsAr(totalAmount, currencyCode);
  // Line amount is quantity x unit price. Items saved before quantity was
  // persisted carry none — they count as 1, which is what they were priced at.
  const lineQty = (item) => Number(item.quantity ?? 1) || 1;
  const lineUnit = (item) => Number(item.price ?? item.total ?? 0) || 0;
  // Total excluding VAT — ZATCA-mandatory. Falls back to the line sum when the
  // invoice carries no stored base amount.
  // Hijri (Umm al-Qura) issue date and payment terms — both derived, so no
  // extra field has to be captured for them
  const hijri = hijriDate(createDate);
  const terms = paymentTermsLabel(createDate, dueDate);
  const taxableAmount =
    subtotal != null
      ? subtotal
      : (items || []).reduce((sum, item) => sum + lineQty(item) * lineUnit(item), 0);
  // Amounts print as "SAR 48,428.80" (ISO code), not the ﷼ symbol that
  // fCurrency emits: U+FDFC is absent from Roboto *and* is a right-to-left
  // character, so react-pdf dropped the glyph and re-ordered the digits around
  // it ("SAR 30,878.22" came out as "0,878.22"). The ISO code also matches what
  // the print template and the public viewer show.
  const fmt = (v) => {
    if (v == null || Number.isNaN(Number(v))) return '';
    const amount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v));
    return `${currencyCode || 'SAR'} ${amount}`;
  };

  /** One bilingual line: English on the left, Arabic on the right. */
  const BiRow = ({ en, ar, enStyle, arStyle, style }) => (
    <View style={[styles.biRow, style]}>
      <Text style={[styles.biEn, enStyle]}>{en}</Text>
      {ar ? <Text style={[styles.biAr, arStyle]}>{ar}</Text> : null}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          {/* ── HEADER: logo + company name left, bilingual title centred ── */}
          <View style={styles.header}>
            <View style={styles.headerSide}>
              <Image source="/logo/logo-single.png" style={styles.logo} />
              <View style={styles.companyBlock}>
                <Text style={styles.companyName}>{L.companyName.en}</Text>
                <Text style={styles.companyNameAr}>{companyNameAr}</Text>
                {office.fullAddress ? (
                  <Text style={styles.sellerLine}>{office.fullAddress}</Text>
                ) : null}
                {office.fullAddressAr ? (
                  <Text style={styles.sellerLineAr}>{office.fullAddressAr}</Text>
                ) : null}
                {office.phoneNumber ? (
                  <Text style={styles.sellerLine}>
                    {L.phone.en}: {office.phoneNumber}
                    {office.email ? `  ·  ${office.email}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.invoiceTitle}>{L.invoiceTitle.en}</Text>
              <Text style={styles.invoiceTitleAr}>{L.invoiceTitle.ar}</Text>
            </View>
            <View style={styles.headerSide} />
          </View>

          {/* Blue accent line */}
          <View style={styles.accent} />

          {/* ── BILLING ── */}
          <View style={styles.billingRow}>
            {/* Bill To / تفاصيل العميل */}
            <View style={styles.billCol}>
              <BiRow
                en={L.billTo.en}
                ar={L.billTo.ar}
                enStyle={styles.billLabel}
                arStyle={styles.billLabelAr}
                style={styles.billLabelRow}
              />
              <Text style={styles.customerName}>{invoiceTo?.name}</Text>
              {invoiceTo?.nameAr ? (
                <Text style={styles.customerNameAr}>{invoiceTo.nameAr}</Text>
              ) : null}
              {invoiceTo?.addressStreet ? (
                <Text style={styles.bodySm}>{invoiceTo.addressStreet}</Text>
              ) : null}
              {invoiceTo?.addressCity ? (
                <Text style={styles.bodySm}>{invoiceTo.addressCity}</Text>
              ) : null}
              {invoiceTo?.vatNumber ? (
                <BiRow
                  en={`${L.buyerVatNumber.en}: ${invoiceTo.vatNumber}`}
                  ar={L.buyerVatNumber.ar}
                  enStyle={styles.bodySm}
                  arStyle={styles.bodySmAr}
                />
              ) : null}
            </View>

            {/* Seller identity + invoice meta */}
            <View style={styles.metaCol}>
              {office.registrationNumber ? (
                <BiRow
                  en={`${L.crNumber.en}: ${office.registrationNumber}`}
                  ar={L.crNumber.ar}
                  enStyle={styles.metaLine}
                  arStyle={styles.metaLineAr}
                  style={styles.metaRow}
                />
              ) : null}
              {office.vatNumber ? (
                <BiRow
                  en={`${L.sellerVatNumber.en}: ${office.vatNumber}`}
                  ar={L.sellerVatNumber.ar}
                  enStyle={styles.metaLine}
                  arStyle={styles.metaLineAr}
                  style={styles.metaRow}
                />
              ) : null}
              <BiRow
                en={`${L.invoiceNumber.en}: ${invoiceNumber}`}
                ar={L.invoiceNumber.ar}
                enStyle={styles.metaLine}
                arStyle={styles.metaLineAr}
                style={styles.metaRow}
              />
              <BiRow
                en={`${L.invoiceDate.en}: ${fDate(createDate)}`}
                ar={L.invoiceDate.ar}
                enStyle={styles.metaLine}
                arStyle={styles.metaLineAr}
                style={styles.metaRow}
              />
              {hijri ? (
                <BiRow
                  en={`${L.invoiceDateHijri.en}: ${hijri.en}`}
                  ar={hijri.ar}
                  enStyle={styles.metaLine}
                  arStyle={styles.metaLineAr}
                  style={styles.metaRow}
                />
              ) : null}
              <BiRow
                en={`${L.supplyDate.en}: ${fDate(supplyDate || createDate)}`}
                ar={L.supplyDate.ar}
                enStyle={styles.metaLine}
                arStyle={styles.metaLineAr}
                style={styles.metaRow}
              />
              {poNumber ? (
                <BiRow
                  en={`${L.poNumber.en}: ${poNumber}`}
                  ar={L.poNumber.ar}
                  enStyle={styles.metaLine}
                  arStyle={styles.metaLineAr}
                  style={styles.metaRow}
                />
              ) : null}
              <BiRow
                en={`${L.dueDate.en}: ${fDate(dueDate)}`}
                ar={L.dueDate.ar}
                enStyle={styles.metaLine}
                arStyle={styles.metaLineAr}
                style={styles.metaRow}
              />
              {terms ? (
                <BiRow
                  en={`${L.paymentTerms.en}: ${terms.en}`}
                  ar={L.paymentTerms.ar}
                  enStyle={styles.metaLine}
                  arStyle={styles.metaLineAr}
                  style={styles.metaRow}
                />
              ) : null}
            </View>
          </View>

          {/* ── ITEMS TABLE ── */}
          <View style={styles.tableOuter}>
            {/* Header row */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.thDesc}>
                <BiRow
                  en={L.description.en}
                  ar={L.description.ar}
                  enStyle={styles.thText}
                  arStyle={styles.thTextAr}
                />
              </View>
              {/* The numeric columns are narrow, so their headers stack */}
              <View style={styles.thQty}>
                <Text style={[styles.thText, styles.thTextRight]}>{L.quantity.en}</Text>
                <Text style={styles.thTextAr}>{L.quantity.ar}</Text>
              </View>
              <View style={styles.thUnit}>
                <Text style={[styles.thText, styles.thTextRight]}>{L.unitPrice.en}</Text>
                <Text style={styles.thTextAr}>{L.unitPrice.ar}</Text>
              </View>
              <View style={styles.thAmount}>
                <Text style={[styles.thText, styles.thTextRight]}>{L.amount.en}</Text>
                <Text style={styles.thTextAr}>{L.amount.ar}</Text>
              </View>
            </View>

            {/* Line items */}
            {(items || []).map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.tdDesc}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.titleAr ? <Text style={styles.itemTitleAr}>{item.titleAr}</Text> : null}
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                  {item.descriptionAr ? (
                    <Text style={styles.itemDescAr}>{item.descriptionAr}</Text>
                  ) : null}
                </View>
                <View style={styles.tdQty}>
                  <Text style={styles.itemAmount}>{lineQty(item)}</Text>
                </View>
                <View style={styles.tdUnit}>
                  <Text style={styles.itemAmount}>{fmt(lineUnit(item))}</Text>
                </View>
                <View style={styles.tdAmount}>
                  <Text style={styles.itemAmount}>{fmt(lineQty(item) * lineUnit(item))}</Text>
                </View>
              </View>
            ))}

            {/* Total excluding VAT — ZATCA-mandatory taxable amount */}
            <View style={styles.sumRow}>
              <View style={styles.tdSumLabel}>
                <BiRow
                  en={L.subtotal.en}
                  ar={L.subtotal.ar}
                  enStyle={styles.sumLabel}
                  arStyle={styles.sumLabelAr}
                />
              </View>
              <View style={styles.tdSumAmount}>
                <Text style={styles.itemAmount}>{fmt(taxableAmount)}</Text>
              </View>
            </View>

            {/* Discount row */}
            {discount > 0 ? (
              <View style={styles.sumRow}>
                <View style={styles.tdSumLabel}>
                  <BiRow
                    en={L.discount.en}
                    ar={L.discount.ar}
                    enStyle={styles.sumLabel}
                    arStyle={styles.sumLabelAr}
                  />
                </View>
                <View style={styles.tdSumAmount}>
                  <Text style={styles.itemAmount}>-{fmt(discount)}</Text>
                </View>
              </View>
            ) : null}

            {/* Shipping row */}
            {shipping > 0 ? (
              <View style={styles.sumRow}>
                <View style={styles.tdSumLabel}>
                  <BiRow
                    en={L.shipping.en}
                    ar={L.shipping.ar}
                    enStyle={styles.sumLabel}
                    arStyle={styles.sumLabelAr}
                  />
                </View>
                <View style={styles.tdSumAmount}>
                  <Text style={styles.itemAmount}>{fmt(shipping)}</Text>
                </View>
              </View>
            ) : null}

            {/* VAT row */}
            <View style={styles.vatRow}>
              <View style={styles.tdVatDesc}>
                <BiRow
                  en={L.vat.en}
                  ar={L.vat.ar}
                  enStyle={styles.vatMain}
                  arStyle={styles.vatMainAr}
                />
                <BiRow
                  en={vatLabel.en}
                  ar={vatLabel.ar}
                  enStyle={styles.vatSub}
                  arStyle={styles.vatSubAr}
                />
              </View>
              <View style={styles.tdVatAmount}>
                <Text style={styles.itemAmount}>{fmt(vatAmount)}</Text>
              </View>
            </View>

            {/* Total row */}
            <View style={styles.totalRow}>
              <View style={styles.tdTotalDesc}>
                <BiRow
                  en={L.totalAmount.en}
                  ar={L.totalAmount.ar}
                  enStyle={styles.totalLabel}
                  arStyle={styles.totalLabelAr}
                />
              </View>
              <View style={styles.tdTotalAmount}>
                <Text style={styles.totalValue}>{fmt(totalAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Amount in words — English then Arabic */}
          {wordsEn ? (
            <View style={styles.amountWordsBlock}>
              <Text style={styles.amountWords}>
                {L.amountInWords.en}: {wordsEn}
              </Text>
              {wordsAr ? (
                <Text style={styles.amountWordsAr}>
                  {L.amountInWords.ar}: {wordsAr}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* ── FOOTER ── */}
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <View style={styles.footerCol}>
              <BiRow
                en={L.bankDetails.en}
                ar={L.bankDetails.ar}
                enStyle={styles.footerHeading}
                arStyle={styles.footerHeadingAr}
                style={styles.footerHeadingRow}
              />
              <BiRow
                en={`${L.accountName.en}: ${bank.accountName || 'IOTA Information Technology Services'}`}
                ar={L.accountName.ar}
                enStyle={styles.footerText}
                arStyle={styles.footerTextAr}
              />
              {bank.iban ? (
                <BiRow
                  en={`${L.iban.en}: ${bank.iban}`}
                  ar={L.iban.ar}
                  enStyle={styles.footerText}
                  arStyle={styles.footerTextAr}
                />
              ) : null}
              {bank.bank ? (
                <BiRow
                  en={`${L.bankName.en}: ${bank.bank}`}
                  ar={L.bankName.ar}
                  enStyle={styles.footerText}
                  arStyle={styles.footerTextAr}
                />
              ) : null}
              {bank.bankAr ? <Text style={styles.footerValueAr}>{bank.bankAr}</Text> : null}
              {bank.city ? (
                <BiRow
                  en={`${L.bankCity.en}: ${bank.city}`}
                  ar={L.bankCity.ar}
                  enStyle={styles.footerText}
                  arStyle={styles.footerTextAr}
                />
              ) : null}
              {bank.cityAr ? <Text style={styles.footerValueAr}>{bank.cityAr}</Text> : null}
            </View>
            <View style={styles.footerColRight}>
              <BiRow
                en={L.queries.en}
                ar={L.queries.ar}
                enStyle={styles.footerHeading}
                arStyle={styles.footerHeadingAr}
                style={styles.footerHeadingRow}
              />
              <BiRow
                en={L.writeToUs.en}
                ar={L.writeToUs.ar}
                enStyle={styles.footerText}
                arStyle={styles.footerTextAr}
              />
              <Text style={styles.footerLink}>
                {office.email || 'accounts@iotatechnologies.ai'}
              </Text>
              <Text style={styles.footerText}>{L.citeInvoice.en}</Text>
              <Text style={styles.footerTextAr}>{L.citeInvoice.ar}</Text>
            </View>
          </View>

          {/* QR codes row */}
          {viewQrBase64 || zatcaQrCode ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              {viewQrBase64 ? (
                <View style={styles.qrBlock}>
                  <Image src={viewQrBase64} style={styles.qrImage} />
                  <Text style={styles.qrLabel}>{L.viewOnlineQr.en}</Text>
                  <Text style={styles.qrLabelAr}>{L.viewOnlineQr.ar}</Text>
                </View>
              ) : (
                <View />
              )}
              {zatcaQrCode ? (
                <View style={styles.qrBlock}>
                  <Image src={zatcaQrCode} style={styles.qrImage} />
                  <Text style={styles.qrLabel}>{L.zatcaQr.en}</Text>
                  <Text style={styles.qrLabelAr}>{L.zatcaQr.ar}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

// ── Download link wrapper ─────────────────────────────────────────────────────

export function InvoicePDFDownload({ invoice, currentStatus, offices }) {
  const [viewQrBase64, setViewQrBase64] = useState(null);

  useEffect(() => {
    const token = invoice?.viewToken;
    if (!token) return;
    const viewUrl = `https://docs.iotatechnologies.io/view/${token}`;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(viewUrl, { width: 160, margin: 1 })
        .then(setViewQrBase64)
        .catch(() => {});
    });
  }, [invoice?.viewToken]);

  const renderButton = (loading) => (
    <Tooltip title="Download">
      <IconButton>
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <Iconify icon="eva:cloud-download-fill" />
        )}
      </IconButton>
    </Tooltip>
  );

  return (
    <PDFDownloadLink
      document={
        <InvoicePdfDocument
          invoice={invoice}
          currentStatus={currentStatus}
          offices={offices}
          viewQrBase64={viewQrBase64}
          zatcaQrCode={invoice?.zatcaQrCode || null}
        />
      }
      fileName={invoice?.invoiceNumber || 'invoice'}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => renderButton(loading)}
    </PDFDownloadLink>
  );
}

// ── Viewer wrapper ────────────────────────────────────────────────────────────

export function InvoicePDFViewer({ invoice, currentStatus, offices }) {
  const [viewQrBase64, setViewQrBase64] = useState(null);

  useEffect(() => {
    const token = invoice?.viewToken;
    if (!token) return;
    const viewUrl = `https://docs.iotatechnologies.io/view/${token}`;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(viewUrl, { width: 160, margin: 1 })
        .then(setViewQrBase64)
        .catch(() => {});
    });
  }, [invoice?.viewToken]);

  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <InvoicePdfDocument
        invoice={invoice}
        currentStatus={currentStatus}
        offices={offices}
        viewQrBase64={viewQrBase64}
        zatcaQrCode={invoice?.zatcaQrCode || null}
      />
    </PDFViewer>
  );
}
