import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: {},
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#c5cae9',
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 4,
  },

  // ── Table ────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8eaf6',
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
    color: '#1a237e',
  },
  subtotalRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#9fa8da',
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
    backgroundColor: '#1a237e',
    borderRadius: 4,
    padding: '10 16',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
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
  bankBox: {
    borderWidth: 0.5,
    borderColor: '#c5cae9',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PayslipDocument
 *
 * Props:
 *   lineItem  — a PayrollLineItem object
 *   payroll   — the parent PayrollRun object
 *   companyName — override company name (default: 'IOTA')
 */
export function PayslipDocument({ lineItem, payroll, companyName = 'IOTA' }) {
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

  // Deductions
  const lopDays = Number(lineItem.lopDays || 0);
  const lopAmount = Number(lineItem.lopAmount || 0);
  const manualDeduction = Number(lineItem.manualDeductionAmount || 0);
  const totalDeductions = Number(lineItem.deductions || lopAmount + manualDeduction);
  const net = Number(lineItem.netSalary || gross - totalDeductions);

  const hasDeductions = totalDeductions > 0;

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
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyTagline}>Human Resources · Payroll Department</Text>
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
                    <Text style={styles.colDescription}>
                      {lineItem.manualDeductionRemarks || 'Additional Deduction'}
                    </Text>
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

        {/* ── Net Pay ── */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>NET SALARY PAYABLE</Text>
          <Text style={styles.netPayValue}>{fmt(net, currency)}</Text>
        </View>

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
