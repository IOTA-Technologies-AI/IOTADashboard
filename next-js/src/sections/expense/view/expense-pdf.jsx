import { useMemo } from 'react';
import {
  Page,
  Text,
  View,
  Font,
  Image,
  Document,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';
import { EXPENSE_TYPES } from 'src/utils/constants/enums';

// ----------------------------------------------------------------------

// Register fonts with Arabic support
Font.register({
  family: 'Roboto',
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 }],
});

// Register Noto Sans Arabic for Arabic text support (from Google Fonts CDN)
Font.register({
  family: 'NotoSansArabic',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.ttf',
    },
  ],
});

const useStyles = () =>
  useMemo(
    () =>
      StyleSheet.create({
        page: {
          fontSize: 9,
          lineHeight: 1.6,
          fontFamily: 'Roboto',
          backgroundColor: '#FFFFFF',
          padding: 40,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 30,
        },
        logo: {
          width: 'auto',
          height: 'auto',
          maxWidth: 150,
          maxHeight: 50,
          objectFit: 'contain',
        },
        title: {
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 8,
          lineHeight: 1.4,
        },
        subtitle: {
          fontSize: 10,
          color: '#637381',
          lineHeight: 1.5,
        },
        infoSection: {
          marginBottom: 20,
          padding: 16,
          backgroundColor: '#F4F6F8',
          borderRadius: 8,
        },
        infoRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        infoLabel: {
          fontSize: 10,
          fontWeight: 700,
          color: '#212B36',
        },
        infoValue: {
          fontSize: 10,
          color: '#637381',
        },
        table: {
          display: 'table',
          width: '100%',
          marginTop: 20,
        },
        tableHeader: {
          flexDirection: 'row',
          backgroundColor: '#F4F6F8',
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 8,
          marginBottom: 4,
        },
        tableRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#F4F6F8',
          paddingVertical: 8,
          paddingHorizontal: 8,
        },
        tableCell: {
          fontSize: 9,
        },
        tableCellArabic: {
          fontSize: 9,
          fontFamily: 'NotoSansArabic', // Use Arabic font for descriptions
        },
        tableCellHeader: {
          fontSize: 9,
          fontWeight: 700,
          color: '#212B36',
        },
        col1: { width: '5%' },
        col2: { width: '12%' },
        col3: { width: '28%' },
        col4: { width: '20%' },
        col5: { width: '15%' },
        col6: { width: '10%' },
        col7: { width: '10%' },
        footer: {
          position: 'absolute',
          bottom: 30,
          left: 40,
          right: 40,
          textAlign: 'center',
          color: '#637381',
          fontSize: 8,
          borderTopWidth: 1,
          borderTopColor: '#F4F6F8',
          paddingTop: 10,
        },
      }),
    []
  );

// ----------------------------------------------------------------------

function ExpensePdfDocument({ expenses, summary }) {
  const styles = useStyles();

  const getExpenseTypeName = (typeId) => {
    const type = EXPENSE_TYPES.find((t) => t.id === typeId);
    return type ? type.label : 'Unknown';
  };

  // Helper function to detect Arabic characters
  const hasArabic = (text) => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image source="/logo/logo-full.png" style={styles.logo} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>Expense Report</Text>
            <Text style={styles.subtitle}>Generated on {fDate(new Date())}</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Expenses:</Text>
            <Text style={styles.infoValue}>{summary.total}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount:</Text>
            <Text style={styles.infoValue}>SAR {fNumber(summary.totalAmount)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Approved:</Text>
            <Text style={styles.infoValue}>
              {summary.approved} (SAR {fNumber(summary.approvedAmount)})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Not Approved:</Text>
            <Text style={styles.infoValue}>
              {summary.notApproved} (SAR {fNumber(summary.notApprovedAmount)})
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.col1]}>ID</Text>
            <Text style={[styles.tableCellHeader, styles.col2]}>Date</Text>
            <Text style={[styles.tableCellHeader, styles.col3]}>Description</Text>
            <Text style={[styles.tableCellHeader, styles.col4]}>Type</Text>
            <Text style={[styles.tableCellHeader, styles.col5]}>Currency</Text>
            <Text style={[styles.tableCellHeader, styles.col6]}>Amount</Text>
            <Text style={[styles.tableCellHeader, styles.col7]}>Status</Text>
          </View>

          {/* Table Rows */}
          {expenses.map((expense) => {
            const description = expense.expenseSettlementNotes || expense.expenseDescription || '-';
            const isArabic = hasArabic(description);

            return (
              <View key={expense.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>{expense.id}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{fDate(expense.expenseDate)}</Text>
                <Text style={[isArabic ? styles.tableCellArabic : styles.tableCell, styles.col3]}>
                  {description}
                </Text>
                <Text style={[styles.tableCell, styles.col4]}>
                  {getExpenseTypeName(expense.expenseType)}
                </Text>
                <Text style={[styles.tableCell, styles.col5]}>
                  {expense.originalExpenseCurrency || 'SAR'}
                </Text>
                <Text style={[styles.tableCell, styles.col6]}>
                  {fNumber(expense.expenseAmount)}
                </Text>
                <Text style={[styles.tableCell, styles.col7]}>
                  {expense.expenseApprovalStatus ? 'Approved' : 'Not Approved'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            IOTA Dashboard - Expense Report - Page 1 - © {new Date().getFullYear()} IOTA. All
            rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------------------------

export function ExpensePDFDownload({ expenses, summary, filename = 'expense-report' }) {
  return (
    <PDFDownloadLink
      document={<ExpensePdfDocument expenses={expenses} summary={summary} />}
      fileName={`IOTAExpenseReport${Date.now()}.pdf`}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  );
}
