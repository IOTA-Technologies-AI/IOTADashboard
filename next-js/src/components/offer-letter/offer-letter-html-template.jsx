/**
 * Offer Letter HTML Template — styled for Paged.js / browser print-to-PDF.
 *
 * Inject `<link rel="stylesheet">` for pagedjs/paged.polyfill.css
 * or call `Paged.preview()` from the page component.
 *
 * Props accepted by <OfferLetterHtmlTemplate />:
 *  offer          — full Offer object from the backend
 *  showSignatures — whether to render embedded signature images (default true)
 *  showAuditTrail — whether to render the audit trail page (default true)
 */

'use client';

// ----------------------------------------------------------------------

const fmt = (dateStr) => {
  if (!dateStr) return '___________';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const fmtCurrency = (amount, currency = 'SAR') => {
  if (amount === undefined || amount === null) return '—';
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

function SignatureBlock({ name, jobTitle, company, signedAt, signatureData, index }) {
  return (
    <div className="sig-block" style={sigBlock}>
      {signatureData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signatureData} alt={`Signature of ${name}`} style={sigImage} />
      ) : (
        <div style={sigPlaceholder} />
      )}
      <div style={sigLine} />
      <p style={sigName}>{name || `Signatory ${index + 1}`}</p>
      {jobTitle && <p style={sigMeta}>{jobTitle}</p>}
      {company && <p style={sigMeta}>{company}</p>}
      <p style={sigMeta}>Date: {signedAt ? fmt(signedAt) : '___________'}</p>
    </div>
  );
}

// ----------------------------------------------------------------------

