import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const IOTA_BLUE = '#1976D2';
const GREEN = '#22c55e';
const GREEN_BG = '#f0fdf4';
const DARK_BOX = '#1e293b';
const BORDER = '#e5e7eb';
const MUTED = '#6b7280';
const DARK = '#111827';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 50,
    paddingVertical: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: DARK,
    backgroundColor: '#fff',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: IOTA_BLUE,
  },
  companySubtitle: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 3,
  },
  payslipForMonth: {
    fontSize: 8.5,
    color: MUTED,
    textAlign: 'right',
  },
  periodLarge: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 2,
    textAlign: 'right',
  },

  // ── Employee Summary ─────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    letterSpacing: 1,
    marginBottom: 10,
  },
  employeeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  employeeLeft: {
    flex: 1,
    paddingRight: 16,
  },
  empRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  empLabel: {
    width: 90,
    fontSize: 9,
    color: MUTED,
  },
  empColon: {
    width: 10,
    fontSize: 9,
    color: MUTED,
  },
  empValue: {
    flex: 1,
    fontSize: 9,
    color: DARK,
  },

  // ── Net pay card (right of employee summary) ──────────────────────────────
  netCard: {
    width: 210,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
  },
  netCardTop: {
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    backgroundColor: GREEN_BG,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  netCardAmount: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  netCardLabel: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
  },
  netCardDivider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  netCardBottom: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  netCardRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  netCardRowLabel: {
    width: 70,
    fontSize: 8.5,
    color: MUTED,
  },
  netCardRowColon: {
    width: 12,
    fontSize: 8.5,
    color: MUTED,
  },
  netCardRowValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },

  // ── Earnings & Deductions table ───────────────────────────────────────────
  tableBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tableCol: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tableColLeft: {
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tableColHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 2,
  },
  tableColHeadText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    letterSpacing: 0.3,
  },
  tableDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tableDataLabel: {
    flex: 1,
    fontSize: 9,
    color: DARK,
  },
  tableDataValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  tableDataMuted: {
    fontSize: 9,
    color: MUTED,
    fontFamily: 'Helvetica-Oblique',
  },
  tableTotalSep: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 5,
  },
  tableTotalLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  tableTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },

  // ── Total Net Payable ─────────────────────────────────────────────────────
  totalNetBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  totalNetLeft: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  totalNetTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    letterSpacing: 0.3,
  },
  totalNetSubtitle: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
  },
  totalNetRight: {
    backgroundColor: DARK_BOX,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  totalNetValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },

  // ── Amount in Words ───────────────────────────────────────────────────────
  amountWordsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },
  amountWordsPrefix: {
    fontSize: 8.5,
    color: MUTED,
    marginRight: 4,
  },
  amountWordsValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 8,
    color: '#bbb',
    fontFamily: 'Helvetica-Oblique',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n, currency = 'SAR') => `${currency} ${Number(n || 0).toFixed(2)}`;

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWordsUnder1000(n) {
  if (n === 0) return 'Zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWordsUnder1000(n % 100) : '');
}

