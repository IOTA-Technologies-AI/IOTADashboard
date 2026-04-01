'use client';

/**
 * NdaPdfDocument — renders the full NDA as a proper PDF using @react-pdf/renderer.
 * Used by handleFinalize in the NDA detail page to generate a real PDF blob for
 * OneDrive upload instead of serialising the HTML template.
 */

import { Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dateStr) => {
  if (!dateStr) return '___________';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/** Renders pre-wrap text (section overrides may contain newlines). */
function PreText({ children, style }) {
  if (!children) return null;
  const lines = String(children).split('\n');
  return (
    <View>
      {lines.map((line, i) => (
        <Text key={i} style={[S.body, style]}>
          {line || ' '}
        </Text>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 60,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  // Running header (fixed = repeats on overflow pages)
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#c0ccd7',
    paddingBottom: 5,
    marginBottom: 18,
    fontSize: 8,
    color: '#888888',
    fontFamily: 'Helvetica',
  },
  pageHeaderBold: { fontFamily: 'Helvetica-Bold' },

  // Section headings
  h2: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11.5,
    marginBottom: 6,
    marginTop: 14,
    color: '#1a3c5e',
  },
  h3: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    marginBottom: 4,
    marginTop: 10,
  },
  body: {
    lineHeight: 1.55,
    marginBottom: 7,
  },
  bold: { fontFamily: 'Times-Bold' },

  // Numbered list
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  listNumber: { width: 20 },
  listBody: { flex: 1, lineHeight: 1.55 },

  // ── Cover page ──
  coverAccentBar: {
    height: 6,
    backgroundColor: '#1a3c5e',
    marginHorizontal: -60,
    marginTop: -52,
    marginBottom: 0,
  },
  coverPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  coverBadge: {
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    fontSize: 8,
    letterSpacing: 2,
    paddingVertical: 3,
    paddingHorizontal: 14,
    marginBottom: 22,
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 24,
    color: '#1a3c5e',
    marginBottom: 6,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#555555',
    marginBottom: 22,
    textAlign: 'center',
  },
  coverDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#c0ccd7',
    width: '80%',
    marginBottom: 22,
    alignSelf: 'center',
  },
  coverTable: { width: '82%', alignSelf: 'center', marginBottom: 18 },
  coverRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
  },
  coverLabel: { width: '35%', fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#555555' },
  coverValue: { flex: 1, fontSize: 9 },
  coverPurpose: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    color: '#555555',
    textAlign: 'center',
    width: '80%',
    alignSelf: 'center',
    marginTop: 8,
  },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#c0ccd7',
    paddingTop: 8,
    marginTop: 20,
    fontSize: 8,
    color: '#888888',
    fontFamily: 'Helvetica',
  },

  // ── Signature blocks ──
  sigGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  sigBlock: { width: '47%', marginBottom: 24, marginRight: '3%' },
  sigImage: { height: 50, width: 160, objectFit: 'contain', marginBottom: 4 },
  sigPlaceholder: { height: 50, marginBottom: 4 },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginBottom: 5,
    width: '90%',
  },
  sigName: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, marginBottom: 2 },
  sigMeta: { fontSize: 9, color: '#555555', marginBottom: 1 },

  // ── Audit table ──
  auditTable: { marginTop: 12 },
  auditHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1a3c5e',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  auditRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  auditRowAlt: { backgroundColor: '#f8fafc' },
  auditHeaderCell: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#ffffff' },
  auditCell: { fontSize: 7.5, color: '#333333' },
  auditCol0: { width: '23%' },
  auditCol1: { width: '22%' },
  auditCol2: { width: '22%' },
  auditCol3: { flex: 1 },
  footerNote: { fontSize: 8, color: '#888888', marginTop: 16, fontFamily: 'Helvetica' },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function RunningHeader({ ndaNumber }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text style={S.pageHeaderBold}>Non-Disclosure Agreement</Text>
      <Text>{ndaNumber}</Text>
    </View>
  );
}

