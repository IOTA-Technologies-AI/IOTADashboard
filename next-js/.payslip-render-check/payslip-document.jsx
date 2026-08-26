import React from 'react';
import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';

import { toWordsEn } from '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/src/utils/invoice-i18n';

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------
// The payslip design is set in Plus Jakarta Sans with JetBrains Mono for every
// figure and label — tabular numerals are what keep the amount columns
// optically aligned down the page. Static instances are used rather than the
// variable faces: react-pdf's subsetter renders a variable font at its default
// weight only, which would flatten the whole type hierarchy.

Font.register({
  family: 'PlusJakartaSans',
  fonts: [
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/PlusJakartaSans-400.ttf', fontWeight: 400 },
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/PlusJakartaSans-500.ttf', fontWeight: 500 },
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/PlusJakartaSans-700.ttf', fontWeight: 700 },
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/PlusJakartaSans-800.ttf', fontWeight: 800 },
  ],
});

Font.register({
  family: 'JetBrainsMono',
  fonts: [
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/JetBrainsMono-400.ttf', fontWeight: 400 },
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/JetBrainsMono-500.ttf', fontWeight: 500 },
    { src: '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/fonts/JetBrainsMono-700.ttf', fontWeight: 700 },
  ],
});

// Long reference strings (IBAN, WPS ref) should break on their own separators
// rather than being hyphenated mid-token.
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
// The artboard is authored at 794 × 1123 px (A4 at 96 dpi) and react-pdf works
// in points, so every measurement carries across at 0.75×. `px()` keeps the
// stylesheet readable against the source design instead of burying the
// conversion in pre-computed decimals.

const px = (n) => n * 0.75;

const BRAND = '#0166ff';
const INK = '#171717';
const MUTED = '#767676';
const FAINT = '#a3a3a3';
const LABEL = '#8a929c';
const RULE = '#edf0f4';
const PANEL = '#f6f8fb';
const PANEL_EDGE = '#e6ebf2';
const NET_LABEL = '#bbddff';
const NET_WORDS = '#dceaff';

const PAGE_PAD_X = px(56);
const CONTENT_W = px(794) - PAGE_PAD_X * 2; // 511.5pt
const AMOUNT_COL = px(130);
const COL_GAP = px(20);
const BLOCK_GAP = px(32);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: 'PlusJakartaSans',
    fontWeight: 400,
    backgroundColor: '#ffffff',
    color: INK,
    // The blue trim is the page's top edge, so the frame owns the padding.
    borderTopWidth: px(5),
    borderTopColor: BRAND,
    borderTopStyle: 'solid',
  },
  body: {
    flexGrow: 1,
    paddingTop: px(44),
    paddingHorizontal: PAGE_PAD_X,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: BLOCK_GAP,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  // The mark is 123 × 371, so the width follows from the design's 42px height.
  // react-pdf has no `width: auto`, and letting it default would letterbox the
  // mark inside a square box.
  logo: { height: px(42), width: px(42 * (123 / 371)), marginRight: px(14) },
  companyName: { fontSize: px(18), fontWeight: 800, letterSpacing: px(0.2) },
  companyAddress: { fontSize: px(11), color: MUTED, marginTop: px(3) },
  headerRight: { alignItems: 'flex-end' },
  docRef: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    fontSize: px(11),
    color: BRAND,
    letterSpacing: px(1),
  },
  docTitle: {
    fontSize: px(24),
    fontWeight: 800,
    letterSpacing: px(1.5),
    marginTop: px(6),
  },
  docPeriod: { fontSize: px(12), color: MUTED, marginTop: px(6) },

  // ── Meta panel ───────────────────────────────────────────────────────────
  meta: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: PANEL_EDGE,
    borderStyle: 'solid',
    paddingVertical: px(20),
    paddingHorizontal: px(24),
    marginBottom: BLOCK_GAP,
  },
  metaRow: { flexDirection: 'row' },
  metaRowSpaced: { marginBottom: px(18) },
  metaCell: { width: (CONTENT_W - px(48) - COL_GAP * 3) / 4, marginRight: COL_GAP },
  metaCellLast: { marginRight: 0 },
  metaLabel: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    fontSize: px(9.5),
    letterSpacing: px(1),
    color: LABEL,
    marginBottom: px(4),
  },
  metaValue: { fontSize: px(13), fontWeight: 700 },
  metaValueMono: { fontFamily: 'JetBrainsMono', fontWeight: 500, fontSize: px(12.5) },

  // ── Amount tables ────────────────────────────────────────────────────────
  table: { marginBottom: BLOCK_GAP },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: px(10),
    borderBottomWidth: px(2),
    borderBottomColor: INK,
    borderBottomStyle: 'solid',
  },
  tableTitle: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    fontSize: px(11),
    letterSpacing: px(1.5),
    color: BRAND,
    flexGrow: 1,
  },
  tableHeadCol: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    fontSize: px(10),
    letterSpacing: px(1),
    color: LABEL,
    textAlign: 'right',
    width: AMOUNT_COL,
    marginLeft: COL_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: px(12),
    borderBottomWidth: px(1),
    borderBottomColor: RULE,
    borderBottomStyle: 'solid',
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: px(13) },
  rowLabel: { fontSize: px(13), fontWeight: 500, flexGrow: 1 },
  totalLabel: { fontSize: px(13), fontWeight: 800, flexGrow: 1 },
  amount: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 400,
    fontSize: px(12.5),
    textAlign: 'right',
    width: AMOUNT_COL,
    marginLeft: COL_GAP,
  },
  amountTotal: { fontWeight: 700 },
  amountYtd: { color: MUTED },
  emptyNote: { fontSize: px(12), color: MUTED, paddingVertical: px(14) },

  // ── Net pay ──────────────────────────────────────────────────────────────
  net: {
    backgroundColor: BRAND,
    paddingVertical: px(24),
    paddingHorizontal: px(28),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    fontSize: px(10.5),
    letterSpacing: px(2),
    color: NET_LABEL,
    marginBottom: px(6),
  },
  netWords: { fontSize: px(12), color: NET_WORDS, maxWidth: px(380), lineHeight: 1.35 },
  netAmount: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    fontSize: px(31),
    color: '#ffffff',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    marginTop: BLOCK_GAP,
    paddingTop: px(18),
    paddingBottom: px(30),
    paddingHorizontal: PAGE_PAD_X,
    borderTopWidth: px(1),
    borderTopColor: RULE,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRef: { fontFamily: 'JetBrainsMono', fontWeight: 400, fontSize: px(10), color: FAINT },
  footerNote: { fontSize: px(10.5), color: FAINT },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "12,000.00" — no currency symbol; the code appears once, on the net band. */