function amountToWords(amount, currency = 'SAR') {
  const n = Math.round(Number(amount) * 100);
  if (isNaN(n) || n < 0) return '';
  const major = Math.floor(n / 100);
  const minor = n % 100;
  const majorLabel = currency === 'AED' ? 'UAE Dirham' : 'Saudi Riyal';
  const minorLabel = currency === 'AED' ? 'Fils' : 'Halalas';
  if (major === 0 && minor === 0) return `${majorLabel} Zero Only`;
  const parts = [];
  if (major > 0) {
    const thousands = Math.floor(major / 1000);
    const rem = major % 1000;
    let word = '';
    if (thousands > 0) word += numToWordsUnder1000(thousands) + ' Thousand';
    if (rem > 0) word += (word ? ' ' : '') + numToWordsUnder1000(rem);
    parts.push(`${word} ${major === 1 ? majorLabel : majorLabel + 's'}`);
  }
  if (minor > 0) parts.push(`${numToWordsUnder1000(minor)} ${minorLabel}`);
  return parts.join(' and ') + ' Only';
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
 *   companyName — override company name (default: 'IOTA Technologies')
 */
export function PayslipDocument({ lineItem, payroll, companyName = 'IOTA Technologies' }) {
  const monthName = new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString(
    'default',
    { month: 'long' }
  );
  const period = `${monthName} ${payroll.periodYear}`;
  const payDate = `01/${String(payroll.periodMonth).padStart(2, '0')}/${payroll.periodYear}`;
  const currency = lineItem.currencyCode || 'SAR';

  const basic = Number(lineItem.basicSalary || 0);
  const housing = Number(lineItem.housingAllowance || 0);
  const transport = Number(lineItem.transportAllowance || 0);
  const other = Number(lineItem.otherAllowances || 0);
  const gross = Number(lineItem.grossSalary || basic + housing + transport + other);

  const lopDays = Number(lineItem.lopDays || 0);
  const lopAmount = Number(lineItem.lopAmount || 0);
  const manualDeduction = Number(lineItem.manualDeductionAmount ?? (lineItem.deductions || 0));
  const manualDeductionLabel =
    lineItem.manualDeductionRemarks || lineItem.remarks || 'Additional Deduction';
  const totalDeductions = Number(lineItem.deductions || lopAmount + manualDeduction);
  const net = Number(lineItem.netSalary || gross - totalDeductions);

  const paidDays = lineItem.paidDays != null ? String(lineItem.paidDays) : '—';
  const netInWords = amountToWords(net, currency);
  const hasLop = lopAmount > 0;
  const hasManual = manualDeduction > 0;
  const hasDeductions = totalDeductions > 0;

  const empFields = [
    ['Employee Name', lineItem.employeeName || '—'],
    ['Employee ID', lineItem.employeeId || '—'],
    ['Pay Period', period],
    ['Pay Date', payDate],
  ];
  if (lineItem.designation) empFields.push(['Designation', lineItem.designation]);
  if (lineItem.department) empFields.push(['Department', lineItem.department]);

  return (
    <Document
      title={`Payslip — ${lineItem.employeeName} — ${period}`}
      author={companyName}
      creator={companyName}
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companySubtitle}>Human Resources Department</Text>
          </View>
          <View>
            <Text style={styles.payslipForMonth}>Payslip For the Month</Text>
            <Text style={styles.periodLarge}>{period}</Text>
          </View>
        </View>

        {/* ── Employee Summary ── */}
        <Text style={styles.sectionLabel}>EMPLOYEE SUMMARY</Text>
        <View style={styles.employeeSection}>
          {/* Left: field rows */}
          <View style={styles.employeeLeft}>
            {empFields.map(([label, value]) => (
              <View style={styles.empRow} key={label}>
                <Text style={styles.empLabel}>{label}</Text>
                <Text style={styles.empColon}>:</Text>
                <Text style={styles.empValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Right: net pay card */}
          <View style={styles.netCard}>
            <View style={styles.netCardTop}>
              <Text style={styles.netCardAmount}>{fmt(net, currency)}</Text>
              <Text style={styles.netCardLabel}>Total Net Pay</Text>
            </View>
            <View style={styles.netCardDivider} />
            <View style={styles.netCardBottom}>
              <View style={styles.netCardRow}>
                <Text style={styles.netCardRowLabel}>Paid Days</Text>
                <Text style={styles.netCardRowColon}>:</Text>
                <Text style={styles.netCardRowValue}>{paidDays}</Text>
              </View>
              <View style={[styles.netCardRow, { marginBottom: 0 }]}>
                <Text style={styles.netCardRowLabel}>LOP Days</Text>
                <Text style={styles.netCardRowColon}>:</Text>
                <Text style={styles.netCardRowValue}>{String(lopDays)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Earnings & Deductions ── */}
        <View style={styles.tableBox}>
          {/* Earnings */}
          <View style={[styles.tableCol, styles.tableColLeft]}>
            <View style={styles.tableColHead}>
              <Text style={styles.tableColHeadText}>EARNINGS</Text>
              <Text style={styles.tableColHeadText}>AMOUNT</Text>
            </View>
            <View style={styles.tableDataRow}>
              <Text style={styles.tableDataLabel}>Basic</Text>
              <Text style={styles.tableDataValue}>{fmt(basic, currency)}</Text>
            </View>
            <View style={styles.tableDataRow}>
              <Text style={styles.tableDataLabel}>House Rent Allowance</Text>
              <Text style={styles.tableDataValue}>{fmt(housing, currency)}</Text>
            </View>
            <View style={styles.tableDataRow}>
              <Text style={styles.tableDataLabel}>Transport Allowance</Text>
              <Text style={styles.tableDataValue}>{fmt(transport, currency)}</Text>
            </View>
            {other > 0 ? (
              <View style={styles.tableDataRow}>
                <Text style={styles.tableDataLabel}>Other Allowances</Text>
                <Text style={styles.tableDataValue}>{fmt(other, currency)}</Text>
              </View>
            ) : null}
            <View style={styles.tableTotalSep} />
            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalLabel}>Gross Earnings</Text>
              <Text style={styles.tableTotalValue}>{fmt(gross, currency)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.tableCol}>
            <View style={styles.tableColHead}>
              <Text style={styles.tableColHeadText}>DEDUCTIONS</Text>
              <Text style={styles.tableColHeadText}>AMOUNT</Text>
            </View>
            {!hasDeductions ? (
              <View style={styles.tableDataRow}>
                <Text style={styles.tableDataMuted}>No deductions this period</Text>
              </View>
            ) : null}
            {hasLop ? (
              <View style={styles.tableDataRow}>
                <Text style={styles.tableDataLabel}>{`Loss of Pay${lopDays > 0 ? ` (${lopDays} day${lopDays !== 1 ? 's' : ''})` : ''}`}</Text>
                <Text style={styles.tableDataValue}>{fmt(lopAmount, currency)}</Text>
              </View>
            ) : null}
            {hasManual ? (
              <View style={styles.tableDataRow}>
                <Text style={styles.tableDataLabel}>{manualDeductionLabel}</Text>
                <Text style={styles.tableDataValue}>{fmt(manualDeduction, currency)}</Text>
              </View>
            ) : null}
            <View style={styles.tableTotalSep} />
            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalLabel}>Total Deductions</Text>
              <Text style={styles.tableTotalValue}>{fmt(totalDeductions, currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Total Net Payable ── */}
        <View style={styles.totalNetBox}>
          <View style={styles.totalNetLeft}>
            <Text style={styles.totalNetTitle}>TOTAL NET PAYABLE</Text>
            <Text style={styles.totalNetSubtitle}>Gross Earnings - Total Deductions</Text>
          </View>
          <View style={styles.totalNetRight}>
            <Text style={styles.totalNetValue}>{fmt(net, currency)}</Text>
          </View>
        </View>

        {/* ── Amount In Words ── */}
        <View style={styles.amountWordsRow}>
          <Text style={styles.amountWordsPrefix}>Amount In Words :</Text>
          <Text style={styles.amountWordsValue}> {netInWords}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>-- This is a system-generated document. --</Text>
        </View>

      </Page>
    </Document>
  );
}

    width: 36,
    height: 36,
    objectFit: 'contain',
  },
  headerTextBlock: {},
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 1.2,
  },
  companyTagline: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  payslipBadge: {
    backgroundColor: BRAND,
    color: 'white',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    letterSpacing: 1,
  },
  periodText: {
    fontSize: 9,
    color: '#555',
    marginTop: 4,
  },

  // ── Employee block ───────────────────────────────────────────────────────
  employeeBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  employeeCol: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 110,
    color: '#555',
  },
  infoValue: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Section ─────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BORDER,
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 4,
  },

  // ── Table ────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDescription: {
    flex: 3,
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  tableHeadText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: BRAND_DARK,
  },
  subtotalRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: BRAND_BORDER,
    marginTop: 3,
  },
  subtotalLabel: {
    flex: 3,
    fontFamily: 'Helvetica-Bold',
  },
  subtotalValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },

  // ── Two-column layout for tables ─────────────────────────────────────────
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  colHalf: {
    flex: 1,
  },

  // ── Net pay ──────────────────────────────────────────────────────────────
  netPayBox: {
    backgroundColor: BRAND,
    borderRadius: 4,
    padding: '10 16',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  netPayLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
    letterSpacing: 0.8,
  },
  netPayValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },

  // ── Bank details ─────────────────────────────────────────────────────────
  amountInWordsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountInWordsLabel: {
    fontSize: 8.5,
    color: '#666',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  amountInWordsText: {
    fontSize: 8.5,
    color: '#1E293B',
    fontFamily: 'Helvetica-Oblique',
    flex: 1,
  },

  // ── Bank details ─────────────────────────────────────────────────────────
  bankBox: {
    borderWidth: 0.5,
    borderColor: BRAND_BORDER,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: '#bbb',
    paddingTop: 8,
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: '#888',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n, currency = 'SAR') => `${currency} ${Number(n || 0).toFixed(2)}`;

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

function numToWordsUnder1000(n) {
  if (n === 0) return 'Zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return (
    ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWordsUnder1000(n % 100) : '')
  );
}

