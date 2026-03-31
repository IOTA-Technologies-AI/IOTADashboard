/**
 * NDA HTML Template — styled for Paged.js / browser print-to-PDF.
 *
 * Inject `<link rel="stylesheet">` for pagedjs/paged.polyfill.css
 * or call `Paged.preview()` from the page component.
 *
 * Props accepted by <NdaHtmlTemplate />:
 *  nda            — full NDA object from the backend
 *  showSignatures — whether to render embedded signature images (default true)
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

function SignatureBlock({ name, jobTitle, company, signedAt, signatureData, index, isPartner }) {
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
      <p style={sigMeta}>{jobTitle}</p>
      <p style={sigMeta}>{company}</p>
      <p style={sigMeta}>Date: {signedAt ? fmt(signedAt) : '___________'}</p>
    </div>
  );
}

// ----------------------------------------------------------------------

export default function NdaHtmlTemplate({ nda, showSignatures = true, showAuditTrail = true }) {
  if (!nda) return null;

  const effectiveDateStr = fmt(nda.effectiveDate);
  const expiryDateStr = nda.isPerpetual ? 'Perpetual' : fmt(nda.expiryDate);

  return (
    <div className="nda-document" style={documentWrap}>
      <style>{pagedCss}</style>

      {/* ── PAGE 1: COVER ── */}
      <div style={page}>
        {/* Top accent bar */}
        <div style={coverAccentBar} />

        <div style={coverPage}>
          {/* Logo + company name */}
          <div style={coverLogoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-full.png" alt="IOTA Technologies" style={coverLogoImg} />
          </div>

          {/* Document type badge */}
          <div style={coverBadgeWrap}>
            <span style={coverBadge}>CONFIDENTIAL</span>
          </div>

          {/* Title block */}
          <div style={coverTitleBlock}>
            <h1 style={coverH1}>Non-Disclosure Agreement</h1>
            <p style={coverSubtitle}>Mutual Confidentiality &amp; Non-Disclosure</p>
          </div>

          {/* Divider */}
          <div style={coverDivider} />

          {/* Meta table */}
          <div style={coverMeta}>
            <table style={coverTable}>
              <tbody>
                <tr>
                  <td style={coverTdLabel}>NDA Reference</td>
                  <td style={coverTdValue}>
                    <strong>{nda.ndaNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Effective Date</td>
                  <td style={coverTdValue}>{effectiveDateStr}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Expiry</td>
                  <td style={coverTdValue}>{expiryDateStr}</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Disclosing Party</td>
                  <td style={coverTdValue}>IOTA Technologies Company</td>
                </tr>
                <tr>
                  <td style={coverTdLabel}>Receiving Party</td>
                  <td style={coverTdValue}>{nda.partnerCompanyName}</td>
                </tr>
                {nda.partnerAddress && (
                  <tr>
                    <td style={coverTdLabel}>Partner Address</td>
                    <td style={coverTdValue}>{nda.partnerAddress}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Purpose */}
          {nda.purpose && (
            <p style={coverPurpose}>
              <em>{nda.purpose}</em>
            </p>
          )}
        </div>

        {/* Bottom footer strip */}
        <div style={coverFooter}>
          <span>IOTA Technologies Company · Confidential &amp; Proprietary</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>

      {/* ── PAGE 2: PARTIES & BACKGROUND ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
          <span style={pageHeaderRight}>{nda.ndaNumber}</span>
        </div>

        <h2 style={sectionHeading}>1. Parties</h2>
        <p style={body}>
          This Non-Disclosure Agreement (&ldquo;<strong>Agreement</strong>&rdquo;) is entered into
          as of <strong>{effectiveDateStr}</strong> (&ldquo;<strong>Effective Date</strong>
          &rdquo;) between:
        </p>
        <p style={body}>
          <strong>Disclosing Party:</strong> IOTA Technologies Company, a company registered in the
          Kingdom of Saudi Arabia (&ldquo;<strong>IOTA</strong>&rdquo;); and
        </p>
        <p style={body}>
          <strong>Receiving Party:</strong> {nda.partnerCompanyName}
          {nda.partnerAddress ? `, ${nda.partnerAddress}` : ''}.
        </p>
        <p style={body}>
          IOTA and the Recipient are referred to individually as a &ldquo;Party&rdquo; and
          collectively as the &ldquo;Parties&rdquo;.
        </p>

        <h2 style={sectionHeading}>2. Background</h2>
        <p style={body}>
          The Parties wish to explore a potential business relationship
          {nda.purpose ? ` in connection with: ${nda.purpose}` : ''} (the &ldquo;
          <strong>Purpose</strong>&rdquo;). In connection with the Purpose, each Party may disclose
          to the other certain confidential and proprietary information. The Parties wish to protect
          such information from disclosure to third parties and from unauthorized use, subject to
          the terms and conditions set forth herein.
        </p>

        <h2 style={sectionHeading}>3. Definitions</h2>
        {nda.sectionOverrides?.definitions ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.definitions}</p>
        ) : (
          <>
            <p style={body}>
              &ldquo;<strong>Confidential Information</strong>&rdquo; means any information
              disclosed by one Party (&ldquo;Disclosing Party&rdquo;) to the other (&ldquo;Receiving
              Party&rdquo;), directly or indirectly, in writing, orally, or by inspection of
              tangible objects, which is designated as confidential or that reasonably should be
              understood to be confidential given the nature of the information and the
              circumstances of disclosure. Confidential Information includes, without limitation:
              technical data, trade secrets, know-how, research, product plans, products, services,
              customer lists, markets, software, developments, inventions, processes, formulas,
              technology, designs, drawings, business plans, financial data, pricing, and any other
              business information.
            </p>
            <p style={body}>
              Confidential Information does not include information that (i) was already publicly
              known at the time of disclosure; (ii) becomes publicly known after disclosure through
              no fault of the Receiving Party; (iii) was already in the Receiving Party&apos;s
              possession free of restrictions prior to disclosure; or (iv) is independently
              developed by the Receiving Party without reference to the Confidential Information.
            </p>
          </>
        )}
      </div>

      {/* ── PAGE 3: OBLIGATIONS & EXCLUSIONS ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
          <span style={pageHeaderRight}>{nda.ndaNumber}</span>
        </div>

        <h2 style={sectionHeading}>4. Obligations of the Receiving Party</h2>
        {nda.sectionOverrides?.obligations ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.obligations}</p>
        ) : (
          <>
            <p style={body}>The Receiving Party agrees to:</p>
            <ol style={orderedList}>
              <li style={listItem}>
                Hold all Confidential Information in strict confidence and not disclose it to any
                third party without the prior written consent of the Disclosing Party.
              </li>
              <li style={listItem}>
                Use the Confidential Information solely for the Purpose and for no other purpose
                whatsoever.
              </li>
              <li style={listItem}>
                Limit access to the Confidential Information to its employees, contractors, and
                advisors who (a) have a need to know such information for the Purpose, and (b) are
                bound by confidentiality obligations no less restrictive than those herein.
              </li>
              <li style={listItem}>
                Protect the Confidential Information using at least the same degree of care it uses
                to protect its own confidential information, but no less than reasonable care.
              </li>
              <li style={listItem}>
                Promptly notify the Disclosing Party in writing upon becoming aware of any
                unauthorized disclosure, misappropriation, or use of the Confidential Information.
              </li>
            </ol>
          </>
        )}

        <h2 style={sectionHeading}>5. Exclusions from Confidentiality</h2>
        {nda.sectionOverrides?.exclusions ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.exclusions}</p>
        ) : (
          <>
            <p style={body}>
              The obligations of confidentiality under this Agreement do not apply to information
              that the Receiving Party can demonstrate:
            </p>
            <ol style={orderedList}>
              <li style={listItem}>
                Was already known to the Receiving Party at the time of disclosure without
                restriction;
              </li>
              <li style={listItem}>
                Is or becomes publicly available through no act or omission of the Receiving Party;
              </li>
              <li style={listItem}>
                Is rightfully obtained from a third party without restriction and without breach of
                this Agreement;
              </li>
              <li style={listItem}>
                Is required to be disclosed by applicable law, regulation, or court order, provided
                the Receiving Party gives the Disclosing Party prompt written notice prior to such
                disclosure and reasonably cooperates with any effort by the Disclosing Party to seek
                a protective order; or
              </li>
              <li style={listItem}>
                Is independently developed by the Receiving Party without use of or reference to the
                Confidential Information.
              </li>
            </ol>
          </>
        )}

        <h2 style={sectionHeading}>6. Term and Duration</h2>
        {nda.sectionOverrides?.termDuration ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.termDuration}</p>
        ) : (
          <p style={body}>
            This Agreement shall commence on the Effective Date and remain in force for a period of{' '}
            <strong>
              {nda.isPerpetual
                ? 'an indefinite period (perpetual)'
                : `${nda.durationYears} year${nda.durationYears !== 1 ? 's' : ''}`}
            </strong>
            {!nda.isPerpetual && (
              <>
                , unless earlier terminated by mutual written consent of the Parties. The Agreement
                shall therefore expire on <strong>{expiryDateStr}</strong>.
              </>
            )}
            . The obligations of confidentiality shall survive the expiration or termination of this
            Agreement for a further period of three (3) years.
          </p>
        )}
      </div>

      {/* ── PAGE 4: CONSEQUENCES & GENERAL PROVISIONS ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
          <span style={pageHeaderRight}>{nda.ndaNumber}</span>
        </div>

        <h2 style={sectionHeading}>7. Return or Destruction of Information</h2>
        {nda.sectionOverrides?.returnDestruction ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>
            {nda.sectionOverrides.returnDestruction}
          </p>
        ) : (
          <p style={body}>
            Upon written request by the Disclosing Party, or upon termination or expiration of this
            Agreement, the Receiving Party shall promptly return or, at the Disclosing Party&apos;s
            option, destroy all tangible materials embodying Confidential Information (in any form
            and including all copies and extracts). The Receiving Party shall certify in writing
            that it has complied with this obligation within ten (10) business days of such request.
          </p>
        )}

        <h2 style={sectionHeading}>8. Remedies</h2>
        {nda.sectionOverrides?.remedies ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.remedies}</p>
        ) : (
          <p style={body}>
            The Parties acknowledge that any breach of this Agreement may cause irreparable harm to
            the Disclosing Party for which monetary damages would be an inadequate remedy.
            Accordingly, in addition to any other legal or equitable remedies that may be available,
            the Disclosing Party shall be entitled to seek injunctive or other equitable relief to
            prevent any actual or threatened breach of this Agreement, without the requirement of
            posting any bond or other security.
          </p>
        )}

        <h2 style={sectionHeading}>9. No License</h2>
        {nda.sectionOverrides?.noLicense ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{nda.sectionOverrides.noLicense}</p>
        ) : (
          <p style={body}>
            Nothing in this Agreement shall be construed to grant either Party any right, title,
            interest, or license in or to the Confidential Information of the other Party, or any
            intellectual property rights therein. Any use of Confidential Information beyond the
            Purpose requires the prior written consent of the Disclosing Party.
          </p>
        )}

        <h2 style={sectionHeading}>10. General Provisions</h2>
        {nda.sectionOverrides?.generalProvisions ? (
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>
            {nda.sectionOverrides.generalProvisions}
          </p>
        ) : (
          <ol style={orderedList}>
            <li style={listItem}>
              <strong>Governing Law.</strong> This Agreement shall be governed by and construed in
              accordance with the laws of the Kingdom of Saudi Arabia. Any dispute arising out of or
              in connection with this Agreement shall be subject to the exclusive jurisdiction of
              the courts of Riyadh, Saudi Arabia.
            </li>
            <li style={listItem}>
              <strong>Entire Agreement.</strong> This Agreement constitutes the entire understanding
              between the Parties with respect to its subject matter and supersedes all prior
              negotiations, understandings, and agreements, whether written or oral.
            </li>
            <li style={listItem}>
              <strong>Amendments.</strong> No amendment or modification of this Agreement shall be
              valid unless made in writing and signed by both Parties.
            </li>
            <li style={listItem}>
              <strong>Severability.</strong> If any provision of this Agreement is found to be
              unenforceable, invalid, or illegal, that provision shall be modified to the minimum
              extent necessary to make it enforceable, and the remaining provisions shall continue
              in full force and effect.
            </li>
            <li style={listItem}>
              <strong>Waiver.</strong> Failure by either Party to enforce any provision of this
              Agreement shall not constitute a waiver of that Party&apos;s right to enforce such
              provision in the future.
            </li>
            <li style={listItem}>
              <strong>Counterparts.</strong> This Agreement may be executed in counterparts,
              including electronic form, each of which shall be deemed an original and all of which
              together shall constitute one and the same instrument. Electronic signatures shall be
              deemed valid and binding.
            </li>
            <li style={listItem}>
              <strong>Notices.</strong> All notices under this Agreement shall be in writing and
              delivered by email with acknowledgment of receipt to the representative signatories
              listed below.
            </li>
          </ol>
        )}
      </div>

      {/* ── ADDITIONAL CLAUSES (rendered only if custom clauses exist) ── */}
      {nda.clauses && nda.clauses.length > 0 && (
        <div style={page}>
          <div style={pageHeader}>
            <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
            <span style={pageHeaderRight}>{nda.ndaNumber}</span>
          </div>
          <h2 style={sectionHeading}>Additional Provisions</h2>
          <p style={body}>
            The following provisions form an integral part of this Agreement and supplement the
            standard terms set out above.
          </p>
          {nda.clauses.map((clause, i) => (
            <div key={i}>
              <h3 style={clauseHeading}>{clause.title || `Clause ${i + 1}`}</h3>
              <p style={body}>{clause.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── PAGE 5: IOTA SIGNATURES ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
          <span style={pageHeaderRight}>{nda.ndaNumber}</span>
        </div>

        <h2 style={sectionHeading}>11. Signatures — IOTA Technologies</h2>
        <p style={body}>
          In witness whereof, the authorized representatives of IOTA Technologies have executed this
          Agreement as of the dates indicated below.
        </p>

        <div style={sigGrid}>
          {nda.iotaSignatories.map((s, i) => (
            <SignatureBlock
              key={i}
              name={s.name}
              jobTitle={s.jobTitle}
              company="IOTA Technologies Company"
              signedAt={showSignatures ? s.signedAt : null}
              signatureData={showSignatures ? s.signatureData : null}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── PAGE 6: PARTNER SIGNATURES ── */}
      <div style={page}>
        <div style={pageHeader}>
          <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
          <span style={pageHeaderRight}>{nda.ndaNumber}</span>
        </div>

        <h2 style={sectionHeading}>12. Signatures — {nda.partnerCompanyName}</h2>
        <p style={body}>
          In witness whereof, the authorized representatives of {nda.partnerCompanyName} have
          executed this Agreement as of the dates indicated below.
        </p>

        <div style={sigGrid}>
          {nda.partnerSignatories.map((s, i) => (
            <SignatureBlock
              key={i}
              name={s.name}
              jobTitle={s.jobTitle}
              company={nda.partnerCompanyName}
              signedAt={showSignatures ? s.signedAt : null}
              signatureData={showSignatures ? s.signatureData : null}
              index={i}
              isPartner
            />
          ))}
        </div>
      </div>

      {/* ── PAGE 7: AUDIT TRAIL ── */}
      {showAuditTrail && showSignatures && nda.auditLog && nda.auditLog.length > 0 && (
        <div className="nda-audit-trail" style={page}>
          <div style={pageHeader}>
            <span style={pageHeaderTitle}>Non-Disclosure Agreement</span>
            <span style={pageHeaderRight}>{nda.ndaNumber}</span>
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
              {nda.auditLog.map((entry, i) => (
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
            This audit trail was generated automatically by IOTA Technologies&apos; NDA management
            system. NDA Reference: {nda.ndaNumber}.
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
const pageHeaderRight = {};

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
  background: '#b91c1c',
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

const coverPurpose = {
  fontSize: 12.5,
  color: '#666',
  fontFamily: "'Inter', Arial, sans-serif",
  maxWidth: 460,
  textAlign: 'center',
  lineHeight: 1.7,
  fontStyle: 'italic',
  borderLeft: '3px solid #4a9fd4',
  paddingLeft: 14,
  margin: 0,
  textAlign: 'left',
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
const clauseHeading = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1a3c5e',
  marginTop: 20,
  marginBottom: 6,
  fontFamily: "'Inter', Arial, sans-serif",
};

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
    content: "IOTA Technologies — Non-Disclosure Agreement";
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
  .nda-document > div { page-break-after: always; }
  .nda-audit-trail { display: none !important; }
}
`;
