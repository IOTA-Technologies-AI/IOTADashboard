import { Font, Page, Text, View, Image, Document, StyleSheet } from '@react-pdf/renderer';

import {
  money,
  inWords,
  longDate,
  longDateUS,
  termInWords,
  letterDataFromOffer,
} from './offer-letter-data';

// ----------------------------------------------------------------------

/**
 * The IOTA Employee Offer Letter — the one template for every employee
 * (IOTA Employee Offer Letter, October 2026). This PDF is what is previewed,
 * signed (signatures are stamped onto its pages by zone) and filed.
 *
 * Wording follows the approved template. Where the template names a customer,
 * a technology or a regulator, the text comes from the offer; clauses that only
 * apply to a customer deployment, or to a SAMA-regulated customer, appear only
 * then. Contract text: changes need legal sign-off.
 */

Font.register({
  family: 'IBMPlexSansCondensed',
  fonts: [
    { src: '/fonts/IBMPlexSansCondensed-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/IBMPlexSansCondensed-Italic.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: '/fonts/IBMPlexSansCondensed-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/IBMPlexSansCondensed-Bold.ttf', fontWeight: 700 },
  ],
});
// Contract text reads better unbroken.
Font.registerHyphenationCallback((word) => [word]);

const BLUE = '#0067FF';
const INK = '#141414';
const PAPER = '#F1F0EE';
const RULE = '#1A1A1A';

const OFFICE = {
  phone: '+966 50534 0573',
  email: 'hr@iotatechnologies.ai',
  address: '2885, Office #9, Jarir St., AlMalaz, Riyadh',
  addressFull: '2885, Office #9, Jarir Street, Al Malaz, Riyadh - 12836',
  website: 'iotatechnologies.ai',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'IBMPlexSansCondensed',
    fontSize: 9.5,
    lineHeight: 1.75,
    color: INK,
    backgroundColor: PAPER,
    paddingTop: 128,
    paddingBottom: 72,
    paddingHorizontal: 54,
  },
  header: {
    position: 'absolute',
    top: 44,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mark: { width: 14, height: 42 },
  footerRule: {
    position: 'absolute',
    bottom: 38,
    left: 54,
    right: 54,
    borderBottomWidth: 1.4,
    borderBottomColor: RULE,
  },
  h1: { fontWeight: 700, fontSize: 9.5, marginBottom: 12 },
  p: { textAlign: 'justify', marginBottom: 12 },
  b: { fontWeight: 700 },
  bullet: { textAlign: 'justify' },
  // Cover
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  shortRule: { width: 134, borderBottomWidth: 1.4, borderBottomColor: RULE },
  // Salary table
  table: { borderWidth: 0.5, borderColor: '#D5DCE6', marginVertical: 18 },
  tr: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#D5DCE6' },
  th: { backgroundColor: BLUE, color: '#FFFFFF', fontWeight: 700 },
  td: { paddingVertical: 7, paddingHorizontal: 6, lineHeight: 1.35 },
  c1: { width: '20%', borderRightWidth: 0.5, borderRightColor: '#D5DCE6' },
  c2: { width: '33%', borderRightWidth: 0.5, borderRightColor: '#D5DCE6' },
  c3: { width: '47%' },
  totalRow: { backgroundColor: '#E8F2FF' },
  // Acceptance
  acceptRule: { borderTopWidth: 1.6, borderTopColor: RULE, marginTop: 30 },
  aRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
    paddingVertical: 9,
    paddingHorizontal: 8,
    lineHeight: 1.35,
  },
  aKey: { width: '50%' },
  aVal: { width: '50%' },
  signRow: { flexDirection: 'row', marginTop: 22, lineHeight: 1.35 },
  signCol: { width: '50%', paddingRight: 12 },
  // Back page
  back: {
    fontFamily: 'IBMPlexSansCondensed',
    backgroundColor: BLUE,
    color: '#FFFFFF',
    padding: 54,
    justifyContent: 'flex-end',
  },
  backLabel: { fontSize: 9, marginTop: 14 },
  backValue: { fontSize: 14, fontWeight: 600 },
});

