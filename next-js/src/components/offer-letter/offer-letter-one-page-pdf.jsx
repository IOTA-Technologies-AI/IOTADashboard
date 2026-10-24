import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';

import { money, longDate, letterDataFromOffer } from './offer-letter-data';

// ----------------------------------------------------------------------

/**
 * The one-page bilingual Employment Offer — the letter sent to the employee
 * for signature and captured in the system (signatures and stamps are placed
 * on it by zone). The detailed letter (offer-letter-pdf.jsx) is kept for GOSI
 * records. Layout follows the iHR one-page offer: an English | value | Arabic
 * table, a signature block and bilingual instructions.
 *
 * Contract text in two languages: wording changes need HR and legal sign-off.
 */

Font.register({
  family: 'IBMPlexSansCondensed',
  fonts: [
    { src: '/fonts/IBMPlexSansCondensed-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/IBMPlexSansCondensed-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/IBMPlexSansCondensed-Bold.ttf', fontWeight: 700 },
  ],
});
// Arabic: fontkit shapes and orders it (see invoice-pdf.jsx — Cairo embeds
// cleanly where the Noto Arabic faces lose glyphs).
Font.register({
  family: 'Cairo',
  fonts: [{ src: '/fonts/Cairo-Regular.ttf' }, { src: '/fonts/Cairo-Bold.ttf', fontWeight: 700 }],
});
Font.registerHyphenationCallback((word) => [word]);

const INK = '#141414';
// The IOTA letter template (IOTA Offer Letter Template.pdf, US Letter): warm
// paper, the mark top-left and a short centred rule near the foot — the same
// paper as the detailed letter (offer-letter-pdf.jsx).
const PAPER = '#F1F0EE';
const RULE = '#8A8A8A';
const MUTED = '#5B5B5B';
const BORDER = 1.4;

// The Saudi entity, as on the detailed letter and the bilingual invoice
// (invoice-create-edit-address.jsx, IOTA_OFFICES 'iota-saudi').
const ENTITY = {
  name: 'IOTA Technologies Company',
  nameAr: 'شركة آي أو تي إيه تيكنالوجيز',
  cr: '7050457477',
  // The footer's address, the same facts in both languages and short enough
  // for one line each. The Arabic is ordered for react-pdf: a line led by a
  // number prints it on the wrong side (checked by reading the PDF back).
  address: 'Office 9, Building 2885, Jarir Street, Al Malaz, Riyadh 12836',
  addressAr: 'مكتب رقم 9، مبنى 2885، شارع جرير، الملز، الرياض 12836',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'IBMPlexSansCondensed',
    fontSize: 10,
    color: INK,
    backgroundColor: PAPER,
    paddingTop: 58,
    // Content may run to just above the template's rule (95pt from the foot).
    paddingBottom: 104,
    paddingHorizontal: 54,
  },
  ar: { fontFamily: 'Cairo', textAlign: 'right' },
  bold: { fontWeight: 700 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mark: { width: 16, height: 50 },
  headerRight: { alignItems: 'flex-end' },

  titles: { alignItems: 'center', marginTop: 4, marginBottom: 12 },
  titleAr: { fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, textDecoration: 'underline' },
  titleEn: { fontSize: 13.5, fontWeight: 700, textDecoration: 'underline', marginTop: 2 },

  table: { borderWidth: BORDER, borderColor: INK },
  row: { flexDirection: 'row', minHeight: 23, borderTopWidth: BORDER, borderColor: INK },
  cell: { justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 1.5 },
  labelEn: { width: '29%', alignItems: 'center' },
  value: {
    width: '42%',
    alignItems: 'center',
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: INK,
  },
  labelAr: { width: '29%', alignItems: 'center' },
  totalRow: { backgroundColor: '#E6E4DF' },

  pleaseSign: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signTable: { borderWidth: BORDER, borderColor: INK, flexDirection: 'row' },
  // Tall enough to sign comfortably between the name and the caption.
  signCell: { padding: 8, minHeight: 108 },
  signLabel: { fontSize: 9, color: MUTED },
  signLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  instructions: { marginTop: 10 },
  instrHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  instrRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  instrEn: { width: '49%', fontSize: 8.5, color: INK, lineHeight: 1.35 },
  instrArRow: { width: '49%', flexDirection: 'row', justifyContent: 'flex-end' },
  instrArText: {
    fontSize: 8.5,
    fontFamily: 'Cairo',
    textAlign: 'right',
    flexShrink: 1,
    lineHeight: 1.35,
  },
  instrArNum: { fontSize: 8.5, fontFamily: 'Cairo', marginLeft: 4 },

  // The template's rule: centred, 244pt wide, 95pt from the foot.
  rule: {
    position: 'absolute',
    bottom: 95,
    left: 184,
    width: 244,
    borderBottomWidth: 1.2,
    borderBottomColor: RULE,
  },
  // Under the rule: English left, Arabic right, line for line. Both scripts
  // get the same explicit line height so each pair stays level — a fixed row
  // height is not enough: react-pdf drops text taller than its box, and
  // Cairo's natural line is taller than Plex's.
  footer: { position: 'absolute', bottom: 36, left: 54, right: 54 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footEn: { width: '50%', fontSize: 7.5, lineHeight: 1.75, color: MUTED },
  footAr: {
    width: '50%',
    fontSize: 7.5,
    lineHeight: 1.75,
    color: MUTED,
    fontFamily: 'Cairo',
    textAlign: 'right',
    // Cairo sits lower on the line than Plex; lift it level with its English pair.
    marginTop: -3,
  },
  footName: { color: INK, fontWeight: 700 },
});

