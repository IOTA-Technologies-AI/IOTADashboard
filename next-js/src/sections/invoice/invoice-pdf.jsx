import { useMemo } from 'react';
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
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { IOTA_OFFICES } from './invoice-create-edit-address';

// ── Number-to-words helper ────────────────────────────────────────────────────
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
};

function amountInWords(amount, currencyCode = 'SAR') {
  if (!amount || isNaN(amount)) return '';
  const whole = Math.floor(amount);
  const fraction = Math.round((amount - whole) * 100);
  const currency = CURRENCY_NAMES[currencyCode] || currencyCode;
  let words = toWords(whole) + ' ' + currency;
  if (fraction > 0) words += ' and ' + toWords(fraction) + ' Fils';
  return words + ' Only.';
}

// ── Font ──────────────────────────────────────────────────────────────────────

Font.register({
  family: 'Roboto',
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 }],
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
        // ── Header ──
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        },
        invoiceTitle: {
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 8,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        logo: { width: 44, height: 44 },
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
          marginBottom: 28,
        },
        billCol: { width: '50%' },
        metaCol: { width: '48%', alignItems: 'flex-end' },
        billLabel: {
          fontSize: 8,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          marginBottom: 4,
        },
        customerName: {
          fontSize: 11,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 3,
        },
        bodySm: { fontSize: 9, color: '#1a1a1a', lineHeight: 1.65, marginBottom: 1 },
        metaLine: {
          fontSize: 9,
          color: '#1a1a1a',
          lineHeight: 1.85,
          marginBottom: 1,
          textAlign: 'right',
        },
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
        thDesc: { flex: 1, paddingVertical: 10, paddingHorizontal: 14 },
        thAmount: {
          width: 110,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          alignItems: 'flex-end',
        },
        thText: {
          fontSize: 8,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        // Item rows
        itemRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#d8e4ff',
          borderBottomStyle: 'solid',
        },
        tdDesc: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
        tdAmount: {
          width: 110,
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: 14,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          alignItems: 'flex-end',
        },
        itemTitle: { fontSize: 9, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 },
        itemDesc: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.5 },
        itemAmount: { fontSize: 9, color: '#1a1a1a' },
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
          width: 110,
          paddingVertical: 7,
          paddingHorizontal: 14,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          alignItems: 'flex-end',
          justifyContent: 'center',
        },
        vatMain: { fontSize: 9, fontWeight: 700, color: '#1a1a1a' },
        vatSub: { fontSize: 8.5, color: '#1a1a1a' },
        // ── Total row — compact, white bg ──
        totalRow: {
          flexDirection: 'row',
          minHeight: 42,
          alignItems: 'center',
        },
        tdTotalDesc: { flex: 1, paddingVertical: 10, paddingHorizontal: 14 },
        tdTotalAmount: {
          width: 110,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderLeftWidth: 1.5,
          borderLeftColor: '#0166ff',
          borderLeftStyle: 'solid',
          alignItems: 'flex-end',
          justifyContent: 'center',
        },
        totalLabel: {
          fontSize: 11,
          fontWeight: 700,
          color: '#1a1a1a',
          textTransform: 'uppercase',
        },
        totalValue: { fontSize: 13, fontWeight: 700, color: '#1a1a1a' },
        // ── Amount in words ──
        amountWords: { fontSize: 8, color: '#666666', textAlign: 'right', marginTop: 8 },
        // ── Footer ──
        footerDivider: {
          height: 1,
          backgroundColor: '#e0e0e0',
          marginTop: 20,
          marginBottom: 14,
        },
        footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
        footerCol: { width: '48%' },
        footerColRight: { width: '48%', alignItems: 'flex-end' },
        footerHeading: {
          fontSize: 7.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#1a1a1a',
          marginBottom: 5,
        },
        footerText: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.85 },
        footerLink: { fontSize: 8.5, color: '#0166ff', lineHeight: 1.85 },
        footerTextRight: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.85, textAlign: 'right' },
      }),
    []
  );

// ── Public PDF document (exported for direct use) ─────────────────────────────