const fmt = (v) =>
  num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "14 Mar 2022", or an em dash when the date is missing or unparseable. */
const fDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
};

/**
 * Masks the account-identifying middle of an IBAN, keeping the country and
 * bank prefix and the last four digits — enough for an employee to recognise
 * their own account, not enough to be worth anything to anyone else.
 * "SA0380000000608010167519" → "SA03 8000 •••• 7519"
 */
const maskIban = (iban) => {
  const clean = String(iban || '').replace(/\s+/g, '');
  if (!clean) return '';
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)} •••• ${clean.slice(-4)}`;
};

/**
 * "Fourteen thousand five hundred thirty-seven Saudi riyals and fifty halalas
 * only" — sentence case, as the design sets it.
 *
 * Deliberately not `amountInWordsEn` from invoice-i18n: that helper names the
 * SAR subunit "Fils", which belongs to the Gulf dirham/dinar currencies. The
 * riyal's hundredth is the halala, and a payslip is the document an employee
 * is most likely to read closely.
 */
const SUBUNITS = { SAR: 'halalas', AED: 'fils', USD: 'cents', EUR: 'cents', GBP: 'pence' };
const UNITS = {
  SAR: 'Saudi riyals',
  AED: 'UAE dirhams',
  USD: 'US dollars',
  EUR: 'euros',
  GBP: 'pounds sterling',
};

/**
 * `toWordsEn` title-cases every word and leaves compound tens unhyphenated
 * ("Thirty Seven"). The design sets the phrase in running sentence case with
 * proper hyphens, so lower it and rejoin the tens.
 */
const numberWords = (n) =>
  toWordsEn(n)
    .toLowerCase()
    .replace(
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety) (one|two|three|four|five|six|seven|eight|nine)\b/g,
      '$1-$2'
    );

const amountInWords = (amount, currencyCode = 'SAR') => {
  const value = num(amount);
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 100);
  const unit = UNITS[currencyCode] || currencyCode;
  const subunit = SUBUNITS[currencyCode] || 'cents';

  // The currency name is appended after lowering so its proper nouns survive
  // — "Saudi riyals", not "saudi riyals".
  let words = `${numberWords(whole)} ${unit}`;
  if (fraction > 0) words += ` and ${numberWords(fraction)} ${subunit}`;
  words += ' only';

  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** "9.75" — trailing zeros trimmed, so 10% reads "10" and not "10.00". */
const trimRate = (rate) => String(Number(rate.toFixed(2)));

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function MetaCell({ label, value, mono = true, last = false }) {
  return (
    <View style={[styles.metaCell, last && styles.metaCellLast]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={mono ? [styles.metaValue, styles.metaValueMono] : styles.metaValue}>
        {value || '—'}
      </Text>
    </View>
  );
}

function AmountRow({ label, amount, ytd, showYtd, total = false }) {
  return (
    <View style={total ? styles.totalRow : styles.row}>
      <Text style={total ? styles.totalLabel : styles.rowLabel}>{label}</Text>
      <Text style={total ? [styles.amount, styles.amountTotal] : styles.amount}>{fmt(amount)}</Text>
      {showYtd && (
        <Text
          style={
            total
              ? [styles.amount, styles.amountTotal, styles.amountYtd]
              : [styles.amount, styles.amountYtd]
          }
        >
          {fmt(ytd)}
        </Text>
      )}
    </View>
  );
}

function TableHead({ title, periodLabel, showYtd }) {
  return (
    <View style={styles.tableHead}>
      <Text style={styles.tableTitle}>{title}</Text>
      <Text style={styles.tableHeadCol}>{periodLabel}</Text>
      {showYtd && <Text style={styles.tableHeadCol}>YTD</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PayslipDocument
 *
 * Props:
 *   lineItem    — a PayrollLineItem object
 *   payroll     — the parent PayrollRun object
 *   ytd         — optional PayslipYtdEntry for this employee. When absent the
 *                 YTD column is dropped entirely rather than printed empty:
 *                 a blank column reads as "nothing earned this year".
 *   companyName — override company name
 *   companyAddress — override the registered address line
 *   logoSrc     — override the header mark
 */
export function PayslipDocument({
  lineItem,
  payroll,
  ytd = null,
  companyName = 'IOTA Technologies',
  companyAddress = '2885, Office #9, Jarir Street, AlMalaz, Riyadh 12836 · CR 1010XXXXXX',
  logoSrc = '/Users/jaffar/Desktop/MacBookPro14/IOTAGit/IOTADashboard/next-js/public/logo/iota-mark.png',
}) {
  const month = MONTHS[payroll.periodMonth - 1] || '';
  const period = `${month} ${payroll.periodYear}`;
  const periodShort = `${month.slice(0, 3).toUpperCase()} ${payroll.periodYear}`;
  const currency = lineItem.currencyCode || 'SAR';
  const showYtd = Boolean(ytd);

  // ── Earnings ──
  const basic = num(lineItem.basicSalary);
  const housing = num(lineItem.housingAllowance);
  const transport = num(lineItem.transportAllowance);
  const other = num(lineItem.otherAllowances);
  const gross = lineItem.grossSalary != null ? num(lineItem.grossSalary) : basic + housing + transport + other;

  // ── Deductions ──
  const gosi = num(lineItem.gosiDeduction);
  const lopDays = num(lineItem.lopDays);
  const lopAmount = num(lineItem.lopAmount);
  const manual = num(lineItem.manualDeductionAmount);
  const totalDeductions =
    lineItem.deductions != null ? num(lineItem.deductions) : gosi + lopAmount + manual;

  const net = lineItem.netSalary != null ? num(lineItem.netSalary) : gross - totalDeductions;
  const hasDeductions = gosi > 0 || lopAmount > 0 || manual > 0;

  // GOSI is stored as an amount, not a rate, but the payslip is expected to
  // show the percentage. Deriving it from the contributory base (basic +
  // housing, per the GOSI wage definition) reports the rate that actually
  // applied rather than asserting a statutory one that may not.
  const gosiBase = basic + housing;
  const gosiRate = gosi > 0 && gosiBase > 0 ? (gosi / gosiBase) * 100 : null;
  const gosiLabel = gosiRate
    ? `GOSI — Employee Contribution (${trimRate(gosiRate)}%)`
    : 'GOSI — Employee Contribution';

  // ── Period identity ──
  const paidOn = payroll.paymentDate || (payroll.status === 'paid' ? payroll.updatedAt : null);
  const periodTag = `(IOTA — PAY / ${String(payroll.periodMonth).padStart(2, '0')}.${String(
    payroll.periodYear
  ).slice(-2)})`;

  const daysInMonth =
    lineItem.daysInMonth != null
      ? num(lineItem.daysInMonth)
      : new Date(payroll.periodYear, payroll.periodMonth, 0).getDate();
  const daysPaid = lineItem.daysPaid != null ? num(lineItem.daysPaid) : daysInMonth - lopDays;

  return (
    <Document
      title={`Payslip — ${lineItem.employeeName} — ${period}`}
      subject={`Payslip for ${period}`}
      author={companyName}
      creator={companyName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.body}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={logoSrc} style={styles.logo} />
              <View>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companyAddress}>{companyAddress}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.docRef}>{periodTag}</Text>
              <Text style={styles.docTitle}>PAYSLIP</Text>
              <Text style={styles.docPeriod}>
                {period}
                {paidOn ? ` · Paid ${fDate(paidOn)}` : ''}
              </Text>
            </View>
          </View>

          {/* ── Employee meta ── */}
          <View style={styles.meta}>
            <View style={[styles.metaRow, styles.metaRowSpaced]}>
              <MetaCell label="EMPLOYEE" value={lineItem.employeeName} mono={false} />
              <MetaCell label="EMPLOYEE ID" value={lineItem.employeeId} />
              <MetaCell label="DESIGNATION" value={lineItem.designation} mono={false} />
              <MetaCell label="DEPARTMENT" value={lineItem.department} mono={false} last />
            </View>
            <View style={styles.metaRow}>
              <MetaCell
                label="IBAN"
                value={maskIban(lineItem.iban) || lineItem.bankAccountNumber}
              />
              <MetaCell label="GOSI NO." value={lineItem.gosiNumber} />
              <MetaCell label="DAYS PAID" value={`${daysPaid} / ${daysInMonth}`} />
              <MetaCell label="JOINED" value={fDate(lineItem.joiningDate)} last />
            </View>
          </View>

          {/* ── Earnings ── */}
          <View style={styles.table}>
            <TableHead title="EARNINGS" periodLabel={periodShort} showYtd={showYtd} />
            <AmountRow
              label="Basic Salary"
              amount={basic}
              ytd={ytd?.basicSalary}
              showYtd={showYtd}
            />
            <AmountRow
              label="Housing Allowance"
              amount={housing}
              ytd={ytd?.housingAllowance}
              showYtd={showYtd}
            />
            <AmountRow
              label="Transportation Allowance"
              amount={transport}
              ytd={ytd?.transportAllowance}
              showYtd={showYtd}
            />
            {other > 0 && (
              <AmountRow
                label="Other Allowances"
                amount={other}
                ytd={ytd?.otherAllowances}
                showYtd={showYtd}
              />
            )}
            <AmountRow
              label="Gross Earnings"
              amount={gross}
              ytd={ytd?.grossSalary}
              showYtd={showYtd}
              total
            />
          </View>

          {/* ── Deductions ── */}
          <View style={styles.table}>
            <TableHead title="DEDUCTIONS" periodLabel={periodShort} showYtd={showYtd} />
            {hasDeductions ? (
              <>
                {gosi > 0 && (
                  <AmountRow
                    label={gosiLabel}
                    amount={gosi}
                    ytd={ytd?.gosiDeduction}
                    showYtd={showYtd}
                  />
                )}
                {lopAmount > 0 && (
                  <AmountRow
                    label={`Loss of Pay${lopDays > 0 ? ` — ${lopDays} day${lopDays === 1 ? '' : 's'}` : ''}`}
                    amount={lopAmount}
                    ytd={ytd?.lopAmount}
                    showYtd={showYtd}
                  />
                )}
                {manual > 0 && (
                  <AmountRow
                    label={lineItem.manualDeductionRemarks || 'Other Deductions'}
                    amount={manual}
                    ytd={ytd?.manualDeductionAmount}
                    showYtd={showYtd}
                  />
                )}
                <AmountRow
                  label="Total Deductions"
                  amount={totalDeductions}
                  ytd={ytd?.deductions}
                  showYtd={showYtd}
                  total
                />
              </>
            ) : (
              <Text style={styles.emptyNote}>No deductions this period</Text>
            )}
          </View>

          {/* ── Net pay ── */}
          <View style={styles.net}>
            <View>
              <Text style={styles.netLabel}>NET PAY — {period.toUpperCase()}</Text>
              <Text style={styles.netWords}>{amountInWords(net, currency)}</Text>
            </View>
            <Text style={styles.netAmount}>
              {currency} {fmt(net)}
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerRef}>
            {lineItem.wpsReference ? `WPS REF ${lineItem.wpsReference}` : ''}
          </Text>
          <Text style={styles.footerNote}>
            Confidential · System-generated payslip, valid without signature
          </Text>
        </View>
      </Page>
    </Document>
  );
}