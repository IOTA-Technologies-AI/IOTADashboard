import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#1976d2', // Professional blue
  secondary: '#0d47a1', // Darker blue
  text: '#2c3e50',
  textLight: '#7f8c8d',
  background: '#f8f9fa',
  white: '#ffffff',
  border: '#e0e0e0',
};

const styles = StyleSheet.create({
  // Cover Page Styles
  coverPage: {
    padding: 0,
    backgroundColor: COLORS.white,
  },
  coverHeader: {
    backgroundColor: COLORS.primary,
    padding: 40,
    paddingTop: 60,
    paddingBottom: 60,
    alignItems: 'center',
  },
  coverLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    // Placeholder for logo
  },
  coverCompanyName: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 2,
  },
  coverTagline: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
  },
  coverBody: {
    padding: 50,
    flex: 1,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  coverInfoBox: {
    backgroundColor: COLORS.background,
    padding: 30,
    marginTop: 40,
    borderLeft: `4 solid ${COLORS.primary}`,
  },
  coverInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  coverInfoLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textLight,
    width: 140,
  },
  coverInfoValue: {
    fontSize: 11,
    color: COLORS.text,
    fontFamily: 'Helvetica-Bold',
  },
  coverFooter: {
    backgroundColor: COLORS.secondary,
    padding: 20,
    alignItems: 'center',
  },
  coverFooterText: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.8,
  },

  // Content Pages
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
    color: COLORS.text,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: `2 solid ${COLORS.primary}`,
  },
  pageHeaderLeft: {
    flex: 1,
  },
  pageCompanyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  pageHeaderInfo: {
    fontSize: 8,
    color: COLORS.textLight,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  articleNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  highlight: {
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },

  // Table Styles
  table: {
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: COLORS.primary,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  tableFooter: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 0,
  },
  tableCol1: {
    width: '10%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableCol2: {
    width: '50%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableCol3: {
    width: '40%',
    padding: 8,
    textAlign: 'right',
  },

  // Info Box
  infoBox: {
    backgroundColor: COLORS.background,
    padding: 15,
    marginBottom: 15,
    borderLeft: `3 solid ${COLORS.primary}`,
  },

  // List Styles
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    width: 20,
    color: COLORS.primary,
    fontFamily: 'Helvetica-Bold',
  },
  listContent: {
    flex: 1,
  },

  // Signature Section
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBlock: {
    width: '48%',
  },
  signatureTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  signatureBox: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 4,
    padding: 15,
    minHeight: 100,
    marginTop: 10,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    marginTop: 50,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginBottom: 3,
  },
  signatureValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textLight,
  },
  pageNumber: {
    fontSize: 8,
    color: COLORS.primary,
    fontFamily: 'Helvetica-Bold',
  },
});

