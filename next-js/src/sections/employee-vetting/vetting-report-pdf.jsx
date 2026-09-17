import {
  Font,
  Page,
  Text,
  View,
  Document,
  Image as PdfImage,
  StyleSheet as PdfStyleSheet,
} from '@react-pdf/renderer';

// ----------------------------------------------------------------------

Font.register({
  family: 'Aptos',
  fonts: [{ src: '/fonts/Aptos-Regular.ttf' }, { src: '/fonts/Aptos-Bold.ttf', fontWeight: 700 }],
});

// Local copy of the white logo — avoids a CORS block on remote asset URLs.
const IOTA_LOGO_WHITE_LOCAL = '/logo/iotaLogoWhite.png';

const BRAND = '#0B5E41';

const styles = PdfStyleSheet.create({
  page: { fontFamily: 'Aptos', padding: 40, paddingBottom: 64, fontSize: 10, color: '#111111' },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 700 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 8.5, marginTop: 2 },
  headerLogo: { height: 28, objectFit: 'contain' },

  titleBlock: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottom: '1 solid #E8ECEF' },
  docTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.3 },
  docSubtitle: { fontSize: 9, color: '#555555', marginTop: 4 },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F7FAF9',
    borderBottom: '1 solid #E2EBE7',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  metaCell: { width: '33.33%', paddingRight: 10, marginBottom: 8 },
  metaLabel: { fontSize: 7, color: '#7A8A85', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  metaValue: { fontSize: 9 },

  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 12,
  },

  tableHeader: {
    backgroundColor: '#E8F3EF',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: '1 solid #C5DDD4',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottom: '1 solid #E8ECEF',
  },
  colCheck: { flex: 2.4 },
  colScope: { flex: 2.6 },
  colDate: { flex: 1.2 },
  colStatus: { flex: 1.1, textAlign: 'right' },
  bold: { fontWeight: 700 },
  small: { fontSize: 8.5, color: '#555555', marginTop: 2 },
  detail: { fontSize: 8.5, color: '#555555', marginTop: 2 },

  bodyText: { fontSize: 9, color: '#444444', lineHeight: 1.6, paddingHorizontal: 12 },
  notice: {
    marginTop: 18,
    marginHorizontal: 12,
    padding: 10,
    borderRadius: 3,
    backgroundColor: '#FBF7E8',
    border: '1 solid #E8DCB5',
  },
  noticeText: { fontSize: 8, color: '#6B5D2E', lineHeight: 1.5 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1 solid #E0E0E0',
    paddingHorizontal: 12,
  },
  footerNote: { fontSize: 8.5, color: '#666666', maxWidth: 260, lineHeight: 1.6 },
  footerTag: { fontSize: 8, color: '#999999', textAlign: 'right' },
  pageFooter: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: '#AAAAAA',
  },
});

// ----------------------------------------------------------------------

export const fReportDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Identifiers a customer has no need to hold.
 *
 * A vetting report answers "was this verified", not "here is the candidate's
 * government ID". Passing a PAN, passport or Aadhaar number to a third party
 * because they asked for "vetting details" hands them identity documents they
 * did not need and cannot be untold, so the customer copy shows enough to
 * recognise the document and no more.
 */
const SENSITIVE_FIELDS = new Set([
  'id_number',
  'pan_number',
  'passport_file_number',
  'employee_id',
  'supervisor_phone',
  'supervisor_email',
  'email_id',
  'dob',
  'date_of_birth',
  'address',
  'organization_street_address',
]);

/** Show the shape of an identifier without disclosing it: ABCDE1234F -> AB****34F. */
export const maskValue = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return '—';
  // A date masked character-by-character still exposes the day and the century
  // ("19*****-31"). The year alone is enough to tell two same-named people
  // apart, which is all a reader of this report legitimately needs.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return `${iso[1]} (year only)`;
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
  if (dmy) return `${dmy[3]} (year only)`;
  if (v.includes('@')) {
    const [user, domain] = v.split('@');
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  if (v.length <= 4) return '*'.repeat(v.length);
  return `${v.slice(0, 2)}${'*'.repeat(Math.max(2, v.length - 5))}${v.slice(-3)}`;
};

/**
 * A one-line outcome for a check.
 *
 * IDfy's result payload differs per check type and we have no guarantee of its
 * shape, so this reads the fields they commonly return and otherwise falls back
 * to the task status. It never invents a verdict: an unrecognised payload
 * reports the status verbatim rather than implying a pass.
 */