function SectionHeading({ children }) {
  return <Text style={S.h2}>{children}</Text>;
}

function BodyText({ children, style }) {
  return <Text style={[S.body, style]}>{children}</Text>;
}

function NumberedList({ items }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={S.listItem}>
          <Text style={S.listNumber}>{i + 1}.</Text>
          <Text style={S.listBody}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SigBlock({ name, jobTitle, company, signedAt, signatureData, index }) {
  return (
    <View style={S.sigBlock}>
      {signatureData ? (
        <Image src={signatureData} style={S.sigImage} />
      ) : (
        <View style={S.sigPlaceholder} />
      )}
      <View style={S.sigLine} />
      <Text style={S.sigName}>{name || `Signatory ${index + 1}`}</Text>
      {!!jobTitle && <Text style={S.sigMeta}>{jobTitle}</Text>}
      <Text style={S.sigMeta}>{company}</Text>
      <Text style={S.sigMeta}>Date: {signedAt ? fmt(signedAt) : '___________'}</Text>
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

export default function NdaPdfDocument({ nda }) {
  if (!nda) return null;

  const effectiveDateStr = fmt(nda.effectiveDate);
  const expiryDateStr = nda.isPerpetual ? 'Perpetual' : fmt(nda.expiryDate);
  const so = nda.sectionOverrides || {};

  return (
    <Document>
      {/* ══ COVER PAGE ══ */}
      <Page size="A4" style={S.page}>
        <View style={S.coverAccentBar} />
        <View style={S.coverPage}>
          <Text style={S.coverBadge}>CONFIDENTIAL</Text>
          <Text style={S.coverTitle}>Non-Disclosure Agreement</Text>
          <Text style={S.coverSubtitle}>Mutual Confidentiality & Non-Disclosure</Text>
          <View style={S.coverDivider} />
          <View style={S.coverTable}>
            <View style={S.coverRow}>
              <Text style={S.coverLabel}>NDA Reference</Text>
              <Text style={S.coverValue}>{nda.ndaNumber}</Text>
            </View>
            <View style={S.coverRow}>
              <Text style={S.coverLabel}>Effective Date</Text>
              <Text style={S.coverValue}>{effectiveDateStr}</Text>
            </View>
            <View style={S.coverRow}>
              <Text style={S.coverLabel}>Expiry</Text>
              <Text style={S.coverValue}>{expiryDateStr}</Text>
            </View>
            <View style={S.coverRow}>
              <Text style={S.coverLabel}>Disclosing Party</Text>
              <Text style={S.coverValue}>IOTA Technologies Company</Text>
            </View>
            <View style={S.coverRow}>
              <Text style={S.coverLabel}>Receiving Party</Text>
              <Text style={S.coverValue}>{nda.partnerCompanyName}</Text>
            </View>
            {!!nda.partnerAddress && (
              <View style={S.coverRow}>
                <Text style={S.coverLabel}>Partner Address</Text>
                <Text style={S.coverValue}>{nda.partnerAddress}</Text>
              </View>
            )}
          </View>
          {!!nda.purpose && <Text style={S.coverPurpose}>{nda.purpose}</Text>}
        </View>
        <View style={S.coverFooter}>
          <Text>IOTA Technologies Company · Confidential & Proprietary</Text>
          <Text>{new Date().getFullYear()}</Text>
        </View>
      </Page>

      {/* ══ PARTIES, BACKGROUND & DEFINITIONS ══ */}
      <Page size="A4" style={S.page}>
        <RunningHeader ndaNumber={nda.ndaNumber} />

        <SectionHeading>1. Parties</SectionHeading>
        <BodyText>
          {`This Non-Disclosure Agreement ("Agreement") is entered into as of ${effectiveDateStr} ("Effective Date") between:`}
        </BodyText>
        <BodyText>
          {`Disclosing Party: IOTA Technologies Company, a company registered in the Kingdom of Saudi Arabia ("IOTA"); and`}
        </BodyText>
        <BodyText>
          Receiving Party: {nda.partnerCompanyName}
          {nda.partnerAddress ? `, ${nda.partnerAddress}` : ''}.
        </BodyText>
        <BodyText>
          {`IOTA and the Recipient are referred to individually as a "Party" and collectively as the "Parties".`}
        </BodyText>

        <SectionHeading>2. Background</SectionHeading>
        <BodyText>
          {`The Parties wish to explore a potential business relationship${nda.purpose ? ` in connection with: ${nda.purpose}` : ''} (the "Purpose"). In connection with the Purpose, each Party may disclose to the other certain confidential and proprietary information. The Parties wish to protect such information from disclosure to third parties and from unauthorized use, subject to the terms and conditions set forth herein.`}
        </BodyText>

        <SectionHeading>3. Definitions</SectionHeading>
        {so.definitions ? (
          <PreText>{so.definitions}</PreText>
        ) : (
          <>
            <BodyText>
              {[
                '"Confidential Information" means any information disclosed by one Party ("Disclosing',
                'Party") to the other ("Receiving Party"), directly or indirectly, in writing, orally,',
                'or by inspection of tangible objects, which is designated as confidential or that',
                'reasonably should be understood to be confidential given the nature of the information',
                'and the circumstances of disclosure. Confidential Information includes, without',
                'limitation: technical data, trade secrets, know-how, research, product plans,',
                'products, services, customer lists, markets, software, developments, inventions,',
                'processes, formulas, technology, designs, drawings, business plans, financial data,',
                'pricing, and any other business information.',
              ].join(' ')}
            </BodyText>
            <BodyText>
              {[
                'Confidential Information does not include information that (i) was already publicly',
                'known at the time of disclosure; (ii) becomes publicly known after disclosure through',
                "no fault of the Receiving Party; (iii) was already in the Receiving Party's possession",
                'free of restrictions prior to disclosure; or (iv) is independently developed by the',
                'Receiving Party without reference to the Confidential Information.',
              ].join(' ')}
            </BodyText>
          </>
        )}
      </Page>

      {/* ══ OBLIGATIONS, EXCLUSIONS & TERM ══ */}
      <Page size="A4" style={S.page}>
        <RunningHeader ndaNumber={nda.ndaNumber} />

        <SectionHeading>4. Obligations of the Receiving Party</SectionHeading>
        {so.obligations ? (
          <PreText>{so.obligations}</PreText>
        ) : (
          <>
            <BodyText>The Receiving Party agrees to:</BodyText>
            <NumberedList
              items={[
                'Hold all Confidential Information in strict confidence and not disclose it to any third party without the prior written consent of the Disclosing Party.',
                'Use the Confidential Information solely for the Purpose and for no other purpose whatsoever.',
                'Limit access to the Confidential Information to its employees, contractors, and advisors who (a) have a need to know such information for the Purpose, and (b) are bound by confidentiality obligations no less restrictive than those herein.',
                'Protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information, but no less than reasonable care.',
                'Promptly notify the Disclosing Party in writing upon becoming aware of any unauthorized disclosure, misappropriation, or use of the Confidential Information.',
              ]}
            />
          </>
        )}

        <SectionHeading>5. Exclusions from Confidentiality</SectionHeading>
        {so.exclusions ? (
          <PreText>{so.exclusions}</PreText>
        ) : (
          <>
            <BodyText>
              The obligations of confidentiality under this Agreement do not apply to information
              that the Receiving Party can demonstrate:
            </BodyText>
            <NumberedList
              items={[
                'Was already known to the Receiving Party at the time of disclosure without restriction;',
                'Is or becomes publicly available through no act or omission of the Receiving Party;',
                'Is rightfully obtained from a third party without restriction and without breach of this Agreement;',
                'Is required to be disclosed by applicable law, regulation, or court order, provided the Receiving Party gives the Disclosing Party prompt written notice prior to such disclosure and reasonably cooperates with any effort by the Disclosing Party to seek a protective order; or',
                'Is independently developed by the Receiving Party without use of or reference to the Confidential Information.',
              ]}
            />
          </>
        )}

        <SectionHeading>6. Term and Duration</SectionHeading>
        {so.termDuration ? (
          <PreText>{so.termDuration}</PreText>
        ) : (
          <BodyText>
            This Agreement shall commence on the Effective Date and remain in force for a period of{' '}
            {nda.isPerpetual
              ? 'an indefinite period (perpetual)'
              : `${nda.durationYears} year${nda.durationYears !== 1 ? 's' : ''}`}
            {!nda.isPerpetual
              ? `, unless earlier terminated by mutual written consent of the Parties. The Agreement shall therefore expire on ${expiryDateStr}`
              : ''}
            . The obligations of confidentiality shall survive the expiration or termination of this
            Agreement for a further period of three (3) years.
          </BodyText>
        )}
      </Page>

      {/* ══ RETURN/DESTRUCTION, REMEDIES, NO LICENSE & GENERAL PROVISIONS ══ */}
      <Page size="A4" style={S.page}>
        <RunningHeader ndaNumber={nda.ndaNumber} />

        <SectionHeading>7. Return or Destruction of Information</SectionHeading>
        {so.returnDestruction ? (
          <PreText>{so.returnDestruction}</PreText>
        ) : (
          <BodyText>
            {`Upon written request by the Disclosing Party, or upon termination or expiration of this Agreement, the Receiving Party shall promptly return or, at the Disclosing Party's option, destroy all tangible materials embodying Confidential Information (in any form and including all copies and extracts). The Receiving Party shall certify in writing that it has complied with this obligation within ten (10) business days of such request.`}
          </BodyText>
        )}

        <SectionHeading>8. Remedies</SectionHeading>
        {so.remedies ? (
          <PreText>{so.remedies}</PreText>
        ) : (
          <BodyText>
            The Parties acknowledge that any breach of this Agreement may cause irreparable harm to
            the Disclosing Party for which monetary damages would be an inadequate remedy.
            Accordingly, in addition to any other legal or equitable remedies that may be available,
            the Disclosing Party shall be entitled to seek injunctive or other equitable relief to
            prevent any actual or threatened breach of this Agreement, without the requirement of
            posting any bond or other security.
          </BodyText>
        )}

        <SectionHeading>9. No License</SectionHeading>
        {so.noLicense ? (
          <PreText>{so.noLicense}</PreText>
        ) : (
          <BodyText>
            Nothing in this Agreement shall be construed to grant either Party any right, title,
            interest, or license in or to the Confidential Information of the other Party, or any
            intellectual property rights therein. Any use of Confidential Information beyond the
            Purpose requires the prior written consent of the Disclosing Party.
          </BodyText>
        )}

        <SectionHeading>10. General Provisions</SectionHeading>
        {so.generalProvisions ? (
          <PreText>{so.generalProvisions}</PreText>
        ) : (
          <NumberedList
            items={[
              'Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of Riyadh, Saudi Arabia.',
              'Entire Agreement. This Agreement constitutes the entire understanding between the Parties with respect to its subject matter and supersedes all prior negotiations, understandings, and agreements, whether written or oral.',
              'Amendments. No amendment or modification of this Agreement shall be valid unless made in writing and signed by both Parties.',
              'Severability. If any provision of this Agreement is found to be unenforceable, invalid, or illegal, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.',
              "Waiver. Failure by either Party to enforce any provision of this Agreement shall not constitute a waiver of that Party's right to enforce such provision in the future.",
              'Counterparts. This Agreement may be executed in counterparts, including electronic form, each of which shall be deemed an original and all of which together shall constitute one and the same instrument. Electronic signatures shall be deemed valid and binding.',
              'Notices. All notices under this Agreement shall be in writing and delivered by email with acknowledgment of receipt to the representative signatories listed below.',
            ]}
          />
        )}
      </Page>

      {/* ══ ADDITIONAL CLAUSES (only when custom clauses exist) ══ */}
      {nda.clauses && nda.clauses.length > 0 && (
        <Page size="A4" style={S.page}>
          <RunningHeader ndaNumber={nda.ndaNumber} />
          <SectionHeading>Additional Provisions</SectionHeading>
          <BodyText>
            The following provisions form an integral part of this Agreement and supplement the
            standard terms set out above.
          </BodyText>
          {nda.clauses.map((clause, i) => (
            <View key={i}>
              <Text style={S.h3}>{clause.title || `Clause ${i + 1}`}</Text>
              <BodyText>{clause.content}</BodyText>
            </View>
          ))}
        </Page>
      )}

      {/* ══ IOTA SIGNATURES ══ */}
      <Page size="A4" style={S.page}>
        <RunningHeader ndaNumber={nda.ndaNumber} />
        <SectionHeading>11. Signatures — IOTA Technologies</SectionHeading>
        <BodyText>
          In witness whereof, the authorized representatives of IOTA Technologies have executed this
          Agreement as of the dates indicated below.
        </BodyText>
        <View style={S.sigGrid}>
          {nda.iotaSignatories.map((s, i) => (
            <SigBlock
              key={i}
              index={i}
              name={s.name}
              jobTitle={s.jobTitle}
              company="IOTA Technologies Company"
              signedAt={s.signedAt}
              signatureData={s.signatureData}
            />
          ))}
        </View>
      </Page>

      {/* ══ PARTNER SIGNATURES ══ */}
      <Page size="A4" style={S.page}>
        <RunningHeader ndaNumber={nda.ndaNumber} />
        <SectionHeading>12. Signatures — {nda.partnerCompanyName}</SectionHeading>
        <BodyText>
          In witness whereof, the authorized representatives of {nda.partnerCompanyName} have
          executed this Agreement as of the dates indicated below.
        </BodyText>
        <View style={S.sigGrid}>
          {nda.partnerSignatories.map((s, i) => (
            <SigBlock
              key={i}
              index={i}
              name={s.name}
              jobTitle={s.jobTitle}
              company={nda.partnerCompanyName}
              signedAt={s.signedAt}
              signatureData={s.signatureData}
            />
          ))}
        </View>
      </Page>

      {/* ══ AUDIT TRAIL ══ */}
      {nda.auditLog && nda.auditLog.length > 0 && (
        <Page size="A4" style={S.page}>
          <RunningHeader ndaNumber={nda.ndaNumber} />
          <SectionHeading>Audit Trail & Certificate of Execution</SectionHeading>
          <BodyText>
            The following log records all significant events in the lifecycle of this Agreement,
            constituting a legally admissible audit trail under applicable electronic signature
            regulations.
          </BodyText>
          <View style={S.auditTable}>
            <View style={S.auditHeaderRow}>
              <Text style={[S.auditHeaderCell, S.auditCol0]}>Timestamp (UTC)</Text>
              <Text style={[S.auditHeaderCell, S.auditCol1]}>Action</Text>
              <Text style={[S.auditHeaderCell, S.auditCol2]}>Performed By</Text>
              <Text style={[S.auditHeaderCell, S.auditCol3]}>Notes</Text>
            </View>
            {nda.auditLog.map((entry, i) => (
              <View key={i} style={[S.auditRow, i % 2 !== 0 && S.auditRowAlt]}>
                <Text style={[S.auditCell, S.auditCol0]}>
                  {new Date(entry.performedAt || entry.timestamp).toUTCString()}
                </Text>
                <Text style={[S.auditCell, S.auditCol1]}>{entry.action.replace(/_/g, ' ')}</Text>
                <Text style={[S.auditCell, S.auditCol2]}>{entry.performedBy}</Text>
                <Text style={[S.auditCell, S.auditCol3]}>{entry.notes || '\u2014'}</Text>
              </View>
            ))}
          </View>
          <Text style={S.footerNote}>
            This audit trail was generated automatically by IOTA Technologies NDA management system.
            NDA Reference: {nda.ndaNumber}.
          </Text>
        </Page>
      )}
    </Document>
  );
}
