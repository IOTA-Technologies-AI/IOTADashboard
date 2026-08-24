import { Page, Text, View, Font, Image, Document, StyleSheet } from '@react-pdf/renderer';

import { fDate } from 'src/utils/format-time';

// ─────────────────────────────────────────────────────────────────────────────
// Proforma invoice PDF — the document attached to the supplier email when a
// proforma is dispatched (see proforma-toolbar.jsx).
//
// It mirrors, page for page, the print template at
//   public/assets/template/IOTA Proforma Invoice Template.html
// Keep the two in step whenever the layout changes.
//
// The halftone arcs the HTML draws with CSS radial-gradients have no @react-pdf
// equivalent, so the cover and back pages here use the flat brand colours
// instead. Everything that carries data is identical.
// ─────────────────────────────────────────────────────────────────────────────

Font.register({
  family: 'Roboto',
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 }],
});

const GREEN = '#0d3b2e';
const GREEN_SOFT = '#16443a';
const BORDER = '#a8cabd';

const styles = StyleSheet.create({
  // ── Page 1: cover ──
  cover: {
    fontFamily: 'Roboto',
    backgroundColor: '#e6f8f2',
    paddingTop: 68,
    paddingHorizontal: 57,
    paddingBottom: 62,
    color: GREEN,
  },
  coverHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 26, height: 34, objectFit: 'contain', marginRight: 8 },
  brandName: { fontSize: 10, fontWeight: 700, letterSpacing: 0.6 },
  brandSub: { fontSize: 8.5, letterSpacing: 0.6 },
  docId: { fontSize: 9, textAlign: 'right' },
  docMonth: { fontSize: 9, fontWeight: 700, textAlign: 'right', marginTop: 2 },

  coverTitleBlock: { marginTop: 130 },
  coverTitle: { fontSize: 31, fontWeight: 700, lineHeight: 1.15 },
  coverCustomer: { fontSize: 18, marginTop: 4, color: GREEN_SOFT },

  coverParties: { flexDirection: 'row', marginTop: 74 },
  partyCol: { width: '50%' },
  partyLabel: { fontSize: 9.5, marginBottom: 5 },
  partyName: { fontSize: 9.5, fontWeight: 700, marginBottom: 4 },
  partyOrg: { fontSize: 9.5 },

  coverContact: { position: 'absolute', left: 57, bottom: 62 },
  coverContactLabel: { fontSize: 9.5, marginBottom: 7 },
  coverContactEmail: { fontSize: 9.5, fontWeight: 700 },

  // ── Page 2: details ──
  details: {
    fontFamily: 'Roboto',
    backgroundColor: '#f7faf8',
    paddingTop: 51,
    paddingHorizontal: 45,
    paddingBottom: 40,
    color: GREEN,
  },
  docHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docNumber: { fontSize: 19, color: GREEN },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  metaLine: { fontSize: 8.5, lineHeight: 1.7 },
  metaLineRight: { fontSize: 8.5, lineHeight: 1.7, textAlign: 'right' },
  bold: { fontWeight: 700 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700 },

  partyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  customerBlock: { fontSize: 8.5, lineHeight: 1.65, maxWidth: 230 },
  instructionsBlock: { fontSize: 8.5, lineHeight: 1.65, maxWidth: 210, textAlign: 'right' },

  table: { marginTop: 22, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` },
  tr: { flexDirection: 'row' },
  th: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.4,
    padding: 8,
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    textAlign: 'center',
  },
  td: {
    fontSize: 8,
    padding: 8,
    lineHeight: 1.5,
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    color: GREEN_SOFT,
  },
  colDesc: { width: '46%', textAlign: 'left' },
  colQty: { width: '12%', textAlign: 'center' },
  colMoney: { width: '21%', textAlign: 'center' },

  footRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  footNote: { fontSize: 8.5, lineHeight: 1.6, maxWidth: 230 },
  totals: { width: 210 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 8.5, fontWeight: 700, letterSpacing: 0.3 },
  totalValue: { fontSize: 8.5, fontWeight: 700 },
  grandLabel: { fontSize: 11, fontWeight: 700 },
  grandValue: { fontSize: 11, fontWeight: 700 },

  signature: { position: 'absolute', left: 45, bottom: 40, width: 210, textAlign: 'center' },
  signatureLine: { borderTop: `1px solid ${GREEN_SOFT}`, marginBottom: 5 },
  signatureCaption: { fontSize: 8.5, lineHeight: 1.6 },

  // ── Page 3: back cover ──
  back: {
    fontFamily: 'Roboto',
    backgroundColor: GREEN,
    color: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 110,
  },
  backMark: { width: 74, height: 96, objectFit: 'contain', marginBottom: 34 },
  backName: { fontSize: 17, fontWeight: 700, textAlign: 'center', letterSpacing: 0.4 },
  backCompany: { fontSize: 17, textAlign: 'center' },
  backUrl: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
    fontSize: 11,
    letterSpacing: 3,
    textAlign: 'center',
  },
});

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

function coverMonth(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
}

// Line items are stored as the same JSON array the invoice keeps in its
// description column; anything that is not JSON is a single item's free text.
function parseItems(proforma) {
  const raw = proforma?.description;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return [{ title: '', description: raw, quantity: 1, price: proforma.baseAmount ?? 0 }];
    }
  }
  return [{ title: '', description: '', quantity: 1, price: proforma?.baseAmount ?? 0 }];
}

export function ProformaPdfDocument({ proforma }) {
  if (!proforma) return null;

  const currency = proforma.currencyCode || 'SAR';
  const items = parseItems(proforma);
  const vatRate = Number(proforma.vatRate ?? 0) || 0;
  const discount = Math.abs(Number(proforma.adjustment ?? 0)) || 0;
  const shipping = Number(proforma.shippingCharge ?? 0) || 0;

  const brand = (rightAligned = false) => (
    <View style={[styles.brandRow, rightAligned ? { flexDirection: 'row-reverse' } : null]}>
      <Image src="/logo/logo-single.png" style={styles.brandMark} />
      <View style={rightAligned ? { alignItems: 'flex-end', marginRight: 8 } : null}>
        <Text style={styles.brandName}>IOTA</Text>
        <Text style={styles.brandSub}>TECHNOLOGIES</Text>
      </View>
    </View>
  );

  return (
    <Document title={proforma.proformaNumber}>
      {/* ── Page 1: cover ── */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverHead}>
          {brand()}
          <View>
            <Text style={styles.docId}>Document ID: {proforma.documentId}</Text>
            <Text style={styles.docMonth}>
              {coverMonth(proforma.issueDate || proforma.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.coverTitleBlock}>
          {!!proforma.brandTitle && (
            <Text style={styles.coverTitle}>{proforma.brandTitle.toUpperCase()}</Text>
          )}
          <Text style={styles.coverTitle}>
            {(proforma.documentTitle || 'PROFORMA INVOICE').toUpperCase()}
          </Text>
          <Text style={styles.coverCustomer}>{(proforma.customerName || '').toUpperCase()}</Text>
        </View>

        <View style={styles.coverParties}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Prepared By:</Text>
            <Text style={styles.partyName}>{proforma.preparedByTeam || 'Engagements Team'}</Text>
            <Text style={styles.partyOrg}>
              {proforma.preparedByCompany || 'IOTA Technologies'}
            </Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Prepared For:</Text>
            <Text style={styles.partyName}>{proforma.preparedForName || ''}</Text>
            <Text style={styles.partyOrg}>
              {proforma.preparedForCompany || proforma.customerName || ''}
            </Text>
          </View>
        </View>

        <View style={styles.coverContact}>
          <Text style={styles.coverContactLabel}>Contact Details:</Text>
          <Text style={styles.coverContactEmail}>
            {proforma.contactEmail || 'engagements@iotatechnologies.ai'}
          </Text>
        </View>
      </Page>

      {/* ── Page 2: details ── */}
      <Page size="A4" style={styles.details}>
        <View style={styles.docHead}>
          <Text style={styles.docNumber}>Proforma Invoice #{proforma.documentId}</Text>
          {brand(true)}
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLine}>
              <Text style={styles.bold}>Date: </Text>
              {fDate(proforma.issueDate || proforma.createdAt)}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.bold}>Valid Until: </Text>
              {fDate(proforma.validUntil)}
            </Text>
            {!!proforma.customerRefId && (
              <Text style={styles.metaLine}>
                <Text style={styles.bold}>Customer ID: </Text>
                {proforma.customerRefId}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.metaLineRight}>Office # 9, 1st Floor,</Text>
            <Text style={styles.metaLineRight}>2885 Jarir Street, Al Malaz</Text>
            <Text style={styles.metaLineRight}>Riyadh - 12836</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>CUSTOMER</Text>
          <Text style={styles.sectionTitle}>SPECIAL INSTRUCTIONS:</Text>
        </View>

        <View style={styles.partyRow}>
          <View style={styles.customerBlock}>
            {!!proforma.customerAttention && (
              <Text>Kind Attn.: {proforma.customerAttention},</Text>
            )}
            <Text>{proforma.customerName}</Text>
            {(proforma.customerAddress || '')
              .split('\n')
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
          </View>
          <View style={styles.instructionsBlock}>
            {(proforma.specialInstructions || '')
              .split('\n')
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.colDesc, { textAlign: 'left' }]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colMoney]}>PRICE</Text>
            <Text style={[styles.th, styles.colMoney]}>TOTAL</Text>
          </View>

          {items.map((item, index) => {
            const qty = Number(item.quantity ?? 1) || 1;
            const unitPrice = Number(item.price ?? 0) || 0;
            return (
              <View key={index} style={styles.tr} wrap={false}>
                <View style={[styles.td, styles.colDesc]}>
                  {!!item.title && <Text>{item.title}</Text>}
                  {(item.description || '')
                    .split('\n')
                    .filter(Boolean)
                    .map((line, i) => (
                      <Text key={i}>{line}</Text>
                    ))}
                </View>
                <Text style={[styles.td, styles.colQty]}>{qty}</Text>
                <Text style={[styles.td, styles.colMoney]}>
                  {formatCurrency(unitPrice, currency)}
                </Text>
                <Text style={[styles.td, styles.colMoney]}>
                  {formatCurrency(qty * unitPrice, currency)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footRow}>
          <Text style={styles.footNote}>
            If you have any questions concerning this proforma invoice, please contact{' '}
            <Text style={styles.bold}>
              {proforma.contactEmail || 'engagements@iotatechnologies.ai'}
            </Text>
            .
          </Text>

          <View style={styles.totals}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>SUBTOTAL:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(proforma.baseAmount ?? 0, currency)}
              </Text>
            </View>

            {discount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>DISCOUNT:</Text>
                <Text style={styles.totalValue}>-{formatCurrency(discount, currency)}</Text>
              </View>
            )}

            {shipping > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>SHIPPING:</Text>
                <Text style={styles.totalValue}>{formatCurrency(shipping, currency)}</Text>
              </View>
            )}

            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>{vatRate > 0 ? `VAT @ ${vatRate}%` : 'VAT'}</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(proforma.vatAmount ?? 0, currency)}
              </Text>
            </View>

            <View style={[styles.totalLine, { paddingTop: 6 }]}>
              <Text style={styles.grandLabel}>TOTAL:</Text>
              <Text style={styles.grandValue}>
                {formatCurrency(proforma.total ?? 0, currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureCaption}>Signature over printed name</Text>
          <Text style={styles.signatureCaption}>{proforma.customerName}</Text>
        </View>
      </Page>

      {/* ── Page 3: back cover (static) ── */}
      <Page size="A4" style={styles.back}>
        <Image src="/logo/iotaLogoWhite.png" style={styles.backMark} />
        <Text style={styles.backName}>IOTA TECHNOLOGIES</Text>
        <Text style={styles.backCompany}>COMPANY</Text>
        <Text style={styles.backUrl}>iotatechnologies.ai</Text>
      </Page>
    </Document>
  );
}