function amountToWords(amount, currency = 'SAR') {
  const n = Math.round(Number(amount) * 100);
  if (isNaN(n) || n < 0) return '';
  const riyals = Math.floor(n / 100);
  const fils = n % 100;
  const currencyLabel = currency === 'AED' ? 'UAE Dirhams' : 'Saudi Riyals';
  const filsLabel = currency === 'AED' ? 'Fils' : 'Halalas';
  if (riyals === 0 && fils === 0) return `Zero ${currencyLabel} Only`;
  let parts = [];
  if (riyals > 0) {
    const thousands = Math.floor(riyals / 1000);
    const remainder = riyals % 1000;
    let word = '';
    if (thousands > 0) word += numToWordsUnder1000(thousands) + ' Thousand';
    if (remainder > 0) word += (word ? ' ' : '') + numToWordsUnder1000(remainder);
    parts.push(`${word} ${currencyLabel}`);
  }
  if (fils > 0) parts.push(`${numToWordsUnder1000(fils)} ${filsLabel}`);
  return parts.join(' and ') + ' Only';
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
 *   companyName — override company name (default: 'IOTA Technologies')
 *   logoUrl     — absolute URL to company logo (default: '/logo/iotaLogo.png')
 */
export function PayslipDocument({ lineItem, payroll, companyName = 'IOTA Technologies', logoUrl }) {
  // Build logo URL: prefer prop, then derive from window.location if available
  const resolvedLogoUrl =
    logoUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}/logo/iotaLogo.png` : null);
  const monthName = new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString(
    'default',
    { month: 'long' }
  );
  const period = `${monthName} ${payroll.periodYear}`;
  const currency = lineItem.currencyCode || 'SAR';

  // Salary components
  const basic = Number(lineItem.basicSalary || 0);
  const housing = Number(lineItem.housingAllowance || 0);
  const transport = Number(lineItem.transportAllowance || 0);
  const other = Number(lineItem.otherAllowances || 0);
  const gross = Number(lineItem.grossSalary || basic + housing + transport + other);

  // Deductions — manualDeductionAmount/Remarks are in-memory only until DB columns exist;
  // fall back to the persisted deductions + remarks fields for DB-loaded items.
  const lopDays = Number(lineItem.lopDays || 0);
  const lopAmount = Number(lineItem.lopAmount || 0);
  const manualDeduction = Number(lineItem.manualDeductionAmount ?? (lineItem.deductions || 0));
  const manualDeductionLabel =
    lineItem.manualDeductionRemarks || lineItem.remarks || 'Additional Deduction';
  const totalDeductions = Number(lineItem.deductions || lopAmount + manualDeduction);
  const net = Number(lineItem.netSalary || gross - totalDeductions);

  const hasDeductions = totalDeductions > 0;
  const netInWords = amountToWords(net, currency);

  return (
    <Document
      title={`Payslip — ${lineItem.employeeName} — ${period}`}
      author={companyName}
      creator={companyName}
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {resolvedLogoUrl ? <Image src={resolvedLogoUrl} style={styles.logoImage} /> : null}
            <View style={styles.headerTextBlock}>
              <Text style={styles.companyName}>{companyName}</Text>
              <Text style={styles.companyTagline}>Human Resources · Payroll Department</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.payslipBadge}>PAY SLIP</Text>
            <Text style={styles.periodText}>{period}</Text>
          </View>
        </View>

        {/* ── Employee block ── */}
        <View style={styles.employeeBlock}>
          <View style={styles.employeeCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee Name</Text>
              <Text style={styles.infoValue}>{lineItem.employeeName || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{lineItem.employeeId || '—'}</Text>
            </View>
            {lineItem.designation ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Designation</Text>
                <Text style={styles.infoValue}>{lineItem.designation}</Text>
              </View>
            ) : null}
            {lineItem.department ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{lineItem.department}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.employeeCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pay Period</Text>
              <Text style={styles.infoValue}>{period}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currency</Text>
              <Text style={styles.infoValue}>{currency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payroll Status</Text>
              <Text style={styles.infoValue}>{payroll.status?.toUpperCase() || '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── Earnings & Deductions side by side ── */}
        <View style={styles.twoCol}>
          {/* Earnings */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDescription, styles.tableHeadText]}>Description</Text>
              <Text style={[styles.colAmount, styles.tableHeadText]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>Basic Salary</Text>
              <Text style={styles.colAmount}>{fmt(basic, currency)}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={styles.colDescription}>Housing Allowance</Text>
              <Text style={styles.colAmount}>{fmt(housing, currency)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>Transport Allowance</Text>
              <Text style={styles.colAmount}>{fmt(transport, currency)}</Text>
            </View>
            {other > 0 ? (
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.colDescription}>Other Allowances</Text>
                <Text style={styles.colAmount}>{fmt(other, currency)}</Text>
              </View>
            ) : null}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Gross Salary</Text>
              <Text style={styles.subtotalValue}>{fmt(gross, currency)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            {hasDeductions ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colDescription, styles.tableHeadText]}>Description</Text>
                  <Text style={[styles.colAmount, styles.tableHeadText]}>Amount</Text>
                </View>
                {lopAmount > 0 ? (
                  <View style={styles.tableRow}>
                    <Text style={styles.colDescription}>
                      Loss of Pay (LOP){lopDays > 0 ? ` · ${lopDays} day(s)` : ''}
                    </Text>
                    <Text style={styles.colAmount}>{fmt(lopAmount, currency)}</Text>
                  </View>
                ) : null}
                {manualDeduction > 0 ? (
                  <View style={[styles.tableRow, styles.tableRowAlt]}>
                    <Text style={styles.colDescription}>{manualDeductionLabel}</Text>
                    <Text style={styles.colAmount}>{fmt(manualDeduction, currency)}</Text>
                  </View>
                ) : null}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Total Deductions</Text>
                  <Text style={styles.subtotalValue}>{fmt(totalDeductions, currency)}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.tableRow, { paddingTop: 10 }]}>
                <Text style={{ color: '#888', fontStyle: 'italic' }}>
                  No deductions this period
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Net Pay ── */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>NET SALARY PAYABLE</Text>
          <Text style={styles.netPayValue}>{fmt(net, currency)}</Text>
        </View>

        {/* ── Amount in words ── */}
        {netInWords ? (
          <View style={styles.amountInWordsBox}>
            <Text style={styles.amountInWordsLabel}>In Words:</Text>
            <Text style={styles.amountInWordsText}>{netInWords}</Text>
          </View>
        ) : null}

        {/* ── Bank Details ── */}
        {lineItem.bankName || lineItem.iban || lineItem.bankAccountNumber ? (
          <View style={styles.bankBox}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            {lineItem.bankName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bank</Text>
                <Text style={styles.infoValue}>{lineItem.bankName}</Text>
              </View>
            ) : null}
            {lineItem.iban ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>IBAN</Text>
                <Text style={styles.infoValue}>{lineItem.iban}</Text>
              </View>
            ) : null}
            {!lineItem.iban && lineItem.bankAccountNumber ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account No.</Text>
                <Text style={styles.infoValue}>{lineItem.bankAccountNumber}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated payslip. No signature required.
          </Text>
          <Text style={styles.footerText}>Generated on {new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
}
