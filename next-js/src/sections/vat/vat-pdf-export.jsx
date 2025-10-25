'use client';

import { Page, View, Text, Font, Image, Document, StyleSheet } from '@react-pdf/renderer';

import { fDate } from 'src/utils/format-time';
import { fNumberWithLocale } from 'src/utils/format-number-locale';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
  ],
});

// ----------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    width: 'auto',
    height: 'auto',
    maxWidth: 120,
    maxHeight: 40,
    objectFit: 'contain',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#637381',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212B36',
    borderBottom: '2 solid #DFE3E8',
    paddingBottom: 5,
  },
  summaryBox: {
    backgroundColor: '#F4F6F8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#637381',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  zatcaBox: {
    backgroundColor: '#FFF7CD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeft: '4 solid #FFAB00',
  },
  zatcaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#7A4F01',
  },
  zatcaAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7A4F01',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F4F6F8',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1 solid #DFE3E8',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #F4F6F8',
  },
  col1: { width: '12%' },
  col2: { width: '10%' },
  col3: { width: '20%' },
  col4: { width: '12%' },
  col5: { width: '10%' },
  col6: { width: '12%', textAlign: 'right' },
  col7: { width: '12%', textAlign: 'right' },
  col8: { width: '12%', textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#637381',
    fontSize: 8,
    borderTop: '1 solid #F4F6F8',
    paddingTop: 10,
  },
});

// ----------------------------------------------------------------------

export function VATPDFDownload({ data, quarterInfo, locale = 'en' }) {
  const { records, totals, zatcaPayable, summary } = data;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src="/logo/logo-full.png" style={styles.logo} />
            <Text style={styles.subtitle}>VAT Return Report</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>ZATCA VAT Report</Text>
            <Text style={styles.subtitle}>
              {quarterInfo.label} ({quarterInfo.quarterStart} - {quarterInfo.quarterEnd})
            </Text>
            <Text style={styles.subtitle}>Generated: {fDate(new Date())}</Text>
          </View>
        </View>

        {/* ZATCA Summary */}
        <View style={styles.zatcaBox}>
          <Text style={styles.zatcaTitle}>Net VAT {zatcaPayable.status} to ZATCA</Text>
          <Text style={styles.zatcaAmount}>
            SAR {fNumberWithLocale(Math.abs(zatcaPayable.netAmount), locale, 'SAR')}
          </Text>
          <Text style={{ fontSize: 9, color: '#637381', marginTop: 5 }}>
            {zatcaPayable.isPayable && 'Amount to be paid to ZATCA'}
            {zatcaPayable.isRefundable && 'Amount to be refunded by ZATCA'}
          </Text>
        </View>

        {/* Summary Boxes */}
        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
          {/* AR Summary */}
          <View style={[styles.summaryBox, { flex: 1 }]}>
            <Text style={[styles.sectionTitle, { borderBottom: 'none', marginBottom: 8 }]}>
              Accounts Receivable (AR)
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Invoices:</Text>
              <Text style={styles.summaryValue}>{summary.arCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryValue}>
                SAR {fNumberWithLocale(totals.ar.totalAmount, locale, 'SAR')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT Collected:</Text>
              <Text style={[styles.summaryValue, { color: '#00A76F' }]}>
                SAR {fNumberWithLocale(totals.ar.totalVAT, locale, 'SAR')}
              </Text>
            </View>
          </View>

          {/* AP Summary */}
          <View style={[styles.summaryBox, { flex: 1 }]}>
            <Text style={[styles.sectionTitle, { borderBottom: 'none', marginBottom: 8 }]}>
              Accounts Payable (AP)
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Payments:</Text>
              <Text style={styles.summaryValue}>{summary.apCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryValue}>
                SAR {fNumberWithLocale(totals.ap.totalAmount, locale, 'SAR')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT Paid:</Text>
              <Text style={[styles.summaryValue, { color: '#FF5630' }]}>
                SAR {fNumberWithLocale(totals.ap.totalVAT, locale, 'SAR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction Details Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Invoice #</Text>
              <Text style={styles.col2}>Date</Text>
              <Text style={styles.col3}>Customer/Vendor</Text>
              <Text style={styles.col4}>Country</Text>
              <Text style={styles.col5}>Currency</Text>
              <Text style={styles.col6}>Amount</Text>
              <Text style={styles.col7}>VAT Amount</Text>
              <Text style={styles.col8}>Type</Text>
            </View>

            {/* Table Rows */}
            {records.all.slice(0, 30).map((record, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{record.invoice_number || '-'}</Text>
                <Text style={styles.col2}>{fDate(record.date)}</Text>
                <Text style={styles.col3}>{record.customer_name || '-'}</Text>
                <Text style={styles.col4}>{record.country || '-'}</Text>
                <Text style={styles.col5}>{record.currency}</Text>
                <Text style={styles.col6}>
                  {fNumberWithLocale(record.baseAmount, locale, 'SAR')}
                </Text>
                <Text style={styles.col7}>
                  {fNumberWithLocale(record.vatAmount, locale, 'SAR')}
                </Text>
                <Text style={styles.col8}>{record.type}</Text>
              </View>
            ))}

            {records.all.length > 30 && (
              <View style={[styles.tableRow, { backgroundColor: '#F4F6F8' }]}>
                <Text style={{ flex: 1, textAlign: 'center', fontStyle: 'italic' }}>
                  ... and {records.all.length - 30} more transactions
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a system-generated VAT return report for ZATCA compliance. Generated on{' '}
          {fDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------------------------