export default function OfferLetterHtmlTemplate({
  offer,
  showSignatures = true,
  showAuditTrail = true,
}) {
  if (!offer) return null;

  const cur = offer.currency || 'SAR';
  const startDateStr = fmt(offer.startDate);

  return (
    <div className="offer-document" style={documentWrap}>
      <style>{pagedCss}</style>

      {/* ── PAGE 1: COVER ── */}
      <div style={page}>
        {/* Top accent bar */}
        <div style={coverAccentBar} />

        <div style={coverPage}>
          {/* Logo */}
          <div style={coverLogoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-full.png" alt="IOTA Technologies" style={coverLogoImg} />
          </div>

          {/* Document type badge */}
          <div style={coverBadgeWrap}>
            <span style={coverBadge}>OFFER OF EMPLOYMENT</span>
          </div>

          {/* Title block */}
          <div style={coverTitleBlock}>
            <h1 style={coverH1}>Offer of Employment</h1>
            <p style={coverSubtitle}>Employment Agreement</p>
          </div>

          {/* Divider */}
          <div style={coverDivider} />

          {/* Meta table */}
          <div style={coverMeta}>
            <table style={coverTable}>
              <tbody>
                <tr>
                  <td style={coverTdLabel}>Contract No.</td>
                  <td style={coverTdValue}>
                    <strong>{offer.contractNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Candidate Name</td>
                  <td style={coverTdValue}>{offer.candidateName}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Position</td>
                  <td style={coverTdValue}>{offer.position}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Department</td>
                  <td style={coverTdValue}>{offer.department}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Contract Type</td>
                  <td style={coverTdValue}>{offer.contractType}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Start Date</td>
                  <td style={coverTdValue}>{startDateStr}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Currency</td>
                  <td style={coverTdValue}>{cur}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom footer strip */}
        <div style={coverFooter}>
          <span>IOTA Technologies Company · Confidential &amp; Proprietary</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>

      {/* ── PAGE 2: PARTIES & POSITION ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Offer of Employment</span>
          <span style={pageHeaderRight}>{offer.contractNumber}</span>
        </div>

        <h2 style={sectionHeading}>1. The Offer</h2>
        <p style={body}>
          IOTA Technologies Company (&ldquo;<strong>IOTA</strong>&rdquo; or &ldquo;
          <strong>the Company</strong>&rdquo;), a company registered in the Kingdom of Saudi Arabia,
          is pleased to offer employment to <strong>{offer.candidateName}</strong> (&ldquo;
          <strong>the Employee</strong>&rdquo;) on the terms and conditions set out in this
          Employment Offer Letter (&ldquo;<strong>the Agreement</strong>&rdquo;).
        </p>
        <p style={body}>
          This offer is subject to satisfactory completion of all required documentation,
          background verification, and immigration formalities (where applicable). Employment shall
          commence on <strong>{startDateStr}</strong>, or on such other date as mutually agreed in
          writing.
        </p>

        <h2 style={sectionHeading}>2. Candidate Information</h2>
        <table style={detailTable}>
          <tbody>
            <tr>
              <td style={detailTdLabel}>Full Name</td>
              <td style={detailTdValue}>{offer.candidateName}</td>
            </tr>
            {offer.passportNumber && (
              <tr>
                <td style={detailTdLabel}>Passport No.</td>
                <td style={detailTdValue}>{offer.passportNumber}</td>
              </tr>
            )}
            {offer.dateOfBirth && (
              <tr>
                <td style={detailTdLabel}>Date of Birth</td>
                <td style={detailTdValue}>{fmt(offer.dateOfBirth)}</td>
              </tr>
            )}
            {offer.nationality && (
              <tr>
                <td style={detailTdLabel}>Nationality</td>
                <td style={detailTdValue}>{offer.nationality}</td>
              </tr>
            )}
            <tr>
              <td style={detailTdLabel}>Email Address</td>
              <td style={detailTdValue}>{offer.candidateEmail}</td>
            </tr>
          </tbody>
        </table>

        <h2 style={sectionHeading}>3. Position &amp; Duties</h2>
        <p style={body}>
          The Employee shall be employed in the position of <strong>{offer.position}</strong> within
          the <strong>{offer.department}</strong> department. The Employee agrees to diligently
          perform all duties and responsibilities assigned by the Company from time to time, and to
          comply with the Company&apos;s policies, procedures, and applicable regulations.
        </p>
        <p style={body}>
          The Employee shall carry out such duties as are reasonably required by the Company and
          shall devote their full working time and attention to the business of the Company. The
          Employee shall not undertake any other paid employment or consultancy without prior
          written consent from the Company.
        </p>

        <h2 style={sectionHeading}>4. Contract Type &amp; Duration</h2>
        <p style={body}>
          This is a <strong>{offer.contractType}</strong> contract
          {offer.contractType === 'Limited' && offer.contractDuration
            ? ` with an initial term of ${offer.contractDuration} month${offer.contractDuration !== 1 ? 's' : ''} commencing on ${startDateStr}`
            : ' with no fixed end date'}
          . The contract is subject to the Labor Law of the Kingdom of Saudi Arabia and the
          Company&apos;s internal regulations.
        </p>
        {offer.contractType === 'Limited' && (
          <p style={body}>
            Upon expiry of the initial term, the contract may be renewed by mutual written
            agreement. If the contract is renewed twice or the combined duration exceeds four years,
            it shall be deemed an unlimited contract under applicable law.
          </p>
        )}
      </div>

      {/* ── PAGE 3: COMPENSATION & BENEFITS ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Offer of Employment</span>
          <span style={pageHeaderRight}>{offer.contractNumber}</span>
        </div>

        <h2 style={sectionHeading}>5. Compensation</h2>
        <p style={body}>
          The Employee shall receive the following monthly compensation, payable in{' '}
          <strong>{cur}</strong> on the last working day of each calendar month:
        </p>

        <table style={salaryTable}>
          <thead>
            <tr>
              <th style={salaryTh}>Component</th>
              <th style={{ ...salaryTh, textAlign: 'right' }}>Monthly Amount ({cur})</th>
            </tr>
          </thead>
          <tbody>
            <tr style={salaryRowEven}>
              <td style={salaryTd}>Basic Salary</td>
              <td style={{ ...salaryTd, textAlign: 'right' }}>
                {fmtCurrency(offer.basicSalary, cur)}
              </td>
            </tr>
            <tr style={salaryRowOdd}>
              <td style={salaryTd}>Housing Allowance</td>
              <td style={{ ...salaryTd, textAlign: 'right' }}>
                {fmtCurrency(offer.housingAllowance, cur)}
              </td>
            </tr>
            <tr style={salaryRowEven}>
              <td style={salaryTd}>Transportation Allowance</td>
              <td style={{ ...salaryTd, textAlign: 'right' }}>
                {fmtCurrency(offer.transportationAllowance, cur)}
              </td>
            </tr>
            {Number(offer.otherAllowances) > 0 && (
              <tr style={salaryRowOdd}>
                <td style={salaryTd}>Other Allowances</td>
                <td style={{ ...salaryTd, textAlign: 'right' }}>
                  {fmtCurrency(offer.otherAllowances, cur)}
                </td>
              </tr>
            )}
            <tr>
              <td style={salaryTotalTd}>
                <strong>Total Monthly Package</strong>
              </td>
              <td style={{ ...salaryTotalTd, textAlign: 'right' }}>
                <strong>{fmtCurrency(offer.totalSalary, cur)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ ...body, marginTop: 16 }}>
          The above compensation is inclusive of all legally mandated allowances and is subject to
          applicable deductions under Saudi Labor Law, including contributions to the General
          Organization for Social Insurance (GOSI) where required.
        </p>

        <h2 style={sectionHeading}>6. Benefits</h2>
        <ol style={orderedList}>
          <li style={listItem}>
            <strong>Annual Air Ticket:</strong> The Employee is entitled to one round-trip air
            ticket to their home country per year of service, in accordance with Company policy.
          </li>
          <li style={listItem}>
            <strong>Medical Insurance:</strong> The Employee and eligible dependents shall be
            covered under the Company&apos;s group medical insurance plan in accordance with the
            applicable policy terms and conditions.
          </li>
          <li style={listItem}>
            <strong>End of Service Gratuity:</strong> Upon completion of one or more full years of
            service, the Employee shall be entitled to an end-of-service gratuity calculated in
            accordance with the Saudi Labor Law.
          </li>
          <li style={listItem}>
            <strong>GOSI:</strong> The Company shall make the required employer contributions to the
            General Organization for Social Insurance (GOSI) on behalf of the Employee as
            prescribed by applicable regulations.
          </li>
        </ol>
      </div>

      {/* ── PAGE 4: EMPLOYMENT CONDITIONS ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Offer of Employment</span>
          <span style={pageHeaderRight}>{offer.contractNumber}</span>
        </div>

        <h2 style={sectionHeading}>7. Working Hours</h2>
        <p style={body}>
          The Employee&apos;s standard working hours shall be{' '}
          <strong>
            {offer.workingHours ? `${offer.workingHours} hours per week` : '48 hours per week'}
          </strong>
          , distributed over five working days (Sunday through Thursday unless otherwise stated),
          subject to the Company&apos;s operational requirements. The Company reserves the right to
          adjust working hours in accordance with operational needs and applicable law.
        </p>
        <p style={body}>
          During the Holy Month of Ramadan, working hours shall be reduced as required by Saudi
          Labor Law. Overtime, if required, shall be compensated in accordance with the Labor Law
          of the Kingdom of Saudi Arabia.
        </p>

        <h2 style={sectionHeading}>8. Annual Leave</h2>
        <p style={body}>
          The Employee shall be entitled to{' '}
          <strong>
            {offer.annualLeaveDays ? `${offer.annualLeaveDays} working days` : '21 working days'}
          </strong>{' '}
          of paid annual leave per year of service, accruing from the date of joining. Annual leave
          entitlement increases to 30 days per year upon completion of five (5) consecutive years
          of service with the Company, in accordance with Saudi Labor Law.
        </p>
        <p style={body}>
          Annual leave must be taken at a time agreed with the Employee&apos;s line manager and
          approved in advance. Unused annual leave may be carried forward or encashed at the
          Company&apos;s discretion and in accordance with Company policy.
        </p>

        <h2 style={sectionHeading}>9. Probation Period</h2>
        <p style={body}>
          The Employee&apos;s employment is subject to a probation period of{' '}
          <strong>
            {offer.probationPeriod
              ? `${offer.probationPeriod} month${offer.probationPeriod !== 1 ? 's' : ''}`
              : '3 months'}
          </strong>{' '}
          commencing on the start date. During the probation period, either party may terminate
          the employment with one (1) week&apos;s written notice. Upon satisfactory completion of
          probation, the Employee&apos;s employment shall be confirmed.
        </p>

        <h2 style={sectionHeading}>10. Notice Period</h2>
        <p style={body}>
          Following successful completion of the probation period, either party may terminate this
          Agreement by giving{' '}
          <strong>
            {offer.noticePeriod
              ? `${offer.noticePeriod} days`
              : '30 days'}
          </strong>{' '}
          written notice to the other party, or by payment in lieu of notice at the Company&apos;s
          discretion. Termination for gross misconduct may be effected immediately without notice,
          in accordance with Saudi Labor Law.
        </p>

        <h2 style={sectionHeading}>11. Confidentiality &amp; Intellectual Property</h2>
        <p style={body}>
          The Employee agrees to maintain strict confidentiality with respect to all proprietary
          information, trade secrets, business strategies, client data, and other confidential
          information of the Company, both during and after the term of employment. Any
          intellectual property created by the Employee in the course of their duties shall belong
          exclusively to the Company.
        </p>

        <h2 style={sectionHeading}>12. Governing Law</h2>
        <p style={body}>
          This Agreement shall be governed by and construed in accordance with the Labor Law of the
          Kingdom of Saudi Arabia and all applicable regulations issued thereunder. Any dispute
          arising out of or in connection with this Agreement shall be referred to the competent
          Labor Courts of the Kingdom of Saudi Arabia.
        </p>
        <p style={body}>
          By accepting this offer, the Employee acknowledges that they have read, understood, and
          agree to all the terms and conditions set out in this Agreement.
        </p>
      </div>

      {/* ── ADDITIONAL CLAUSES (rendered only if custom clauses exist) ── */}
      {offer.clauses && offer.clauses.length > 0 && (
        <div style={page}>
          <div style={pageHeader}>
            <span style={pageHeaderTitle}>Offer of Employment</span>
            <span style={pageHeaderRight}>{offer.contractNumber}</span>
          </div>
          <h2 style={sectionHeading}>Additional Terms &amp; Conditions</h2>
          <p style={body}>
            The following provisions form an integral part of this Agreement and supplement the
            standard terms set out above.
          </p>
          {offer.clauses.map((clause, i) => (
            <div key={i}>
              <h3 style={clauseHeading}>{clause.title || `Clause ${i + 1}`}</h3>
              <p style={body}>{clause.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── IOTA SIGNATURES PAGE ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Offer of Employment</span>
          <span style={pageHeaderRight}>{offer.contractNumber}</span>
        </div>

        <h2 style={sectionHeading}>Signatures — IOTA Technologies Company</h2>
        <p style={body}>
          In witness whereof, the authorised representatives of IOTA Technologies Company have
          executed this Offer of Employment on behalf of the Company as of the dates indicated
          below.
        </p>

        {offer.iotaSignatories && offer.iotaSignatories.length > 0 ? (
          <div style={sigGrid}>
            {offer.iotaSignatories.map((s, i) => (
              <SignatureBlock
                key={i}
                name={s.name}
                jobTitle={s.title}
                company="IOTA Technologies Company"
                signedAt={showSignatures ? s.signedAt : null}
                signatureData={showSignatures ? s.signatureData : null}
                index={i}
              />
            ))}
          </div>
        ) : (
          <p style={{ ...body, color: '#888', fontStyle: 'italic' }}>
            No IOTA signatories configured for this offer.
          </p>
        )}
      </div>

      {/* ── EMPLOYEE SIGNATURE PAGE ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Offer of Employment</span>
          <span style={pageHeaderRight}>{offer.contractNumber}</span>
        </div>

        <h2 style={sectionHeading}>Acceptance — {offer.candidateName}</h2>
        <p style={body}>
          I, <strong>{offer.candidateName}</strong>, hereby confirm that I have read, understood,
          and accept all the terms and conditions of this Offer of Employment. I agree to commence
          employment with IOTA Technologies Company on <strong>{startDateStr}</strong>, subject to
          the completion of all required pre-employment formalities.
        </p>

        <div style={sigGrid}>
          <SignatureBlock
            name={offer.candidateName}
            jobTitle={offer.position}
            company={null}
            signedAt={showSignatures ? offer.employeeSignedAt : null}
            signatureData={showSignatures ? offer.employeeSignatureData : null}
            index={0}
          />
        </div>
      </div>

      {/* ── AUDIT TRAIL ── */}
      {showAuditTrail && showSignatures && offer.auditLog && offer.auditLog.length > 0 && (
        <div className="offer-audit-trail" style={page}>
          <div style={pageHeader}>
            <span style={pageHeaderTitle}>Offer of Employment</span>
            <span style={pageHeaderRight}>{offer.contractNumber}</span>
          </div>

          <h2 style={sectionHeading}>Audit Trail &amp; Certificate of Execution</h2>
          <p style={body}>
            The following log records all significant events in the lifecycle of this Agreement,
            constituting a legally admissible audit trail under applicable electronic signature
            regulations.
          </p>

          <table style={auditTable}>
            <thead>
              <tr>
                <th style={auditTh}>Timestamp (UTC)</th>
                <th style={auditTh}>Action</th>
                <th style={auditTh}>Performed By</th>
                <th style={auditTh}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {offer.auditLog.map((entry, i) => (
                <tr key={i} style={i % 2 === 0 ? auditRowEven : auditRowOdd}>
                  <td style={auditTd}>{new Date(entry.performedAt).toUTCString()}</td>
                  <td style={auditTd}>{entry.action.replace(/_/g, ' ')}</td>
                  <td style={auditTd}>{entry.performedBy}</td>
                  <td style={auditTd}>{entry.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ ...body, marginTop: 24, fontSize: 11, color: '#888' }}>
            This audit trail was generated automatically by IOTA Technologies&apos; Offer
            Management system. Contract Reference: {offer.contractNumber}.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────

const documentWrap = {
  fontFamily: "'Georgia', 'Times New Roman', serif",
  color: '#1a1a1a',
  background: '#fff',
};

const page = {
  width: '210mm',
  minHeight: '297mm',
  margin: '0 auto',
  padding: '20mm 22mm',
  boxSizing: 'border-box',
  pageBreakAfter: 'always',
  background: '#fff',
  position: 'relative',
};

const pageHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid #c0ccd7',
  paddingBottom: 8,
  marginBottom: 24,
  fontSize: 10,
  color: '#888',
  fontFamily: "'Inter', Arial, sans-serif",
};

const pageHeaderTitle = { fontWeight: 600 };

// Cover page styles
const coverAccentBar = {
  height: 6,
  background: 'linear-gradient(90deg, #1a3c5e 0%, #2e6da4 60%, #4a9fd4 100%)',
  borderRadius: '2px 2px 0 0',
  marginBottom: 0,
};

const coverPage = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100% - 60px)',
  gap: 28,
  textAlign: 'center',
  padding: '40px 0 20px',
};

const coverLogoRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  marginBottom: 4,
};

const coverLogoImg = {
  height: 52,
  objectFit: 'contain',
};

const coverBadgeWrap = {
  display: 'flex',
  justifyContent: 'center',
};

const coverBadge = {
  display: 'inline-block',
  padding: '4px 18px',
  background: '#1a5c2a',
  color: '#fff',
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontFamily: "'Inter', Arial, sans-serif",
  fontWeight: 700,
  borderRadius: 2,
};

const coverTitleBlock = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const coverDivider = {
  width: 80,
  height: 3,
  background: 'linear-gradient(90deg, #1a3c5e, #4a9fd4)',
  borderRadius: 2,
  margin: '0 auto',
};

const coverH1 = {
  fontSize: 30,
  fontWeight: 800,
  color: '#0d1b2a',
  margin: 0,
  letterSpacing: '-0.5px',
  fontFamily: "'Inter', Arial, sans-serif",
};

const coverSubtitle = {
  fontSize: 13,
  color: '#5a7a96',
  margin: 0,
  fontFamily: "'Inter', Arial, sans-serif",
  fontWeight: 500,
};

const coverMeta = { width: '100%', maxWidth: 460 };

const coverTable = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 13,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  borderRadius: 6,
  overflow: 'hidden',
};

const coverTdLabel = {
  padding: '10px 18px',
  color: '#5a7a96',
  fontWeight: 600,
  width: '38%',
  borderBottom: '1px solid #e8edf2',
  background: '#f5f8fb',
  textAlign: 'left',
  fontSize: 12,
};

const coverTdValue = {
  padding: '10px 18px',
  color: '#0d1b2a',
  borderBottom: '1px solid #e8edf2',
  textAlign: 'left',
  background: '#fff',
  fontSize: 13,
};

const coverFooter = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTop: '1px solid #e0e6ed',
  paddingTop: 12,
  fontSize: 10,
  color: '#999',
  fontFamily: "'Inter', Arial, sans-serif",
  marginTop: 'auto',
};

// Body content styles
const sectionHeading = {
  fontSize: 15,
  fontWeight: 700,
  color: '#0d1b2a',
  marginTop: 28,
  marginBottom: 10,
  fontFamily: "'Inter', Arial, sans-serif",
  borderBottom: '1px solid #e8ecf0',
  paddingBottom: 4,
};

const clauseHeading = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1a3c5e',
  marginTop: 20,
  marginBottom: 6,
  fontFamily: "'Inter', Arial, sans-serif",
};

const body = {
  fontSize: 12.5,
  lineHeight: 1.75,
  color: '#333',
  marginBottom: 12,
  textAlign: 'justify',
};

const orderedList = {
  paddingLeft: 20,
  marginBottom: 12,
};

const listItem = {
  fontSize: 12.5,
  lineHeight: 1.75,
  color: '#333',
  marginBottom: 8,
};

// Detail table (candidate info)
const detailTable = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 12.5,
  marginBottom: 16,
  border: '1px solid #e8edf2',
};

const detailTdLabel = {
  padding: '8px 14px',
  color: '#5a7a96',
  fontWeight: 600,
  width: '35%',
  borderBottom: '1px solid #e8edf2',
  background: '#f5f8fb',
  fontSize: 12,
};

const detailTdValue = {
  padding: '8px 14px',
  color: '#0d1b2a',
  borderBottom: '1px solid #e8edf2',
  background: '#fff',
  fontSize: 12.5,
};

// Salary table
const salaryTable = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 12.5,
  marginBottom: 16,
  border: '1px solid #e8edf2',
};

const salaryTh = {
  background: '#0d1b2a',
  color: '#fff',
  padding: '9px 14px',
  fontWeight: 600,
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 12,
};

const salaryTd = {
  padding: '8px 14px',
  verticalAlign: 'middle',
  color: '#333',
  borderBottom: '1px solid #e8edf2',
};

const salaryRowEven = { background: '#f8f9fb' };
const salaryRowOdd = { background: '#fff' };

const salaryTotalTd = {
  padding: '10px 14px',
  verticalAlign: 'middle',
  color: '#0d1b2a',
  borderTop: '2px solid #1a3c5e',
  background: '#eef3f8',
};

// Signature block styles
const sigGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 32,
  marginTop: 32,
};

const sigBlock = {
  minWidth: 180,
};

const sigImage = {
  maxWidth: 180,
  maxHeight: 64,
  display: 'block',
  marginBottom: 4,
};

const sigPlaceholder = {
  width: 180,
  height: 64,
  borderBottom: '1px solid #999',
  marginBottom: 4,
};

const sigLine = {
  borderTop: '1px solid #333',
  marginBottom: 6,
  width: '100%',
};

const sigName = {
  margin: '0 0 2px 0',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "'Inter', Arial, sans-serif",
};

const sigMeta = {
  margin: '0 0 2px 0',
  fontSize: 11,
  color: '#555',
  fontFamily: "'Inter', Arial, sans-serif",
};

// Audit table
const auditTable = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
  fontFamily: "'Inter', Arial, sans-serif",
  marginTop: 16,
};

const auditTh = {
  background: '#0d1b2a',
  color: '#fff',
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 600,
};

const auditTd = {
  padding: '7px 10px',
  verticalAlign: 'top',
};

const auditRowEven = { background: '#f8f9fb' };
const auditRowOdd = { background: '#fff' };

// Paged.js print CSS rules (injected via <style>)
const pagedCss = `
@page {
  size: A4;
  margin: 20mm 22mm;
  @top-center {
    content: "IOTA Technologies — Offer of Employment";
    font-size: 9pt;
    color: #888;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #888;
  }
}
@media print {
  body { margin: 0; }
  .offer-document > div { page-break-after: always; }
  .offer-audit-trail { display: none !important; }
}
`;