/** The mark on every page after the cover; the office contact details are on the cover's footer only. */
function Header() {
  return (
    <View style={s.header} fixed>
      <Image src="/logo/iota-mark.png" style={s.mark} />
    </View>
  );
}

/** A numbered clause: bold "1.1 Title." then the text. */
function Clause({ n, title, children }) {
  return (
    <Text style={s.p}>
      <Text style={s.b}>
        {n} {title}.
      </Text>{' '}
      {children}
    </Text>
  );
}

function Section({ n, title, children, wrap = true }) {
  return (
    <Page size="A4" style={s.page} wrap={wrap}>
      <Header />
      <Text style={s.h1}>{n ? `${n}. ${title}` : title}</Text>
      {children}
      <View style={s.footerRule} fixed />
    </Page>
  );
}

// ----------------------------------------------------------------------

/** A drawn signature on the acceptance page, or the line to sign on. */
function SignedLine({ sig }) {
  if (!sig?.data) return <Text style={s.signCol}>SIGNED _______________________________</Text>;
  return (
    <View style={{ ...s.signCol, flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text>SIGNED </Text>
      <Image src={sig.data} style={{ height: 34, width: 140, objectFit: 'contain' }} />
    </View>
  );
}

/**
 * The detailed letter. `signatures` ({ employee, iota }: { data, name, date })
 * fills the acceptance page, for the copy filed once everyone has signed.
 */
export function OfferLetterPDF({ offer, data, signatures }) {
  const d = letterDataFromOffer(offer || data);
  const customer = d.client ? 'the Customer' : null;
  const cur = d.currency;
  const housingPct = d.salary.basic ? Math.round((d.salary.housing / d.salary.basic) * 100) : 0;
  const salaryRows = [
    ['Basic Salary', d.salary.basic, 'Base for GOSI, overtime and end-of-service'],
    ['Housing allowance', d.salary.housing, housingPct ? `${housingPct}% of Basic Salary` : ''],
    ['Transportation Allowance', d.salary.transport, ''],
    ['Other allowances', d.salary.other, ''],
  ].filter(([label, amount]) => label === 'Basic Salary' || amount);

  return (
    <Document
      title={`IOTA Employee Offer Letter — ${d.name}`}
      author="IOTA Technologies"
      subject={d.documentNumber ? `Document ${d.documentNumber}` : 'Employee Offer Letter'}
    >
      {/* Cover letter */}
      <Page size="A4" style={{ ...s.page, paddingTop: 44 }}>
        <Image src="/logo/iota-mark.png" style={s.mark} />
        <View style={{ ...s.coverTop, marginTop: 58 }}>
          <View>
            <Text style={s.b}>To :</Text>
            <Text style={s.b}>
              {d.title} {d.name}
            </Text>
          </View>
          <Text style={{ ...s.b, marginTop: 6 }}>{longDateUS(d.issuedAt)}</Text>
        </View>
        <View style={{ ...s.shortRule, marginTop: 28, marginBottom: 30 }} />
        <Text style={s.p}>
          Dear {d.title} {d.name},
        </Text>
        <Text style={s.p}>
          Further to our recent discussions, IOTA Technologies (&quot;the Company&quot;) is pleased
          to offer you employment on the terms set out in this letter. This offer is conditional on
          satisfactory reference and background checks, verification of your qualifications, a
          pre-employment medical fitness report, and your eligibility to work in the Kingdom of
          Saudi Arabia (including issuance or transfer of your Iqama and work permit, where
          applicable). Once accepted, this letter will form the basis of your formal employment
          contract, which will be registered on the Qiwa platform in accordance with the Saudi Labor
          Law.
        </Text>
        <View style={{ ...s.shortRule, marginTop: 150, marginBottom: 32 }} />
        <Text style={{ fontSize: 11 }}>Sincerely,</Text>
        <Text style={{ ...s.b, fontSize: 11, marginTop: 52 }}>{d.signatoryName}</Text>
        <View
          style={{
            position: 'absolute',
            bottom: 52,
            left: 54,
            right: 54,
            flexDirection: 'row',
            justifyContent: 'center',
            fontSize: 8.5,
          }}
        >
          <Text>
            P. {OFFICE.phone} | E. {OFFICE.email} | A. {OFFICE.address}
          </Text>
        </View>
        <View style={s.footerRule} />
      </Page>

      {/* 1. Position */}
      <Section n={1} title="Position, joining date and place of work">
        <Clause n="1.1" title="Position">
          You are appointed as {d.position}
          {d.grade ? `, grade ${d.grade}` : ''}
          {d.division ? `, in the Company's ${d.division} division` : ''}. You will report to{' '}
          {d.reportsTo}
          {customer
            ? ", and on a day-to-day basis you will take functional direction from the customer's designated IT manager."
            : '.'}
        </Clause>
        <Clause n="1.2" title="Joining date">
          Your employment will commence on {longDate(d.startDate) || 'the agreed joining date'},
          subject to the conditions in this letter being met. The joining date may be adjusted by
          mutual written agreement if your work permit or Iqama transfer is delayed.
        </Clause>
        <Clause n="1.3" title="Contract term">
          {d.fixedTerm
            ? `This is a fixed-term contract of ${termInWords(d.contractMonths)} from the joining date, renewable annually by mutual written agreement. Each renewal will be recorded on the Qiwa platform.`
            : 'This is a contract for an indefinite term, which will be recorded on the Qiwa platform.'}
        </Clause>
        {customer ? (
          <>
            <Clause n="1.4" title="Place of work and customer deployment">
              Your initial place of work is the premises of the Company&apos;s customer, {d.client},
              Riyadh (&quot;the Customer&quot;). You acknowledge and agree that:
            </Clause>
            <View style={{ marginBottom: 12 }}>
              <Text style={s.bullet}>
                - You are an employee of IOTA Technologies only. Nothing in this letter or in your
                deployment creates an employment, agency or contractual relationship between you and
                the Customer.
              </Text>
              <Text style={s.bullet}>
                - The Company may, at its discretion and on reasonable notice, move you to another
                customer, to the Company&apos;s offices, or to another location within the Kingdom
                of Saudi Arabia in line with business needs, without this constituting a change to
                your terms of employment.
              </Text>
              <Text style={s.bullet}>
                - Deployment at the Customer is subject to the Customer&apos;s acceptance, security
                clearance and continued requirement. Should the Customer end or reduce the
                engagement, the Company makes no commitment to redeploy you or to continue your pay
                beyond your statutory entitlements, and clause 6 will apply.
              </Text>
              <Text style={s.bullet}>
                - You will not negotiate, accept or discuss any direct commercial, employment or
                contractual arrangement with the Customer during your employment and for the period
                stated in clause 5.
              </Text>
            </View>
          </>
        ) : (
          <Clause n="1.4" title="Place of work">
            Your place of work is the Company&apos;s offices in Riyadh. The Company may, at its
            discretion and on reasonable notice, assign you to a customer&apos;s premises or to
            another location within the Kingdom of Saudi Arabia in line with business needs, without
            this constituting a change to your terms of employment.
          </Clause>
        )}
        <Clause n="1.5" title="Duties">
          {customer
            ? `Your duties include ${d.duties || 'the services set out in the assignment statement of work'}, incident and problem management, change implementation, documentation, knowledge transfer, and such other duties consistent with your role as the Company or the Customer may reasonably require.`
            : `Your duties include ${d.duties || `those of a ${d.position} as described in your role profile`}, and such other duties consistent with your role as the Company may reasonably require.`}
        </Clause>
      </Section>

      {/* 2. Compensation */}
      <Section n={2} title="Compensation and benefits">
        <Clause n="2.1" title="Monthly remuneration">
          Your remuneration will be paid monthly in arrears in{' '}
          {cur === 'SAR' ? 'Saudi Riyals (SAR)' : cur} through the Wage Protection System (WPS) by
          bank transfer, as follows:
        </Clause>
        <View style={s.table} wrap={false}>
          <View style={{ ...s.tr, borderTopWidth: 0 }}>
            <Text style={{ ...s.td, ...s.th, ...s.c1 }}>Component</Text>
            <Text style={{ ...s.td, ...s.th, ...s.c2 }}>Monthly Amount ({cur})</Text>
            <Text style={{ ...s.td, ...s.th, ...s.c3 }}>Basis</Text>
          </View>
          {salaryRows.map(([label, amount, basis]) => (
            <View key={label} style={s.tr}>
              <Text style={{ ...s.td, ...s.c1 }}>{label}</Text>
              <Text style={{ ...s.td, ...s.c2 }}>{money(amount, cur)}</Text>
              <Text style={{ ...s.td, ...s.c3 }}>{basis}</Text>
            </View>
          ))}
          <View style={{ ...s.tr, ...s.totalRow }}>
            <Text style={{ ...s.td, ...s.c1, ...s.b }}>Total</Text>
            <Text style={{ ...s.td, ...s.c2, ...s.b }}>{money(d.salary.total, cur)}</Text>
            <Text style={{ ...s.td, ...s.c3 }}>Nett Payable Salary</Text>
          </View>
        </View>
        <Clause n="2.2" title="Statutory contributions">
          The Company will register you with the General Organization for Social Insurance (GOSI)
          and deduct your employee contribution as required by law. Any income tax liability in your
          home country remains your responsibility.
        </Clause>
        <Clause n="2.3" title="Medical insurance">
          The Company will provide medical insurance for you
          {d.dependantsCovered
            ? `, your spouse and up to ${inWords(d.dependantsCovered)} dependants residing in the Kingdom`
            : ''}{' '}
          under a Council of Health Insurance (CHI) compliant policy
          {d.insuranceClass ? `, at the Company's class ${d.insuranceClass}` : ''}.
        </Clause>
        <Clause n="2.4" title="Annual leave">
          You are entitled to {d.annualLeaveDays} calendar days of paid annual leave per year of
          service, inclusive of weekends and rest days falling within the leave period, accrued pro
          rata, to be scheduled in agreement with the Company
          {customer ? ' and the Customer so that support coverage is maintained' : ''}. Leave must
          be applied for through the Company&apos;s HR system at least 30 days in advance except in
          emergencies. Leave not taken within the leave year may not be carried forward or encashed,
          except on termination or with the Company&apos;s written consent.
        </Clause>
        <Clause n="2.5" title="Public holidays and sick leave">
          Public holidays and sick leave are as provided in the Saudi Labor Law.
        </Clause>
        {d.airTicketCap ? (
          <Clause n="2.6" title="Air tickets">
            The Company will provide one economy-class return air ticket per year of service to your
            home country for you
            {d.dependantsCovered
              ? `, your spouse and up to ${inWords(d.dependantsCovered)} dependants residing with you in the Kingdom`
              : ''}
            , capped at {money(d.airTicketCap, cur).replace(/\.00$/, '')} per person per year. The
            ticket entitlement becomes payable after completion of eleven (11) months of service in
            each contract year, and unused entitlement is not carried forward or encashed. A one-way
            ticket on final exit is provided in accordance with the Labor Law.
          </Clause>
        ) : null}
        <Clause n="2.7" title="Overtime and on-call">
          {customer
            ? "Your role may require on-call support and work outside normal hours in line with the Customer's service levels. "
            : 'Your role may require work outside normal hours. '}
          Overtime approved in advance by the Company will be paid at the rates set out in the Saudi
          Labor Law.
          {customer
            ? ' On-call allowances, if any, are set out in the assignment statement of work.'
            : ''}
        </Clause>
        <Clause n="2.8" title="End-of-service benefit">
          On completion of your employment you will be paid an end-of-service award calculated in
          accordance with Articles 84 to 87 of the Saudi Labor Law, based on your last basic salary
          {d.eosIncludesAllowances ? ' plus housing and transportation allowances' : ''}.
        </Clause>
        <Clause n="2.9" title="Visa and Iqama costs">
          The Company will bear the costs of your work permit, Iqama issuance or transfer, renewals,
          and one exit/re-entry visa per contract year for you. Costs for dependants&apos; Iqama
          will {d.dependantsIqamaCovered ? '' : 'not '}be borne by the Company.
        </Clause>
        <Clause n="2.10" title="Annual review">
          Your remuneration will be reviewed annually. Any increase is at the Company&apos;s
          discretion and linked to your performance
          {customer ? " and the Customer's feedback" : ''}.
        </Clause>
      </Section>

      {/* 3. Probation, hours, conduct */}
      <Section
        n={3}
        title={`Probation, working hours and conduct${customer ? ' at the Customer site' : ''}`}
      >
        <Clause n="3.1" title="Probation">
          The first {d.probationDays} days of your employment are a probationary period, which may
          be extended once by written agreement up to a total of 180 days, as permitted by Article
          53 of the Saudi Labor Law. During probation either party may terminate the employment
          without notice or compensation.
        </Clause>
        <Clause n="3.2" title="Working hours">
          Your normal working hours are {d.hoursPerDay} hours per day, {d.hoursPerDay * 5} hours per
          week, Sunday to Thursday
          {customer ? ", aligned to the Customer's working hours and attendance system" : ''}.
          During Ramadan, working hours for Muslim employees are reduced to 6 hours per day in
          accordance with the Labor Law.
        </Clause>
        <Clause n="3.3" title="Attendance and timesheets">
          {customer
            ? "You will record your attendance in the Customer's system where required and submit your monthly timesheet, approved by the Customer, to the Company by the last working day of each month where possible, and in any case no later than the 3rd day of the following month. Timesheets are the basis for the Company's invoicing to the Customer; late or inaccurate submission causes billing delays and may result in disciplinary action."
            : "You will record your attendance in the Company's system and submit your monthly timesheet by the last working day of each month where possible, and in any case no later than the 3rd day of the following month."}
        </Clause>
        {customer ? (
          <>
            <Clause n="3.4" title="Customer policies and security">
              While on the Customer&apos;s premises or systems you will comply with the
              Customer&apos;s information security policies, access control, clean-desk,
              acceptable-use and physical security rules, and any regulatory requirements applicable
              to the Customer
              {d.regulatedFinancialCustomer
                ? ' as a financial institution regulated by the Saudi Central Bank (SAMA)'
                : ''}
              . You will complete any security awareness training and background screening the
              Customer requires, and will return your access badge, tokens and equipment on request.
            </Clause>
            <Clause n="3.5" title="Standards of conduct">
              You will act professionally and courteously towards the Customer&apos;s staff, follow
              the Customer&apos;s dress code, and refrain from any conduct that could damage the
              Company&apos;s relationship with the Customer. You will escalate any concern about the
              assignment to your IOTA Delivery Manager rather than to the Customer directly.
            </Clause>
            <Clause n="3.6" title="Customer right to request replacement">
              You acknowledge that the Customer may request your removal from the assignment. In
              that event the Company will discuss the reasons with you and seek to redeploy you;
              where the reasons amount to misconduct, the Company&apos;s disciplinary procedure will
              apply.
            </Clause>
          </>
        ) : null}
        <Clause n={customer ? '3.7' : '3.4'} title="Company policies">
          You will comply with the Company&apos;s employee handbook, code of conduct, information
          security and anti-bribery policies, as amended from time to time.
          {customer
            ? " Where the Company's and the Customer's policies differ, the stricter requirement applies."
            : ''}
        </Clause>
      </Section>

      {/* 4. Confidentiality */}
      <Section n={4} title="Confidentiality, data protection and intellectual property">
        <Clause n="4.1" title="Confidential information">
          You will not, during or after your employment, disclose or use for any purpose other than
          your duties any confidential information of the Company
          {customer
            ? " or of the Customer, including the Customer's systems architecture, configurations, credentials, source code, security findings, commercial terms, and any information about the Customer's clients, accounts or transactions"
            : ' or of its customers, including systems architecture, configurations, credentials, source code, security findings and commercial terms'}
          . This obligation is in addition to the confidentiality provisions of Article 65 of the
          Saudi Labor Law and survives termination indefinitely.
        </Clause>
        {d.regulatedFinancialCustomer ? (
          <Clause n="4.2" title="Banking secrecy and regulatory obligations">
            You acknowledge that the Customer is a licensed financial institution. You will comply
            with the banking secrecy, cybersecurity and outsourcing requirements imposed by the
            Saudi Central Bank (SAMA), including the SAMA Cybersecurity Framework, and will sign any
            non-disclosure undertaking the Customer requires as a condition of access.
          </Clause>
        ) : null}
        {(() => {
          const base = d.regulatedFinancialCustomer ? 2 : 1;
          const n = (i) => `4.${base + i}`;
          return (
            <>
              <Clause n={n(1)} title="Personal data">
                You will handle personal data only as instructed, in compliance with the Saudi
                Personal Data Protection Law (PDPL) and its regulations, and will not copy, export
                or transfer any {customer ? 'Customer' : 'Company or customer'} data outside the{' '}
                {customer ? "Customer's" : "Company's"} approved systems or outside the Kingdom
                without written authorisation.
              </Clause>
              <Clause n={n(2)} title="Information security incidents">
                You will report any actual or suspected security incident, data loss or policy
                breach immediately to{' '}
                {customer
                  ? "the Customer's security team and to your IOTA Delivery Manager"
                  : "the Company's information security team and your line manager"}
                .
              </Clause>
              <Clause n={n(3)} title="Intellectual property">
                All work products, scripts, documentation, configurations, tools and know-how you
                create in the course of your employment are the property of the Company
                {customer ? ' or, where the assignment contract so provides, of the Customer' : ''}.
                You assign to the Company all rights in such work and will sign any document needed
                to perfect that assignment. Pre-existing materials you own must be declared in
                writing before use.
              </Clause>
              <Clause n={n(4)} title={`Use of Company${customer ? ' and Customer' : ''} assets`}>
                Equipment, accounts and software provided to you are to be used for work purposes
                only, must not be shared, and must be returned on request or on termination.
              </Clause>
              <Clause n={n(5)} title="Media and public statements">
                You will not make any public statement, social media post or publication referring
                to{' '}
                {customer
                  ? 'the Customer, its systems or the assignment'
                  : "the Company's customers or their systems"}{' '}
                without the Company&apos;s prior written approval.
              </Clause>
            </>
          );
        })()}
      </Section>

      {/* 5. Exclusivity */}
      <Section n={5} title="Exclusivity, conflict of interest and non-solicitation">
        <Clause n="5.1" title="Exclusive service">
          You will devote your full working time to the Company and will not, without the
          Company&apos;s prior written consent, take up any other employment, consultancy or
          business activity, paid or unpaid, during your employment.
        </Clause>
        <Clause n="5.2" title="Conflict of interest">
          You will disclose in writing any personal, financial or family interest that could
          conflict with your duties to the Company{customer ? ' or the Customer' : ''}, including
          any interest in a competitor, supplier or client of {customer ? 'either' : 'the Company'}.
        </Clause>
        {customer ? (
          <Clause n="5.3" title="Non-solicitation of the Customer">
            For twelve (12) months after your employment ends, you will not, directly or indirectly,
            accept employment or engagement with the Customer, or with any entity to provide
            services to the Customer, in relation to the services that you performed, without the
            Company&apos;s written consent. This restriction protects the Company&apos;s legitimate
            interest in the Customer relationship that gave you access, is limited in time, place
            (the Kingdom of Saudi Arabia) and type of work, and is agreed in accordance with Article
            83 of the Saudi Labor Law.
          </Clause>
        ) : null}
        <Clause n={customer ? '5.4' : '5.3'} title="Non-solicitation of employees">
          For twelve (12) months after your employment ends, you will not solicit or induce any
          employee or contractor of the Company with whom you worked to leave the Company.
        </Clause>
        <Clause n={customer ? '5.5' : '5.4'} title="Gifts and anti-bribery">
          You will not offer, give or accept gifts, hospitality or payments from{' '}
          {customer
            ? 'the Customer, its staff or suppliers'
            : "the Company's customers, suppliers or their staff"}{' '}
          beyond nominal value, and will comply with the Company&apos;s anti-bribery policy and
          applicable KSA anti-corruption law.
        </Clause>
      </Section>

      {/* 6. Termination */}
      <Section n={6} title="Termination, notice and exit">
        <Clause n="6.1" title="Notice">
          After probation, either party may terminate this contract for a valid reason by giving{' '}
          {inWords(d.noticeDays)} days&apos; written notice, or payment in lieu, in accordance with
          Article 75 of the Saudi Labor Law.
          {d.fixedTerm
            ? ' Where a fixed-term contract is ended early without a valid reason, the compensation provided in Article 77 applies.'
            : ''}
        </Clause>
        <Clause n="6.2" title="Termination for cause">
          The Company may terminate your employment without notice, award or compensation in the
          circumstances set out in Article 80 of the Labor Law, including serious misconduct, breach
          of confidentiality, or a security breach{customer ? ' at the Customer' : ''}. You may
          terminate without notice in the circumstances set out in Article 81.
        </Clause>
        <Clause n="6.3" title="Garden leave and handover">
          During any notice period the Company may require you to complete a structured handover and
          knowledge transfer{customer ? ' to the Customer or a replacement consultant' : ''}, or may
          release you from duties while continuing to pay your remuneration.
        </Clause>
        <Clause n="6.4" title="Return of property and access">
          On termination, or earlier on request, you will return all Company
          {customer ? ' and Customer' : ''} property, badges, tokens, documents and data, and will
          cooperate in the revocation of your system access.
        </Clause>
        <Clause n="6.5" title="Final settlement">
          Your final settlement, including accrued leave, end-of-service award and any other dues,
          will be paid within the period required by the Labor Law, after deduction of any amounts
          lawfully owed to the Company.
        </Clause>
        {d.expatriate ? (
          <Clause n="6.6" title="Exit formalities">
            On final exit the Company will bear the cost of your repatriation ticket and the
            cancellation of your Iqama, provided you complete the exit formalities. If you transfer
            to another employer in the Kingdom, the transfer costs will be borne as agreed between
            you and the new employer.
          </Clause>
        ) : null}
        {d.trainingCostRecovery ? (
          <Clause
            n={d.expatriate ? '6.7' : '6.6'}
            title="Recovery of mobilization and training costs"
          >
            If you resign, or are terminated for cause under clause 6.2, within twelve (12) months
            of your joining date, you agree to repay the Company the actual documented costs it
            incurred to mobilize you (visa and Iqama fees, joining air ticket, relocation support)
            and any certification or training costs set at {money(d.trainingCostRecovery, cur)}. The
            Company will provide an itemised statement of these costs and may set them off against
            your final settlement to the extent permitted by the Labor Law.
          </Clause>
        ) : null}
      </Section>

      {/* 7. General */}
      <Section n={7} title="General terms">
        <Clause n="7.1" title="Governing law">
          This letter and your employment are governed by the Labor Law of the Kingdom of Saudi
          Arabia and its implementing regulations. Any dispute will be referred to the competent
          labor authorities and courts in the Kingdom. Where any term of this letter is less
          favourable to you than the Labor Law, the Labor Law prevails.
        </Clause>
        <Clause n="7.2" title="Qiwa contract and language">
          Your employment contract will be registered on Qiwa in Arabic and English. In case of
          conflict, the Arabic text registered on Qiwa prevails, and this letter will be read
          consistently with it.
        </Clause>
        <Clause n="7.3" title="Documents required before joining">
          Please provide: passport copy (valid for at least 6 months); current Iqama and work
          permit, or final exit / visa transfer documents; attested degree certificates;
          professional certifications; previous employment certificates; passport-size photographs;
          bank IBAN; and signed acknowledgement of the Company&apos;s code of conduct and
          information security policy.
          {customer
            ? ' The Customer may additionally require a police clearance certificate and a signed Customer non-disclosure undertaking.'
            : ''}
        </Clause>
        <Clause n="7.4" title="Representations">
          This offer relies on the accuracy of the information in your CV, application and
          interviews. Any material misstatement may result in withdrawal of the offer or termination
          for cause.
        </Clause>
        <Clause n="7.5" title="Entire agreement and variation">
          This letter, together with the Qiwa contract and the Company&apos;s policies, sets out the
          entire terms of your employment and supersedes any prior verbal or written discussions.
          Variations must be in writing and signed by both parties.
        </Clause>
        <Clause n="7.6" title="Validity of offer">
          This offer remains open for acceptance until{' '}
          {longDate(d.offerValidUntil) || 'the date stated by the Company'}, after which it lapses
          unless extended in writing.
        </Clause>
      </Section>

      {/* Addendum — the offer's own clauses, only when there are any */}
      {d.clauses.length ? (
        <Section title="Addendum">
          <Text style={s.p}>
            The following terms form part of this offer and apply in addition to sections 1 to 7.
          </Text>
          {d.clauses.map((c, i) => (
            <Clause key={`${i}-${c.title}`} n={`A.${i + 1}`} title={c.title || 'Additional term'}>
              {c.content}
            </Clause>
          ))}
        </Section>
      ) : null}

      {/* 8. Acceptance */}
      <Section n={8} title="Acceptance" wrap={false}>
        <Text style={s.p}>
          We look forward to welcoming you to IOTA Technologies
          {customer ? ` and to the ${d.client} engagement` : ''}. To accept this offer, please sign
          and return a copy of this letter by the date above.
        </Text>
        <View style={s.acceptRule} />
        {[
          ['Date', signatures?.iota?.date || signatures?.employee?.date || ''],
          ['Contract No.', d.documentNumber, true],
          ['Between', `IOTA Technologies and\n${d.name}`, true],
          ['Authorised Signatory of IOTA Technologies', signatures?.iota?.name || ''],
          [
            'Passport / Government Doc #',
            [d.passportNumber, d.governmentId].filter(Boolean).join(' / '),
          ],
        ].map(([k, v, bold]) => (
          <View key={k} style={s.aRow}>
            <Text style={s.aKey}>{k}</Text>
            <Text style={{ ...s.aVal, ...(bold ? s.b : {}) }}>{v}</Text>
          </View>
        ))}
        <View style={{ ...s.aRow, borderBottomWidth: 0 }}>
          <Text style={s.aKey}>Employee Name (As per legal document)</Text>
          <Text style={s.aVal}>{d.name.toUpperCase()}</Text>
        </View>
        <View style={s.signRow}>
          <SignedLine sig={signatures?.iota} />
          <SignedLine sig={signatures?.employee} />
        </View>
        <View style={{ ...s.signRow, marginTop: signatures ? 22 : 34 }}>
          <View style={s.signCol}>
            <Text>NAME: {signatures?.iota?.name || '________________________________'}</Text>
            <Text>(for and on behalf of IOTA Technologies)</Text>
          </View>
          <View style={s.signCol}>
            <Text>NAME: {signatures?.employee?.name || '________________________________'}</Text>
            <Text>(Employee)</Text>
          </View>
        </View>
        <View style={{ ...s.signRow, marginTop: signatures ? 22 : 34 }}>
          <Text style={s.signCol}>
            DATE: {signatures?.iota?.date || '__________________________________'}
          </Text>
          <Text style={s.signCol}>
            DATE: {signatures?.employee?.date || '__________________________________'}
          </Text>
        </View>
      </Section>

      {/* Back page */}
      <Page size="A4" style={s.back}>
        <Image src="/logo/iota-logo-full-white.png" style={{ width: 92, marginBottom: 22 }} />
        <Text style={s.backLabel}>Office</Text>
        <Text style={s.backValue}>{OFFICE.addressFull}</Text>
        <Text style={s.backLabel}>Email</Text>
        <Text style={s.backValue}>{OFFICE.email}</Text>
        <Text style={s.backLabel}>Website</Text>
        <Text style={s.backValue}>{OFFICE.website}</Text>
      </Page>
    </Document>
  );
}
