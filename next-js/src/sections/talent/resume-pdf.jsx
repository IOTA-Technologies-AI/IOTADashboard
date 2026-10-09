import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';

// ----------------------------------------------------------------------
// The IOTA resume. Built only from the anonymised record: first name, no
// email, phone, address or profile links — there are no fields for them, so
// none can slip onto the page.
// ----------------------------------------------------------------------

Font.register({
  family: 'PlusJakartaSans',
  fonts: [
    { src: '/fonts/PlusJakartaSans-400.ttf', fontWeight: 400 },
    { src: '/fonts/PlusJakartaSans-500.ttf', fontWeight: 500 },
    { src: '/fonts/PlusJakartaSans-700.ttf', fontWeight: 700 },
    { src: '/fonts/PlusJakartaSans-800.ttf', fontWeight: 800 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const BRAND = '#0166ff';
const INK = '#171717';
const MUTED = '#6b7280';
const RULE = '#e5e7eb';
const PANEL = '#f5f8ff';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'PlusJakartaSans',
    fontSize: 9.5,
    color: INK,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    // No page-wide lineHeight: react-pdf applies it to the fixed, absolutely
    // positioned footer too and pushes it off the page. Body text sets its own.
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    borderBottomStyle: 'solid',
    marginBottom: 16,
  },
  logo: { width: 92, height: 55, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  docLabel: { fontSize: 8, color: BRAND, fontWeight: 700, letterSpacing: 1.2 },
  docSub: { fontSize: 8, color: MUTED, marginTop: 2 },

  // Explicit line heights: the page's 1.45 is relative to 9.5pt body text and
  // let a 22pt name overlap the line beneath it.
  name: { fontSize: 22, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.2 },
  headline: { fontSize: 11.5, fontWeight: 500, color: BRAND, marginTop: 4, lineHeight: 1.3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  metaChip: {
    fontSize: 8.5,
    color: MUTED,
    marginRight: 12,
  },

  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.4,
    color: BRAND,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    borderBottomStyle: 'solid',
    marginBottom: 8,
  },
  summary: { fontSize: 9.5, color: INK, lineHeight: 1.45 },

  skills: { flexDirection: 'row', flexWrap: 'wrap' },
  skill: {
    fontSize: 8.5,
    backgroundColor: PANEL,
    color: INK,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
  },

  job: { marginBottom: 10 },
  jobHead: { flexDirection: 'row', justifyContent: 'space-between' },
  jobTitle: { fontSize: 10, fontWeight: 700, flex: 1, paddingRight: 8 },
  jobDates: { fontSize: 8.5, color: MUTED },
  jobCompany: { fontSize: 9, color: MUTED, marginBottom: 3 },
  bullet: { flexDirection: 'row', marginBottom: 1.5 },
  bulletDot: { width: 9, color: BRAND },
  bulletText: { flex: 1 },

  twoCol: { flexDirection: 'row', justifyContent: 'space-between' },
  entry: { marginBottom: 5 },
  entryTitle: { fontWeight: 700 },
  entrySub: { color: MUTED, fontSize: 8.5 },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: RULE,
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
});

const has = (list) => Array.isArray(list) && list.length > 0;

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/**
 * @param {{ resume: object, logoSrc?: string }} props  an anonymised TalentResume
 */
export function ResumePdfDocument({ resume, logoSrc = '/logo/logo-full.png' }) {
  const content = resume?.content || {};
  const years = Number(resume?.experienceYears) || 0;

  return (
    <Document
      title={`${resume?.displayName || 'Candidate'} — IOTA Technologies`}
      author="IOTA Technologies"
      creator="IOTA Technologies"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image source={logoSrc} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.docLabel}>CANDIDATE PROFILE</Text>
            <Text style={styles.docSub}>Presented by IOTA Technologies</Text>
            {resume?.resumeCode ? <Text style={styles.docSub}>{resume.resumeCode}</Text> : null}
          </View>
        </View>

        <Text style={styles.name}>{resume?.displayName || 'Candidate'}</Text>
        {resume?.headline ? <Text style={styles.headline}>{resume.headline}</Text> : null}
        <View style={styles.metaRow}>
          {resume?.specialization ? (
            <Text style={styles.metaChip}>Specialization: {resume.specialization}</Text>
          ) : null}
          {years > 0 ? <Text style={styles.metaChip}>Experience: {years}+ years</Text> : null}
          {has(content.languages) ? (
            <Text style={styles.metaChip}>Languages: {content.languages.join(', ')}</Text>
          ) : null}
        </View>

        {content.summary ? (
          <Section title="Profile">
            <Text style={styles.summary}>{content.summary}</Text>
          </Section>
        ) : null}

        {has(resume?.skills) ? (
          <Section title="Key skills">
            <View style={styles.skills}>
              {resume.skills.map((s) => (
                <Text key={s} style={styles.skill}>
                  {s}
                </Text>
              ))}
            </View>
          </Section>
        ) : null}

        {has(content.experience) ? (
          <Section title="Professional experience">
            {content.experience.map((job, i) => (
              <View key={i} style={styles.job} wrap={false}>
                <View style={styles.jobHead}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  {job.startDate || job.endDate ? (
                    <Text style={styles.jobDates}>
                      {[job.startDate, job.endDate].filter(Boolean).join(' – ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.jobCompany}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </Text>
                {(job.highlights || []).map((h, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {has(content.projects) ? (
          <Section title="Notable projects">
            {content.projects.map((p, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{p}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {has(content.education) ? (
          <Section title="Education">
            {content.education.map((e, i) => (
              <View key={i} style={[styles.entry, styles.twoCol]} wrap={false}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.entryTitle}>{e.degree}</Text>
                  <Text style={styles.entrySub}>{e.institution}</Text>
                </View>
                {e.year ? <Text style={styles.jobDates}>{e.year}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {has(content.certifications) ? (
          <Section title="Certifications">
            {content.certifications.map((c, i) => (
              <View key={i} style={[styles.entry, styles.twoCol]} wrap={false}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.entryTitle}>{c.name}</Text>
                  {c.issuer ? <Text style={styles.entrySub}>{c.issuer}</Text> : null}
                </View>
                {c.year ? <Text style={styles.jobDates}>{c.year}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>
            IOTA Technologies · Confidential candidate profile
            {resume?.resumeCode ? ` · Ref ${resume.resumeCode}` : ''}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Renders the resume to a PDF Blob. The renderer is loaded on demand. */
export async function renderResumePdf(resume) {
  const { pdf } = await import('@react-pdf/renderer');
  return pdf(<ResumePdfDocument resume={resume} />).toBlob();
}

export const resumeFileName = (resume) =>
  `${[resume?.displayName || 'Candidate', resume?.specialization].filter(Boolean).join(' - ')} - IOTA.pdf`.replace(
    /[\\/:*?"<>|]/g,
    ''
  );