/** 14-01-2025 — the one-pager's date style. */
const dmy = (v) => {
  const d = v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return [d.getDate(), d.getMonth() + 1, d.getFullYear()]
    .map((n, i) => String(n).padStart(i < 2 ? 2 : 4, '0'))
    .join('-');
};

/** Whole days from the letter's date to its expiry; 5 when no expiry is set (iHR's standard). */
function validityDays(issuedAt, validUntil) {
  if (!validUntil) return 5;
  const from = new Date(issuedAt);
  const to = new Date(`${validUntil}T00:00:00`);
  const days = Math.round((to - from) / 86400000);
  return days > 0 ? days : 5;
}

const capitalise = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

function Row({ en, ar, value, highlight }) {
  return (
    <View style={[s.row, highlight ? s.totalRow : null]} wrap={false}>
      <View style={[s.cell, s.labelEn]}>
        <Text style={s.bold}>{en}</Text>
      </View>
      <View style={[s.cell, s.value]}>
        <Text style={s.bold}>{value || '—'}</Text>
      </View>
      <View style={[s.cell, s.labelAr]}>
        <Text style={[s.ar, s.bold]}>{ar}</Text>
      </View>
    </View>
  );
}

/** A drawn signature in its box, with the date it was given. */
function SignatureMark({ sig }) {
  // Drawn inside the signing space, so the page never grows.
  return (
    <View style={{ flexGrow: 1 }}>
      {sig?.data && (
        <Image
          src={sig.data}
          style={{
            position: 'absolute',
            top: 2,
            left: 0,
            height: 34,
            width: 110,
            objectFit: 'contain',
          }}
        />
      )}
      {sig?.date && (
        <Text style={{ position: 'absolute', top: 14, left: 114, fontSize: 6.5, color: '#555555' }}>
          {sig.date}
        </Text>
      )}
    </View>
  );
}

/**
 * The bilingual one-page offer. `signatures` ({ employee, iota }: { data,
 * name, date }) draws the signatures into the signature block, for the copy
 * that is filed once everyone has signed.
 */