export const summariseCheck = (check) => {
  const r = check?.result;
  const status = String(check?.status || '').toLowerCase();

  if (status === 'draft') return 'Not submitted';
  if (status === 'pending' || !r) return 'In progress';
  if (status === 'error') return 'Could not be completed';

  const candidates = [
    r?.result?.source_output?.status,
    r?.result?.verification_status,
    r?.result?.status,
    r?.source_output?.status,
    r?.status,
  ].filter((v) => typeof v === 'string' && v.trim());

  if (candidates.length) {
    const v = candidates[0].replace(/_/g, ' ').trim();
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  return check.status ? String(check.status) : 'Completed';
};

/** The scope line: what was checked, without disclosing the identifiers. */
const scopeFor = (check, { includeSensitive }) => {
  const input = check?.input || {};
  const keys = Object.keys(input).filter((k) => String(input[k] ?? '').trim());
  if (!keys.length) return '—';
  return keys
    .slice(0, 4)
    .map((k) => {
      const label = k.replace(/_/g, ' ');
      const raw = String(input[k]);
      const value = !includeSensitive && SENSITIVE_FIELDS.has(k) ? maskValue(raw) : raw;
      return `${label}: ${value}`;
    })
    .join('  ·  ');
};

// ----------------------------------------------------------------------

/**
 * @param {object} vetting      the stored vetting record
 * @param {object} options
 * @param {boolean} options.includeSensitive  internal copy: unmasked identifiers
 *                                            and IDfy's raw payloads
 */
export function VettingReportDocument({ vetting, options = {} }) {
  const { includeSensitive = false } = options;
  const checks = vetting?.checks || [];
  const reference = `EV-${String(vetting?.id || '').slice(0, 8).toUpperCase()}`;
  const audience = includeSensitive ? 'Internal Copy' : 'Client Copy';

  const meta = [
    ['Report Ref', reference],
    ['Date of Issue', fReportDate(new Date())],
    ['Candidate', vetting?.employeeName || '—'],
    ['Issuing Office', vetting?.iotaOffice || '—'],
    ['Nationality', vetting?.nationality || '—'],
    ['Verified Against', vetting?.countryCode || '—'],
    ['Checks Performed', String(checks.length)],
    ['Overall Status', vetting?.status || '—'],
    ['Vetting Raised', fReportDate(vetting?.createdAt)],
  ];

  return (
    <Document
      title={`Employee Vetting Report — ${vetting?.employeeName || ''} (${reference})`}
      author="IOTA Technologies"
      subject={`Background verification report for ${vetting?.employeeName || 'candidate'}`}
      creator="IOTA Dashboard"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PdfImage src={IOTA_LOGO_WHITE_LOCAL} style={styles.headerLogo} />
            <View
              style={{
                width: 1,
                height: 32,
                backgroundColor: 'rgba(255,255,255,0.35)',
                marginHorizontal: 16,
              }}
            />
            <Text
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Employee Vetting
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Verification Report</Text>
            <Text style={styles.headerSub}>
              {reference} · {audience}
            </Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>{vetting?.employeeName || 'Candidate'}</Text>
          <Text style={styles.docSubtitle}>
            Background verification conducted by IOTA Technologies
            {` · Issued ${fReportDate(new Date())}`}
          </Text>
        </View>

        <View style={styles.metaGrid}>
          {meta.map(([label, value]) => (
            <View key={label} style={styles.metaCell}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Checks Performed</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.colCheck, styles.bold, { fontSize: 9 }]}>CHECK</Text>
          <Text style={[styles.colScope, styles.bold, { fontSize: 9 }]}>SCOPE</Text>
          <Text style={[styles.colDate, styles.bold, { fontSize: 9 }]}>COMPLETED</Text>
          <Text style={[styles.colStatus, styles.bold, { fontSize: 9 }]}>OUTCOME</Text>
        </View>

        {checks.map((check, i) => (
          <View key={check.taskId || i} style={styles.row} wrap={false}>
            <View style={styles.colCheck}>
              <Text style={styles.bold}>{check.label}</Text>
              <Text style={styles.small}>{String(check.category || '').replace(/_/g, ' ')}</Text>
            </View>
            <Text style={[styles.colScope, styles.detail]}>
              {scopeFor(check, { includeSensitive })}
            </Text>
            <Text style={[styles.colDate, styles.detail]}>{fReportDate(check.completedAt)}</Text>
            <Text style={[styles.colStatus, styles.bold]}>{summariseCheck(check)}</Text>
          </View>
        ))}

        {vetting?.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.bodyText}>{vetting.notes}</Text>
          </>
        ) : null}

        {/* The internal copy carries IDfy's payloads verbatim — the evidence a
            check was run. It is deliberately absent from the client copy. */}
        {includeSensitive && (
          <>
            <Text style={styles.sectionTitle}>Verification Evidence (Internal)</Text>
            {checks.map((check, i) => (
              <View key={`ev-${check.taskId || i}`} style={{ paddingHorizontal: 12, marginBottom: 8 }}>
                <Text style={styles.bold}>{check.label}</Text>
                <Text style={styles.small}>
                  {check.requestId ? `request_id ${check.requestId}` : 'not submitted'}
                </Text>
                <Text style={[styles.small, { color: '#333333' }]}>
                  {check.result
                    ? JSON.stringify(check.result).slice(0, 1200)
                    : 'No payload returned.'}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {includeSensitive
              ? 'INTERNAL COPY — contains unmasked identifiers and raw verification payloads. Not for release to clients or candidates.'
              : 'CONFIDENTIAL — issued to the named recipient for employment-suitability purposes only. Identifiers are masked. This report records the outcome of checks performed on the date shown and is not a continuing warranty. It may not be reproduced, retained beyond its purpose, or used for any other decision without written consent from IOTA Technologies and the candidate.'}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Questions about this report?{'\n'}
            Contact us at accounts@iotatechnologies.ai
          </Text>
          <View>
            <Text style={styles.footerTag}>Generated by IOTA Technologies</Text>
            {vetting?.createdBy ? (
              <Text style={styles.footerTag}>Vetting raised by {vetting.createdBy}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.pageFooter} fixed>
          <Text>
            {reference} · {vetting?.employeeName || 'Candidate'} · {audience}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Filename that identifies the report without opening it. */
export const reportFileName = (vetting, includeSensitive) =>
  [
    'IOTA-Vetting-Report',
    String(vetting?.employeeName || 'candidate')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50),
    `EV-${String(vetting?.id || '').slice(0, 8).toUpperCase()}`,
    includeSensitive ? 'INTERNAL' : 'client',
  ]
    .filter(Boolean)
    .join('-') + '.pdf';
