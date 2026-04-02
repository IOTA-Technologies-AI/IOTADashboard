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

// ── Brand colours ─────────────────────────────────────────────────────────────
const IOTA_BLUE = '#0166ff';
const IOTA_GREEN = '#013927';
const IOTA_DARK = '#1e1e1e';
const IOTA_GRAY = '#888888';
const IOTA_LIGHT = '#f5f5f5';
const WHITE = '#ffffff';

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
          backgroundColor: WHITE,
          fontSize: 9,
          lineHeight: 1.5,
          position: 'relative',
        },
        // Decorative circles (absolute, behind content)
        circleTopRight: {
          position: 'absolute',
          top: -70,
          right: -70,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: IOTA_BLUE,
          opacity: 0.1,
        },
        circleBottomLeft: {
          position: 'absolute',
          bottom: -70,
          left: -70,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: IOTA_BLUE,
          opacity: 0.1,
        },
        // Page padding wrapper
        content: {
          paddingTop: 38,
          paddingBottom: 32,
          paddingHorizontal: 42,
        },
        // ── Header ──
        headerRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        },
        logo: {
          width: 50,
          height: 50,
        },
        invoiceTitle: {
          fontSize: 26,
          fontWeight: 700,
          color: IOTA_DARK,
          letterSpacing: 7,
        },
        accentLine: {
          height: 2,
          backgroundColor: IOTA_BLUE,
          marginBottom: 18,
        },
        // ── Billing row ──
        billingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 18,
        },
        billToCol: { width: '50%' },
        metaCol: { width: '47%', alignItems: 'flex-end' },
        sectionLabel: {
          fontSize: 8,
          fontWeight: 700,
          color: IOTA_BLUE,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 4,
        },
        customerName: {
          fontSize: 11,
          fontWeight: 700,
          color: IOTA_DARK,
          marginBottom: 2,
        },
        bodyText: {
          fontSize: 9,
          color: IOTA_DARK,
          marginBottom: 1,
        },
        metaRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginBottom: 3,
        },
        metaLabel: {
          fontSize: 9,
          fontWeight: 700,
          color: IOTA_DARK,
          marginRight: 6,
        },
        metaValue: {
          fontSize: 9,
          color: IOTA_DARK,
          minWidth: 110,
          textAlign: 'right',
        },
        divider: {
          height: 1,
          backgroundColor: IOTA_BLUE,
          opacity: 0.3,
          marginVertical: 10,
        },
        // ── Table ──
        tableHeaderRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: IOTA_BLUE,
          paddingBottom: 6,
          marginBottom: 0,
        },
        colDesc: { flex: 1 },
        colAmount: { width: 110, alignItems: 'flex-end' },
        tableHeaderText: {
          fontSize: 8,
          fontWeight: 700,
          color: IOTA_DARK,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        tableRow: {
          flexDirection: 'row',
          paddingVertical: 9,
          borderBottomWidth: 1,
          borderBottomColor: '#eeeeee',
          alignItems: 'flex-start',
        },
        itemTitle: {
          fontSize: 10,
          fontWeight: 700,
          color: IOTA_DARK,
          marginBottom: 2,
        },
        itemDesc: {
          fontSize: 8.5,
          color: IOTA_GRAY,
        },
        itemAmount: {
          fontSize: 10,
          color: IOTA_DARK,
          textAlign: 'right',
        },
        // ── Summary ──
        summaryOuter: {
          alignItems: 'flex-end',
          marginTop: 8,
        },
        summaryInner: {
          width: '52%',
        },
        summaryRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 3,
        },
        summaryLabel: {
          fontSize: 9,
          color: IOTA_GRAY,
        },
        summaryValue: {
          fontSize: 9,
          color: IOTA_DARK,
        },
        summaryLabelBold: {
          fontSize: 9,
          fontWeight: 700,
          color: IOTA_DARK,
        },
        summaryValueBold: {
          fontSize: 9,
          fontWeight: 700,
          color: IOTA_DARK,
        },
        // ── Total box ──
        totalBox: {
          backgroundColor: IOTA_GREEN,
          paddingVertical: 14,
          paddingHorizontal: 18,
          marginTop: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        totalLabel: {
          fontSize: 11,
          fontWeight: 700,
          color: WHITE,
          textTransform: 'uppercase',
          letterSpacing: 2,
        },
        totalValue: {
          fontSize: 15,
          fontWeight: 700,
          color: WHITE,
        },
        amountWords: {
          fontSize: 8,
          color: IOTA_GRAY,
          textAlign: 'right',
          marginTop: 6,
        },
        // ── Footer ──
        footerDivider: {
          height: 1,
          backgroundColor: '#eeeeee',
          marginTop: 18,
          marginBottom: 14,
        },
        footerRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        footerCol: { width: '48%' },
        footerColRight: { width: '48%', alignItems: 'flex-end' },
        footerHeading: {
          fontSize: 8,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: IOTA_DARK,
          marginBottom: 5,
        },
        footerText: {
          fontSize: 8.5,
          color: IOTA_DARK,
          lineHeight: 1.7,
        },
        footerTextRight: {
          fontSize: 8.5,
          color: IOTA_DARK,
          lineHeight: 1.7,
          textAlign: 'right',
        },
        footerLink: {
          fontSize: 8.5,
          color: IOTA_BLUE,
        },
      }),
    []
  );