export function OfferLetterOnePagePDF({ offer, data, signatures }) {
  const d = letterDataFromOffer(offer || data);
  const cur = d.currency;
  const days = validityDays(d.issuedAt, d.offerValidUntil);

  const rows = [
    ['Name of Candidate', 'اسم المرشح', `${d.title} ${d.name}`.trim()],
    ['Job Title', 'المسمى الوظيفي', d.position],
    ['Probation', 'فترة التجربة', d.probationDays ? `${d.probationDays} days` : ''],
    ['Basic Salary', 'الراتب الأساسي', money(d.salary.basic, cur)],
    ['Housing Allowance', 'بدل السكن', money(d.salary.housing, cur)],
    ['Transportation Allowance', 'بدل النقل', money(d.salary.transport, cur)],
    ...(d.salary.other ? [['Other Allowances', 'بدلات أخرى', money(d.salary.other, cur)]] : []),
    ['Total Monthly Salary', 'إجمالي الراتب الشهري', money(d.salary.total, cur), true],
    ['Annual Vacation', 'الإجازة السنوية', `${d.annualLeaveDays} days`],
    ['Medical Insurance', 'التأمين الطبي', d.insuranceClass || 'As per company policy'],
    [
      'Duration of Contract',
      'مدة العقد',
      d.fixedTerm
        ? capitalise(
            `${d.contractMonths % 12 ? `${d.contractMonths} months` : `${d.contractMonths / 12} year${d.contractMonths === 12 ? '' : 's'}`}`
          )
        : 'Unlimited',
    ],
  ];

  const instructions = [
    [
      'Terms and conditions are governed by the Saudi Labour Law.',
      'تطبق الشروط والأحكام طبقاً لنظام العمل السعودي',
    ],
    [
      `This offer is valid for (${days}) days from the date above.`,
      `مدة صلاحية العرض الوظيفي (${days}) أيام من التاريخ المذكور أعلاه`,
    ],
    ['This offer is not a commitment to employment.', 'هذا العرض لا يعتبر التزاماً بالتوظيف'],
  ];

  return (
    <Document
      title={`Employment Offer — ${d.name}`}
      author="IOTA Technologies"
      subject={d.documentNumber ? `Document ${d.documentNumber}` : 'Employment Offer'}
    >
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image src="/logo/iota-mark.png" style={s.mark} />
          <View style={s.headerRight}>
            <Text style={s.bold}>Date: {dmy(d.issuedAt)}</Text>
            {d.documentNumber ? (
              <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 2 }}>
                Ref: {d.documentNumber}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Title */}
        <View style={s.titles}>
          <Text style={s.titleAr}>عرض وظيفي</Text>
          <Text style={s.titleEn}>EMPLOYMENT OFFER</Text>
        </View>

        {/* Terms */}
        <View style={[s.table, { borderTopWidth: 0 }]}>
          {rows.map(([en, ar, value, highlight]) => (
            <Row key={en} en={en} ar={ar} value={value} highlight={highlight} />
          ))}
        </View>

        {/* Signatures — the blank areas are where signature zones are placed. */}
        <View style={s.pleaseSign} wrap={false}>
          <Text style={s.bold}>Please sign below</Text>
          <Text style={[s.ar, s.bold]}>فضلاً التوقيع أدناه</Text>
        </View>
        <View style={s.signTable} wrap={false}>
          <View style={[s.signCell, { width: '24%', borderRightWidth: BORDER, borderColor: INK }]}>
            <Text style={[s.signLabel, { textAlign: 'center' }]}>Joining date</Text>
            <Text style={[s.ar, s.signLabel, { textAlign: 'center' }]}>تاريخ مباشرة العمل</Text>
            <Text style={{ ...s.bold, marginTop: 12, textAlign: 'center' }}>
              {d.startDate ? longDate(d.startDate) : '____ / ____ / ________'}
            </Text>
          </View>
          <View style={[s.signCell, { width: '42%', borderRightWidth: BORDER, borderColor: INK }]}>
            <View style={s.signLine}>
              <Text style={s.bold}>Accepted</Text>
              <Text style={[s.ar, s.bold]}>قبلت العرض أعلاه</Text>
            </View>
            <Text style={{ fontSize: 9, marginTop: 2 }}>{d.name}</Text>
            <SignatureMark sig={signatures?.employee} />
            <View style={s.signLine}>
              <Text style={s.signLabel}>Candidate Signature</Text>
              <Text style={[s.ar, s.signLabel]}>توقيع المرشح</Text>
            </View>
          </View>
          <View style={[s.signCell, { width: '34%' }]}>
            <View style={s.signLine}>
              <Text style={s.bold}>For IOTA</Text>
              <Text style={[s.ar, s.bold]}>عن الشركة</Text>
            </View>
            <Text style={{ fontSize: 9, marginTop: 2 }}>
              {signatures?.iota?.name || d.signatoryName}
            </Text>
            <SignatureMark sig={signatures?.iota} />
            <View style={s.signLine}>
              <Text style={s.signLabel}>Authorised Signatory</Text>
              <Text style={[s.ar, s.signLabel]}>المفوض بالتوقيع</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={s.instructions} wrap={false}>
          <View style={s.instrHead}>
            <Text style={[s.bold, { fontSize: 9, textDecoration: 'underline' }]}>
              Instructions:
            </Text>
            <Text style={[s.ar, s.bold, { fontSize: 9 }]}>تعليمات</Text>
          </View>
          {instructions.map(([en, ar], i) => (
            <View key={en} style={s.instrRow}>
              <Text style={s.instrEn}>
                {i + 1}. {en}
              </Text>
              {/* react-pdf lays mixed Arabic lines out left-to-right, so the
                  number is its own element, placed to the right of the text,
                  and the Arabic sentences carry no edge punctuation. */}
              <View style={s.instrArRow}>
                <Text style={s.instrArText}>{ar}</Text>
                <Text style={s.instrArNum}>-{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* The template's rule, then the company in matched English and
            Arabic lines. */}
        <View style={s.rule} fixed />
        <View style={s.footer} fixed>
          {[
            [ENTITY.name, ENTITY.nameAr, true],
            [ENTITY.address, ENTITY.addressAr],
            [`CR ${ENTITY.cr}`, `سجل تجاري ${ENTITY.cr}`],
          ].map(([en, ar, isName]) => (
            <View key={en} style={s.footRow}>
              <Text style={[s.footEn, isName ? s.footName : null]}>{en}</Text>
              <Text style={[s.footAr, isName ? s.footName : null]}>{ar}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
