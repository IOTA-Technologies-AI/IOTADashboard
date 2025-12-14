'use client';

import React from 'react';

import {
  Box,
  Table,
  Paper,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

const styles = {
  container: {
    maxWidth: '210mm',
    margin: '0 auto',
    padding: 4,
    backgroundColor: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '11pt',
    lineHeight: 1.6,
  },
  coverPage: {
    minHeight: '297mm',
    display: 'flex',
    flexDirection: 'column',
    pageBreakAfter: 'always',
  },
  blueHeader: {
    backgroundColor: '#1976d2',
    color: '#fff',
    padding: 6,
    textAlign: 'center',
  },
  companyName: {
    fontSize: '32pt',
    fontWeight: 'bold',
    letterSpacing: 2,
    mb: 1,
  },
  coverBody: {
    flex: 1,
    padding: 6,
  },
  coverTitle: {
    fontSize: '28pt',
    fontWeight: 'bold',
    color: '#0d47a1',
    textAlign: 'center',
    mt: 8,
    mb: 5,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #1976d2',
    padding: 4,
    mt: 4,
  },
  blueFooter: {
    backgroundColor: '#0d47a1',
    color: '#fff',
    padding: 2,
    textAlign: 'center',
  },
  pageHeader: {
    borderBottom: '2px solid #1976d2',
    paddingBottom: 2,
    marginBottom: 3,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleTitle: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: '10pt',
    mt: 3,
    mb: 1,
  },
  sectionTitle: {
    color: '#0d47a1',
    fontWeight: 'bold',
    fontSize: '12pt',
    textTransform: 'uppercase',
    mb: 2,
  },
  highlight: {
    fontWeight: 'bold',
  },
  signatureBox: {
    border: '2px solid #1976d2',
    borderRadius: 1,
    padding: 2,
    minHeight: 100,
    mt: 2,
  },
};

export function OfferLetterHTML({ data }) {
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
    <Box sx={styles.container}>
      {/* COVER PAGE */}
      <Box sx={styles.coverPage}>
        {/* Blue Header */}
        <Box sx={styles.blueHeader}>
          <Typography sx={styles.companyName}>IOTA TECHNOLOGIES</Typography>
          <Typography variant="body1">Innovation • Technology • Excellence</Typography>
        </Box>

        {/* Cover Body */}
        <Box sx={styles.coverBody}>
          <Typography sx={styles.coverTitle}>EMPLOYMENT CONTRACT</Typography>

          <Box sx={styles.infoBox}>
            <Typography>
              <strong>Contract Number:</strong> {contractNumber}
            </Typography>
            <Typography>
              <strong>Issue Date:</strong> {currentDate}
            </Typography>
            <Typography>
              <strong>Employee Name:</strong> {employeeName}
            </Typography>
            <Typography>
              <strong>Position:</strong> {position}
            </Typography>
            <Typography>
              <strong>Department:</strong> {department}
            </Typography>
            <Typography>
              <strong>Start Date:</strong> {startDate}
            </Typography>
            <Typography>
              <strong>Contract Type:</strong> {contractType}
            </Typography>
          </Box>

          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">
              This document constitutes a legally binding employment agreement
            </Typography>
            <Typography color="text.secondary">
              between IOTA Technologies and {employeeName}
            </Typography>
          </Box>
        </Box>

        {/* Blue Footer */}
        <Box sx={styles.blueFooter}>
          <Typography variant="body2">IOTA Technologies | P.O. Box 123456, Dubai, UAE</Typography>
          <Typography variant="body2">
            Tel: +971 4 XXX XXXX | Email: hr@iota.ae | www.iota.ae
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 4, pageBreakBefore: 'always' }} />

      {/* PAGE 1: Contract Details */}
      <Box>
        <Box sx={styles.pageHeader}>
          <Box>
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              IOTA TECHNOLOGIES
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Employment Contract
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption">Contract No: {contractNumber}</Typography>
            <br />
            <Typography variant="caption">Date: {currentDate}</Typography>
          </Box>
        </Box>

        {/* Introduction */}
        <Typography paragraph>
          This Employment Contract is entered into on <strong>{startDate}</strong> between:
        </Typography>

        <Box sx={{ ...styles.infoBox, mb: 3 }}>
          <Typography paragraph>
            <strong>EMPLOYER:</strong> IOTA Technologies, a company duly registered under the laws
            of the United Arab Emirates, with its registered office in Dubai.
          </Typography>
          <Typography paragraph>
            <strong>EMPLOYEE:</strong> {employeeName}, holder of Passport Number {passportNumber},
            Nationality: {nationality}, Date of Birth: {dateOfBirth}
          </Typography>
        </Box>

        {/* Article 1 */}
        <Typography sx={styles.articleTitle}>ARTICLE 1</Typography>
        <Typography sx={styles.sectionTitle}>Position and Duties</Typography>
        <Typography paragraph>
          The Employee is appointed to the position of <strong>{position}</strong> in the{' '}
          <strong>{department} Department</strong>. The Employee shall perform all duties and
          responsibilities associated with this position and any other reasonable duties as may be
          assigned by the Employer from time to time.
        </Typography>

        {/* Article 2 */}
        <Typography sx={styles.articleTitle}>ARTICLE 2</Typography>
        <Typography sx={styles.sectionTitle}>Contract Type and Duration</Typography>
        <Typography paragraph>
          This is a <strong>{contractType}</strong> term contract
          {contractType === 'Limited' &&
            contractDuration &&
            ` for a duration of ${contractDuration} months`}
          . The employment shall commence on <strong>{startDate}</strong>.
        </Typography>
        {probationPeriod && (
          <Typography paragraph>
            The Employee shall serve a probationary period of{' '}
            <strong>{probationPeriod} months</strong> from the commencement date. During this
            period, either party may terminate the employment with notice as per UAE Federal Labor
            Law.
          </Typography>
        )}

        {/* Article 3 */}
        <Typography sx={styles.articleTitle}>ARTICLE 3</Typography>
        <Typography sx={styles.sectionTitle}>Compensation and Benefits</Typography>
        <Typography paragraph>
          The Employee shall receive the following monthly remuneration package:
        </Typography>

        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#1976d2' }}>
              <TableRow>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>No.</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Salary Component</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">
                  Amount (AED)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell>Basic Salary</TableCell>
                <TableCell align="right">{basicSalary.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell>Housing Allowance</TableCell>
                <TableCell align="right">{housingAllowance.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>3</TableCell>
                <TableCell>Transportation Allowance</TableCell>
                <TableCell align="right">{transportationAllowance.toLocaleString()}</TableCell>
              </TableRow>
              {otherAllowances > 0 && (
                <TableRow>
                  <TableCell>4</TableCell>
                  <TableCell>Other Allowances</TableCell>
                  <TableCell align="right">{otherAllowances.toLocaleString()}</TableCell>
                </TableRow>
              )}
              <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                <TableCell />
                <TableCell sx={{ fontWeight: 'bold' }}>TOTAL MONTHLY SALARY</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {totalSalary.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography paragraph>
          Salary shall be paid on or before the last working day of each month via bank transfer to
          the Employee&apos;s designated bank account in UAE Dirhams.
        </Typography>
      </Box>

      <Divider sx={{ my: 4, pageBreakBefore: 'always' }} />

      {/* PAGE 2: Terms and Conditions */}
      <Box>
        <Box sx={styles.pageHeader}>
          <Box>
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              IOTA TECHNOLOGIES
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Employment Contract - Terms & Conditions
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption">Contract No: {contractNumber}</Typography>
          </Box>
        </Box>

        {/* Article 4 */}
        <Typography sx={styles.articleTitle}>ARTICLE 4</Typography>
        <Typography sx={styles.sectionTitle}>Working Hours</Typography>
        <Typography paragraph>
          The normal working hours shall be <strong>{workingHours} hours per day</strong>, totaling
          40 hours per week, from Monday to Friday. Official UAE public holidays shall be observed
          as per government regulations. The Employer reserves the right to modify working hours
          based on operational requirements with reasonable notice.
        </Typography>

        {/* Article 5 */}
        <Typography sx={styles.articleTitle}>ARTICLE 5</Typography>
        <Typography sx={styles.sectionTitle}>Annual Leave</Typography>
        <Typography paragraph>
          The Employee shall be entitled to <strong>{annualLeaveDays} calendar days</strong> of paid
          annual leave per year after completing one year of service, in accordance with UAE Labor
          Law. Annual leave shall be scheduled with mutual agreement between the Employee and
          management, subject to business requirements.
        </Typography>

        {/* Article 6 */}
        <Typography sx={styles.articleTitle}>ARTICLE 6</Typography>
        <Typography sx={styles.sectionTitle}>Sick Leave</Typography>
        <Typography paragraph>
          The Employee is entitled to sick leave as per UAE Federal Labor Law:
        </Typography>
        <Box component="ul" sx={{ pl: 4 }}>
          <li>First 15 days with full pay</li>
          <li>Next 30 days with half pay</li>
          <li>Next 30 days without pay</li>
        </Box>
        <Typography paragraph>
          Sick leave must be supported by a valid medical certificate from a licensed medical
          practitioner approved by the relevant health authorities.
        </Typography>

        {/* Article 7 */}
        <Typography sx={styles.articleTitle}>ARTICLE 7</Typography>
        <Typography sx={styles.sectionTitle}>End of Service Benefits</Typography>
        <Typography paragraph>
          Upon completion or termination of employment, the Employee shall be entitled to end of
          service gratuity calculated in accordance with UAE Federal Labor Law No. 33 of 2021, based
          on the basic salary and length of continuous service with the Employer.
        </Typography>

        {/* Article 8 */}
        <Typography sx={styles.articleTitle}>ARTICLE 8</Typography>
        <Typography sx={styles.sectionTitle}>Notice Period and Termination</Typography>
        <Typography paragraph>
          Either party may terminate this contract by providing <strong>{noticePeriod} days</strong>{' '}
          written notice to the other party, or payment in lieu thereof. The Employer reserves the
          right to terminate employment immediately without notice or compensation in cases of gross
          misconduct, breach of contract, or violation of company policies.
        </Typography>

        {/* Article 9 */}
        <Typography sx={styles.articleTitle}>ARTICLE 9</Typography>
        <Typography sx={styles.sectionTitle}>Confidentiality and Intellectual Property</Typography>
        <Typography paragraph>
          The Employee agrees to maintain strict confidentiality regarding all proprietary
          information, trade secrets, client data, and business operations of the Employer. This
          obligation shall survive the termination of employment. All intellectual property created
          during employment shall belong exclusively to the Employer.
        </Typography>
      </Box>

      <Divider sx={{ my: 4, pageBreakBefore: 'always' }} />

      {/* PAGE 3: Legal Terms and Signatures */}
      <Box>
        <Box sx={styles.pageHeader}>
          <Box>
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              IOTA TECHNOLOGIES
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Employment Contract - Agreement & Signatures
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption">Contract No: {contractNumber}</Typography>
          </Box>
        </Box>

        {/* Article 10 */}
        <Typography sx={styles.articleTitle}>ARTICLE 10</Typography>
        <Typography sx={styles.sectionTitle}>Non-Competition Clause</Typography>
        <Typography paragraph>
          During the term of employment and for a period of 12 months following termination, the
          Employee agrees not to directly or indirectly engage in any business activities that
          compete with the Employer&apos;s business interests within the United Arab Emirates.
        </Typography>

        {/* Article 11 */}
        <Typography sx={styles.articleTitle}>ARTICLE 11</Typography>
        <Typography sx={styles.sectionTitle}>Governing Law and Jurisdiction</Typography>
        <Typography paragraph>
          This contract shall be governed by and construed in accordance with the laws of the United
          Arab Emirates, particularly UAE Federal Labor Law No. 33 of 2021 and subsequent
          amendments. Any disputes arising from this agreement shall fall under the exclusive
          jurisdiction of the competent courts in Dubai, UAE.
        </Typography>

        {/* Article 12 */}
        <Typography sx={styles.articleTitle}>ARTICLE 12</Typography>
        <Typography sx={styles.sectionTitle}>Entire Agreement</Typography>
        <Typography paragraph>
          This contract constitutes the entire agreement between the parties and supersedes all
          prior negotiations, representations, or agreements. Any modifications must be made in
          writing and signed by authorized representatives of both parties.
        </Typography>

        {/* Declaration */}
        <Box sx={{ ...styles.infoBox, textAlign: 'center', mb: 4 }}>
          <Typography>
            <strong>DECLARATION:</strong> Both parties confirm that they have read, understood, and
            agree to all terms and conditions stipulated in this Employment Contract. This agreement
            has been executed in duplicate, with each party retaining one original copy.
          </Typography>
        </Box>

        {/* Signatures */}
        <Box sx={{ display: 'flex', gap: 3, mt: 5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
              FOR THE EMPLOYER
            </Typography>
            <Box sx={styles.signatureBox}>
              <Typography variant="caption" color="text.secondary">
                Authorized Signatory
              </Typography>
              <Typography sx={{ mt: 2 }}>_________________________</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Name & Title
              </Typography>
              <Typography>_________________________</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Date
              </Typography>
              <Typography>_________________________</Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center', display: 'block', mt: 1 }}
            >
              Company Stamp
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
              FOR THE EMPLOYEE
            </Typography>
            <Box sx={styles.signatureBox}>
              <Typography variant="caption" color="text.secondary">
                Employee Signature
              </Typography>
              <Typography sx={{ mt: 2 }}>_________________________</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Name
              </Typography>
              <Typography fontWeight="bold">{employeeName}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Passport No.
              </Typography>
              <Typography fontWeight="bold">{passportNumber}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Date
              </Typography>
              <Typography>_________________________</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} IOTA Technologies. All Rights Reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