// ── Public PDF document (exported for direct use) ─────────────────────────────

export function InvoicePdfDocument({ invoice, currentStatus }) {
  const {
    items,
    dueDate,
    discount,
    shipping,
    subtotal,
    invoiceTo,
    createDate,
    totalAmount,
    invoiceFrom,
    invoiceNumber,
    vatRate,
    vatAmount,
    currencyCode,
  } = invoice ?? {};

  const styles = useStyles();

  const vatLabel = vatRate ? `VAT @ ${vatRate}%` : 'VAT';
  const amountWords = amountInWords(totalAmount, currencyCode);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Decorative background circles */}
        <View style={styles.circleTopRight} fixed />
        <View style={styles.circleBottomLeft} fixed />

        <View style={styles.content}>
          {/* ── HEADER ── */}
          <View style={styles.headerRow}>
            <Image source="/logo/logo-single.png" style={styles.logo} />
            <Text style={styles.invoiceTitle}>INVOICE</Text>
          </View>

          {/* Blue accent line */}
          <View style={styles.accentLine} />

          {/* ── BILLING INFO ── */}
          <View style={styles.billingRow}>
            {/* Bill To */}
            <View style={styles.billToCol}>
              <Text style={styles.sectionLabel}>Bill To</Text>
              <Text style={styles.customerName}>{invoiceTo?.name}</Text>
              {invoiceTo?.fullAddress ? (
                <Text style={styles.bodyText}>{invoiceTo.fullAddress}</Text>
              ) : null}
              {invoiceTo?.phoneNumber ? (
                <Text style={styles.bodyText}>{invoiceTo.phoneNumber}</Text>
              ) : null}
              {invoiceTo?.vatNumber ? (
                <Text style={styles.bodyText}>VAT #: {invoiceTo.vatNumber}</Text>
              ) : null}
            </View>

            {/* Invoice meta */}
            <View style={styles.metaCol}>
              {invoiceFrom?.vatNumber ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>VAT Registration #:</Text>
                  <Text style={styles.metaValue}>{invoiceFrom.vatNumber}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice #:</Text>
                <Text style={[styles.metaValue, { fontWeight: 700 }]}>{invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Date:</Text>
                <Text style={styles.metaValue}>{fDate(createDate)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date:</Text>
                <Text style={styles.metaValue}>{fDate(dueDate)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── LINE ITEMS TABLE ── */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colDesc}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Amount</Text>
            </View>
          </View>

          {(items || []).map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
              </View>
              <View style={styles.colAmount}>
                <Text style={styles.itemAmount}>
                  {fCurrency(item.price ?? item.total, currencyCode)}
                </Text>
              </View>
            </View>
          ))}

          {/* ── SUMMARY ── */}
          <View style={styles.summaryOuter}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{fCurrency(subtotal, currencyCode)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>-{fCurrency(discount, currencyCode)}</Text>
                </View>
              )}
              {shipping > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={styles.summaryValue}>{fCurrency(shipping, currencyCode)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>{vatLabel}</Text>
                <Text style={styles.summaryValueBold}>{fCurrency(vatAmount, currencyCode)}</Text>
              </View>
            </View>
          </View>

          {/* ── TOTAL BOX ── */}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{fCurrency(totalAmount, currencyCode)}</Text>
          </View>

          {amountWords ? <Text style={styles.amountWords}>{amountWords}</Text> : null}

          {/* ── FOOTER ── */}
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            {/* Bank details */}
            <View style={styles.footerCol}>
              <Text style={styles.footerHeading}>Bank Transfer Details</Text>
              <Text style={styles.footerText}>A/c Name: IOTA Information Technology Services</Text>
              <Text style={styles.footerText}>IBAN: AE480260001015933487201</Text>
              <Text style={styles.footerText}>Bank: Emirates NBD</Text>
              <Text style={styles.footerText}>City: Dubai, United Arab Emirates</Text>
            </View>
            {/* Queries */}
            <View style={styles.footerColRight}>
              <Text style={styles.footerHeading}>In Case of Queries</Text>
              <Text style={styles.footerTextRight}>Write to us at</Text>
              <Text style={styles.footerLink}>accounts@iotatechnologies.ai</Text>
              <Text style={[styles.footerTextRight, { marginTop: 3 }]}>
                Cite our Invoice # for reference{'\n'}and better tracking.
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