export function OfferLetterPDF({ data }) {
  const {
    employeeName = '',
    passportNumber = '',
    dateOfBirth = '',
    nationality = '',
    position = '',
    department = '',
    contractNumber = '',
    contractType = '',
    startDate = '',
    contractDuration = '',
    probationPeriod = '',
    basicSalary = 0,
    housingAllowance = 0,
    transportationAllowance = 0,
    otherAllowances = 0,
    totalSalary = 0,
    workingHours = '',
    annualLeaveDays = '',
    noticePeriod = '',
  } = data || {};

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        {/* Blue Header with Company Name */}
        <View style={styles.coverHeader}>
          <View style={styles.coverLogo}>
            {/* Logo placeholder - you can add an Image component here */}
            <Text style={{ fontSize: 40, color: COLORS.white, textAlign: 'center' }}>IT</Text>
          </View>
          <Text style={styles.coverCompanyName}>IOTA TECHNOLOGIES</Text>
          <Text style={styles.coverTagline}>Innovation • Technology • Excellence</Text>
        </View>

        {/* Cover Body */}
        <View style={styles.coverBody}>
          <Text style={styles.coverTitle}>EMPLOYMENT CONTRACT</Text>

          <View style={styles.coverInfoBox}>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Contract Number:</Text>
              <Text style={styles.coverInfoValue}>{contractNumber}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Issue Date:</Text>
              <Text style={styles.coverInfoValue}>{currentDate}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Employee Name:</Text>
              <Text style={styles.coverInfoValue}>{employeeName}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Position:</Text>
              <Text style={styles.coverInfoValue}>{position}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Department:</Text>
              <Text style={styles.coverInfoValue}>{department}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Start Date:</Text>
              <Text style={styles.coverInfoValue}>{startDate}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Contract Type:</Text>
              <Text style={styles.coverInfoValue}>{contractType}</Text>
            </View>
          </View>

          <View style={{ marginTop: 60, padding: 20, textAlign: 'center' }}>
            <Text
              style={{
                fontSize: 10,
                color: COLORS.textLight,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              This document constitutes a legally binding employment agreement
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.textLight, textAlign: 'center' }}>
              between IOTA Technologies and {employeeName}
            </Text>
          </View>
        </View>

        {/* Cover Footer */}
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            IOTA Technologies | P.O. Box 123456, Dubai, UAE
          </Text>
          <Text style={styles.coverFooterText}>
            Tel: +971 4 XXX XXXX | Email: hr@iota.ae | www.iota.ae
          </Text>
        </View>
      </Page>

      {/* PAGE 1: Contract Details */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageCompanyName}>IOTA TECHNOLOGIES</Text>
            <Text style={styles.pageHeaderInfo}>Employment Contract</Text>
          </View>
          <View>
            <Text style={styles.pageHeaderInfo}>Contract No: {contractNumber}</Text>
            <Text style={styles.pageHeaderInfo}>Date: {currentDate}</Text>
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            This Employment Contract is entered into on{' '}
            <Text style={styles.highlight}>{startDate}</Text> between:
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.paragraph}>
              <Text style={styles.highlight}>EMPLOYER:</Text> IOTA Technologies, a company duly
              registered under the laws of the United Arab Emirates, with its registered office in
              Dubai.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.highlight}>EMPLOYEE:</Text> {employeeName}, holder of Passport
              Number {passportNumber}, Nationality: {nationality}, Date of Birth: {dateOfBirth}
            </Text>
          </View>
        </View>

        {/* Article 1 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 1</Text>
          <Text style={styles.sectionTitle}>Position and Duties</Text>
          <Text style={styles.paragraph}>
            The Employee is appointed to the position of{' '}
            <Text style={styles.highlight}>{position}</Text> in the{' '}
            <Text style={styles.highlight}>{department} Department</Text>. The Employee shall
            perform all duties and responsibilities associated with this position and any other
            reasonable duties as may be assigned by the Employer from time to time.
          </Text>
        </View>

        {/* Article 2 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 2</Text>
          <Text style={styles.sectionTitle}>Contract Type and Duration</Text>
          <Text style={styles.paragraph}>
            This is a <Text style={styles.highlight}>{contractType}</Text> term contract
            {contractType === 'Limited' &&
              contractDuration &&
              ` for a duration of ${contractDuration} months`}
            . The employment shall commence on <Text style={styles.highlight}>{startDate}</Text>.
          </Text>
          {probationPeriod && (
            <Text style={styles.paragraph}>
              The Employee shall serve a probationary period of{' '}
              <Text style={styles.highlight}>{probationPeriod} months</Text> from the commencement
              date. During this period, either party may terminate the employment with notice as per
              UAE Federal Labor Law.
            </Text>
          )}
        </View>

        {/* Article 3 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 3</Text>
          <Text style={styles.sectionTitle}>Compensation and Benefits</Text>
          <Text style={styles.paragraph}>
            The Employee shall receive the following monthly remuneration package:
          </Text>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCol1, styles.tableHeaderText]}>No.</Text>
              <Text style={[styles.tableCol2, styles.tableHeaderText]}>Salary Component</Text>
              <Text style={[styles.tableCol3, styles.tableHeaderText]}>Amount (AED)</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCol1}>1</Text>
              <Text style={styles.tableCol2}>Basic Salary</Text>
              <Text style={styles.tableCol3}>{basicSalary.toLocaleString()}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCol1}>2</Text>
              <Text style={styles.tableCol2}>Housing Allowance</Text>
              <Text style={styles.tableCol3}>{housingAllowance.toLocaleString()}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCol1}>3</Text>
              <Text style={styles.tableCol2}>Transportation Allowance</Text>
              <Text style={styles.tableCol3}>{transportationAllowance.toLocaleString()}</Text>
            </View>
            {otherAllowances > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCol1}>4</Text>
                <Text style={styles.tableCol2}>Other Allowances</Text>
                <Text style={styles.tableCol3}>{otherAllowances.toLocaleString()}</Text>
              </View>
            )}
            <View style={[styles.tableRow, styles.tableFooter]}>
              <Text style={[styles.tableCol1, styles.highlight]} />
              <Text style={[styles.tableCol2, styles.highlight]}>TOTAL MONTHLY SALARY</Text>
              <Text style={[styles.tableCol3, styles.highlight]}>
                {totalSalary.toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Salary shall be paid on or before the last working day of each month via bank transfer
            to the Employee designated bank account in UAE Dirhams.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            IOTA Technologies - Confidential Employment Contract
          </Text>
          <Text style={styles.pageNumber}>Page 1 of 3</Text>
        </View>
      </Page>

      {/* PAGE 2: Terms and Conditions */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageCompanyName}>IOTA TECHNOLOGIES</Text>
            <Text style={styles.pageHeaderInfo}>Employment Contract - Terms & Conditions</Text>
          </View>
          <View>
            <Text style={styles.pageHeaderInfo}>Contract No: {contractNumber}</Text>
          </View>
        </View>

        {/* Article 4 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 4</Text>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <Text style={styles.paragraph}>
            The normal working hours shall be{' '}
            <Text style={styles.highlight}>{workingHours} hours per day</Text>, totaling 40 hours
            per week, from Monday to Friday. Official UAE public holidays shall be observed as per
            government regulations. The Employer reserves the right to modify working hours based on
            operational requirements with reasonable notice.
          </Text>
        </View>

        {/* Article 5 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 5</Text>
          <Text style={styles.sectionTitle}>Annual Leave</Text>
          <Text style={styles.paragraph}>
            The Employee shall be entitled to{' '}
            <Text style={styles.highlight}>{annualLeaveDays} calendar days</Text> of paid annual
            leave per year after completing one year of service, in accordance with UAE Labor Law.
            Annual leave shall be scheduled with mutual agreement between the Employee and
            management, subject to business requirements.
          </Text>
        </View>

        {/* Article 6 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 6</Text>
          <Text style={styles.sectionTitle}>Sick Leave</Text>
          <Text style={styles.paragraph}>
            The Employee is entitled to sick leave as per UAE Federal Labor Law:
          </Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>First 15 days with full pay</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Next 30 days with half pay</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listContent}>Next 30 days without pay</Text>
          </View>
          <Text style={styles.paragraph}>
            Sick leave must be supported by a valid medical certificate from a licensed medical
            practitioner approved by the relevant health authorities.
          </Text>
        </View>

        {/* Article 7 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 7</Text>
          <Text style={styles.sectionTitle}>End of Service Benefits</Text>
          <Text style={styles.paragraph}>
            Upon completion or termination of employment, the Employee shall be entitled to end of
            service gratuity calculated in accordance with UAE Federal Labor Law No. 33 of 2021,
            based on the basic salary and length of continuous service with the Employer.
          </Text>
        </View>

        {/* Article 8 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 8</Text>
          <Text style={styles.sectionTitle}>Notice Period and Termination</Text>
          <Text style={styles.paragraph}>
            Either party may terminate this contract by providing{' '}
            <Text style={styles.highlight}>{noticePeriod} days</Text> written notice to the other
            party, or payment in lieu thereof. The Employer reserves the right to terminate
            employment immediately without notice or compensation in cases of gross misconduct,
            breach of contract, or violation of company policies.
          </Text>
        </View>

        {/* Article 9 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 9</Text>
          <Text style={styles.sectionTitle}>Confidentiality and Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Employee agrees to maintain strict confidentiality regarding all proprietary
            information, trade secrets, client data, and business operations of the Employer. This
            obligation shall survive the termination of employment. All intellectual property
            created during employment shall belong exclusively to the Employer.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            IOTA Technologies - Confidential Employment Contract
          </Text>
          <Text style={styles.pageNumber}>Page 2 of 3</Text>
        </View>
      </Page>

      {/* PAGE 3: Legal Terms and Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageCompanyName}>IOTA TECHNOLOGIES</Text>
            <Text style={styles.pageHeaderInfo}>Employment Contract - Agreement & Signatures</Text>
          </View>
          <View>
            <Text style={styles.pageHeaderInfo}>Contract No: {contractNumber}</Text>
          </View>
        </View>

        {/* Article 10 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 10</Text>
          <Text style={styles.sectionTitle}>Non-Competition Clause</Text>
          <Text style={styles.paragraph}>
            During the term of employment and for a period of 12 months following termination, the
            Employee agrees not to directly or indirectly engage in any business activities that
            compete with the Employers business interests within the United Arab Emirates.
          </Text>
        </View>

        {/* Article 11 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 11</Text>
          <Text style={styles.sectionTitle}>Governing Law and Jurisdiction</Text>
          <Text style={styles.paragraph}>
            This contract shall be governed by and construed in accordance with the laws of the
            United Arab Emirates, particularly UAE Federal Labor Law No. 33 of 2021 and subsequent
            amendments. Any disputes arising from this agreement shall fall under the exclusive
            jurisdiction of the competent courts in Dubai, UAE.
          </Text>
        </View>

        {/* Article 12 */}
        <View style={styles.section}>
          <Text style={styles.articleNumber}>ARTICLE 12</Text>
          <Text style={styles.sectionTitle}>Entire Agreement</Text>
          <Text style={styles.paragraph}>
            This contract constitutes the entire agreement between the parties and supersedes all
            prior negotiations, representations, or agreements. Any modifications must be made in
            writing and signed by authorized representatives of both parties.
          </Text>
        </View>

        {/* Declaration */}
        <View style={styles.infoBox}>
          <Text style={[styles.paragraph, { textAlign: 'center', marginBottom: 0 }]}>
            <Text style={styles.highlight}>DECLARATION:</Text> Both parties confirm that they have
            read, understood, and agree to all terms and conditions stipulated in this Employment
            Contract. This agreement has been executed in duplicate, with each party retaining one
            original copy.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>FOR THE EMPLOYER</Text>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Authorized Signatory</Text>
                <Text style={styles.signatureValue}>_________________________</Text>
                <Text style={[styles.signatureLabel, { marginTop: 8 }]}>Name & Title</Text>
                <Text style={styles.signatureValue}>_________________________</Text>
                <Text style={[styles.signatureLabel, { marginTop: 8 }]}>Date</Text>
                <Text style={styles.signatureValue}>_________________________</Text>
              </View>
            </View>
            <Text
              style={{ fontSize: 8, color: COLORS.textLight, marginTop: 5, textAlign: 'center' }}
            >
              Company Stamp
            </Text>
          </View>

          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>FOR THE EMPLOYEE</Text>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Employee Signature</Text>
                <Text style={styles.signatureValue}>_________________________</Text>
                <Text style={[styles.signatureLabel, { marginTop: 8 }]}>Name</Text>
                <Text style={styles.signatureValue}>{employeeName}</Text>
                <Text style={[styles.signatureLabel, { marginTop: 8 }]}>Passport No.</Text>
                <Text style={styles.signatureValue}>{passportNumber}</Text>
                <Text style={[styles.signatureLabel, { marginTop: 8 }]}>Date</Text>
                <Text style={styles.signatureValue}>_________________________</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} IOTA Technologies. All Rights Reserved.
          </Text>
          <Text style={styles.pageNumber}>Page 3 of 3</Text>
        </View>
      </Page>
    </Document>
  );
}