export function InvoicePdfDocument({ invoice, currentStatus, offices }) {
  const {
    items,
    dueDate,
    discount,
    shipping,
    invoiceTo,
    createDate,
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
  const vatLabel = vatRate ? `VAT @ ${vatRate}%` : 'VAT';
  const amountWords = amountInWords(totalAmount, currencyCode);
  const fmt = (v) => fCurrency(v, { currency: currencyCode });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          {/* ── HEADER: title left, logo right ── */}
          <View style={styles.header}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Image source="/logo/logo-single.png" style={styles.logo} />
          </View>

          {/* Blue accent line */}
          <View style={styles.accent} />

          {/* ── BILLING ── */}
          <View style={styles.billingRow}>
            {/* Bill To */}
            <View style={styles.billCol}>
              <Text style={styles.billLabel}>Bill To</Text>
              <Text style={styles.customerName}>{invoiceTo?.name}</Text>
              {invoiceTo?.addressStreet ? (
                <Text style={styles.bodySm}>{invoiceTo.addressStreet}</Text>
              ) : null}
              {invoiceTo?.addressCity ? (
                <Text style={styles.bodySm}>{invoiceTo.addressCity}</Text>
              ) : null}
              {invoiceTo?.vatNumber ? (
                <Text style={styles.bodySm}>VAT #: {invoiceTo.vatNumber}</Text>
              ) : null}
            </View>

            {/* Invoice meta */}
            <View style={styles.metaCol}>
              {office.vatNumber ? (
                <Text style={styles.metaLine}>VAT Registration #: {office.vatNumber}</Text>
              ) : null}
              <Text style={styles.metaLine}>Invoice #: {invoiceNumber}</Text>
              <Text style={styles.metaLine}>Invoice Date: {fDate(createDate)}</Text>
              <Text style={styles.metaLine}>Due Date: {fDate(dueDate)}</Text>
            </View>
          </View>

          {/* ── ITEMS TABLE ── */}
          <View style={styles.tableOuter}>
            {/* Header row */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.thDesc}>
                <Text style={styles.thText}>Description</Text>
              </View>
              <View style={styles.thAmount}>
                <Text style={styles.thText}>Amount</Text>
              </View>
            </View>

            {/* Line items */}
            {(items || []).map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.tdDesc}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={styles.tdAmount}>
                  <Text style={styles.itemAmount}>{fmt(item.price ?? item.total)}</Text>
                </View>
              </View>
            ))}

            {/* Discount row */}
            {discount > 0 ? (
              <View style={styles.itemRow}>
                <View style={styles.tdDesc}>
                  <Text style={styles.itemTitle}>Discount</Text>
                </View>
                <View style={styles.tdAmount}>
                  <Text style={styles.itemAmount}>-{fmt(discount)}</Text>
                </View>
              </View>
            ) : null}

            {/* Shipping row */}
            {shipping > 0 ? (
              <View style={styles.itemRow}>
                <View style={styles.tdDesc}>
                  <Text style={styles.itemTitle}>Shipping</Text>
                </View>
                <View style={styles.tdAmount}>
                  <Text style={styles.itemAmount}>{fmt(shipping)}</Text>
                </View>
              </View>
            ) : null}

            {/* VAT row */}
            <View style={styles.vatRow}>
              <View style={styles.tdVatDesc}>
                <Text style={styles.vatMain}>VAT</Text>
                <Text style={styles.vatSub}>{vatLabel}</Text>
              </View>
              <View style={styles.tdVatAmount}>
                <Text style={styles.itemAmount}>{fmt(vatAmount)}</Text>
              </View>
            </View>

            {/* Total row */}
            <View style={styles.totalRow}>
              <View style={styles.tdTotalDesc}>
                <Text style={styles.totalLabel}>Total Amount</Text>
              </View>
              <View style={styles.tdTotalAmount}>
                <Text style={styles.totalValue}>{fmt(totalAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Amount in words */}
          {amountWords ? <Text style={styles.amountWords}>{amountWords}</Text> : null}

          {/* ── FOOTER ── */}
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <View style={styles.footerCol}>
              <Text style={styles.footerHeading}>Bank Transfer Details</Text>
              <Text style={styles.footerText}>
                A/c Name: {bank.accountName || 'IOTA Information Technology Services'}
              </Text>
              {bank.iban ? <Text style={styles.footerText}>IBAN: {bank.iban}</Text> : null}
              {bank.bank ? <Text style={styles.footerText}>Bank: {bank.bank}</Text> : null}
              {bank.city ? <Text style={styles.footerText}>City: {bank.city}</Text> : null}
            </View>
            <View style={styles.footerColRight}>
              <Text style={styles.footerHeading}>In Case of Queries</Text>
              <Text style={styles.footerTextRight}>Write to us at</Text>
              <Text style={styles.footerLink}>
                {office.email || 'accounts@iotatechnologies.ai'}
              </Text>
              <Text style={styles.footerTextRight}>
                Cite our Invoice # for reference and better tracking.
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ── Download link wrapper ─────────────────────────────────────────────────────

export function InvoicePDFDownload({ invoice, currentStatus }) {
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
      document={<InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />}
      fileName={invoice?.invoiceNumber || 'invoice'}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => renderButton(loading)}
    </PDFDownloadLink>
  );
}

// ── Viewer wrapper ────────────────────────────────────────────────────────────

export function InvoicePDFViewer({ invoice, currentStatus }) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />
    </PDFViewer>
  );
}
