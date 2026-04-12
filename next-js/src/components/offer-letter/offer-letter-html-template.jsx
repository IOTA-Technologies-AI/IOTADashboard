/**
 * Offer Letter HTML Template — styled for Paged.js / browser print-to-PDF.
 *
 * Design based on IOTA branded Canva template:
 *  Page 1  — Dark hero cover + blue bottom panel
 *  Page 2  — Welcome message (bilingual EN/AR)
 *  Page 3  — Company Overview (About IOTA)
 *  Page 4  — Employment Terms bilingual (EN | AR) part 1
 *  Page 5  — Employment Terms bilingual (EN | AR) part 2
 *  Page 6  — Employee Acknowledgment (salary table + signatures)
 *  Page 7  — Agreement (contract details + signature blocks)
 *  Page 8  — Mission & Values (English)
 *  Page 9  — Mission & Values (Arabic)
 *  Last    — Contact / back cover (solid blue)
 *  Audit   — Audit trail (optional, print-hidden)
 *
 * Props:
 *  offer          — full Offer object from the backend
 *  showSignatures — render embedded signature images (default true)
 *  showAuditTrail — render audit trail page (default true)
 */

'use client';

// ── Brand colours ──────────────────────────────────────────────────────────
const BLUE = '#1a3fe0';
const ORANGE = '#e8480a';
const DARK_BLUE = '#1a3c7a';
const BG_PAGE = '#e8edf4';
const TEXT = '#1a1a1a';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (dateStr) => {
  if (!dateStr) return '___________';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fmtCurrency = (amount, currency = 'SAR') => {
  if (amount === undefined || amount === null) return '—';
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const numberToWords = (n) => {
  if (!n && n !== 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.round(Number(n));
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  return numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
};

// ── Sub-components ─────────────────────────────────────────────────────────

function PageHeader({ section, contractNumber }) {
  return (
    <div style={pageHeaderStyle}>
      <span style={{ fontWeight: 600, letterSpacing: '0.08em' }}>{section}</span>
      <span>{contractNumber}</span>
    </div>
  );
}

function PageFooter({ pageNum }) {
  return (
    <div style={pageFooterStyle}>
      <span style={footerBarStyle} />
      <span style={{ marginLeft: 8, fontSize: 10, color: '#6b7a8d' }}>{pageNum}</span>
    </div>
  );
}

function TermRow({ en, ar }) {
  return (
    <div style={termRowStyle}>
      <div style={termColStyle}>{en}</div>
      <div style={{ ...termColStyle, textAlign: 'right', direction: 'rtl', fontFamily: "'Noto Sans Arabic', Arial, sans-serif" }}>{ar}</div>
      <div style={termDividerStyle} />
    </div>
  );
}

function SigLine({ label, name, title, signatureData, signedAt, orange }) {
  return (
    <div style={sigLineWrap}>
      {signatureData
        ? <img src={signatureData} alt={`Signature of ${name}`} style={sigImageStyle} />
        : <div style={{ ...sigUnderline, borderColor: orange ? ORANGE : '#999' }} />
      }
      <div style={{ ...sigUnderline, borderColor: orange ? ORANGE : '#999', marginTop: 4 }} />
      {label && <p style={sigLabelStyle}>{label}</p>}
      <p style={{ ...sigNameStyle, color: orange ? ORANGE : DARK_BLUE }}>{name}</p>
      {title && <p style={sigTitleStyle}>{title}</p>}
      {signedAt && <p style={sigTitleStyle}>Date: {fmt(signedAt)}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OfferLetterHtmlTemplate({
  offer,
  showSignatures = true,
  showAuditTrail = true,
}) {
  if (!offer) return null;

  const cur = offer.currency || 'SAR';
  const candidateFirstName = (offer.candidateName || '').split(' ')[0];
  const probDays = offer.probationPeriod ? offer.probationPeriod * 30 : 90;
  const hoursPerDay = offer.workingHours ? Math.round(offer.workingHours / 5) : 8;
  const leaveDays = offer.annualLeaveDays || 21;
  const noticeDays = offer.noticePeriod || 30;
  const totalWords = numberToWords(Math.round(offer.totalSalary || 0));
  const currencyLabel = cur === 'SAR' ? 'Saudi Arabian Riyal' : cur;
  const primarySig = offer.iotaSignatories && offer.iotaSignatories.length > 0
    ? offer.iotaSignatories[0]
    : null;

  return (
    <div className="offer-document" style={documentWrap}>
      <style>{pagedCss}</style>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 1 — COVER
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageCover}>
        {/* Hero — dark navy radial gradient */}
        <div style={coverHero}>
          <img src="/logo/logo-single.png" alt="IOTA" style={coverLogoStyle} />
          <span style={coverContractNum}>{offer.contractNumber}</span>
          <div style={coverOrangeStripe} />
        </div>

        {/* Blue bottom panel */}
        <div style={coverBluePanel}>
          <div style={coverBluePanelOrange} />
          <div style={{ flex: 1 }}>
            <h1 style={coverTitle}>{'Employee\nOffer Letter'}</h1>
            <div style={coverMeta2Col}>
              <div>
                <p style={coverMetaLabel}>Prepared for</p>
                <p style={coverMetaValue}>{(offer.candidateName || '').toUpperCase()}</p>
              </div>
              <div>
                <p style={coverMetaLabel}>Prepared by</p>
                <p style={coverMetaValue}>{'HR & PEOPLE MANAGEMENT,\nIOTA TECHNOLOGIES'}</p>
              </div>
            </div>
          </div>
          <div style={coverDocLabel}>
            <span style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>
              DOCUMENT # {offer.contractNumber}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 2 — WELCOME MESSAGE
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="WELCOME MESSAGE" contractNumber={offer.contractNumber} />
        <h1 style={bigOrangeHeading}>{`Hi ${candidateFirstName},\nWelcome to\nIOTA!`}</h1>
        <div style={twoColLayout}>
          <div style={twoColLeft}>
            <p style={leadBlue}>
              Hello there! You&apos;re now part of our team, and we&apos;re very excited to have
              you onboard.
            </p>
            <p style={bodyText}>
              We are delighted to welcome you to IOTA Technologies. You are now part of a team
              driven by innovation, excellence, and global ambition. We believe your skills and
              dedication will contribute meaningfully to our journey toward becoming the
              world&apos;s leading IT services company. We wish you a successful, rewarding, and
              inspiring career with us.
            </p>
            <p style={{ ...bodyText, textAlign: 'right', direction: 'rtl', fontFamily: "'Noto Sans Arabic', Arial, sans-serif", marginTop: 16 }}>
              يسرّنا أن نرحب بكم في شركة IOTA Technologies. أنتم الآن جزء من فريق يقوده الابتكار والتميّز والطموح العالمي. نثق بأن مهاراتكم والتزامكم سيكون لهما دور مؤثر في رحلتنا نحو أن تصبح الشركة الرائدة عالمياً في خدمات تقنية المعلومات. نتمنى لكم مسيرة مهنية ناجحة ومثمرة وملهمة معنا.
            </p>
            <p style={signOffStyle}>Best regards,</p>
            <p style={{ ...signOffName, color: ORANGE }}>Mohammed Zakiuddin</p>
          </div>
        </div>
        <PageFooter pageNum={1} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 3 — COMPANY OVERVIEW
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="ABOUT IOTA" contractNumber={offer.contractNumber} />
        <h1 style={bigOrangeHeading}>Company Overview</h1>
        <p style={leadBlue}>
          At IOTA, we strive to make a difference through cutting-edge solutions and unparalleled
          service.
        </p>
        <div style={twoColLayout}>
          <div style={twoColLeft}>
            <h3 style={columnHeading}>About IOTA Technologies</h3>
            <p style={bodyText}>
              IOTA Technologies is a forward-thinking IT services and consulting company
              specialising in Artificial Intelligence (AI) solutions for the Banking and Financial
              Services industry. With deep expertise in financial domain processes, we are
              dedicated to transforming how banks, financial institutions, and fintech
              organisations operate, unlocking new levels of efficiency, intelligence, and
              innovation.
            </p>
            <p style={{ ...bodyText, fontWeight: 600 }}>Financial Domain Mastery:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                IOTA Technologies focuses exclusively on the banking sector, ensuring its AI
                solutions are context-aware and tailored to industry-specific requirements such as
                fraud detection, credit risk modelling, transaction monitoring, and regulatory
                reporting.
              </li>
            </ul>
            <p style={{ ...bodyText, fontWeight: 600 }}>AI-Driven Transformation:</p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                Their solutions streamline traditional processes using robotic process automation
                (RPA) and deep learning, automating repetitive tasks like data entry, compliance
                checks, account reconciliation, and document review.
              </li>
            </ul>
          </div>
          <div style={twoColRight}>
            <ul style={{ ...ulStyle, marginTop: 48 }}>
              <li style={liStyle}>
                By optimising AI for financial applications, IOTA Technologies helps banks unlock
                significant value — according to industry analysis, AI innovations in banking can
                generate up to $1 trillion in annual value globally, through operational savings
                and new revenue opportunities.
              </li>
            </ul>
          </div>
        </div>
        <PageFooter pageNum={2} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 4 — EMPLOYMENT TERMS (part 1)
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="EMPLOYMENT TERMS" contractNumber={offer.contractNumber} />
        <h1 style={{ ...bigOrangeHeading, fontSize: 52 }}>Terms</h1>
        <div style={bilingualHeader}>
          <h2 style={bilingualTitle}>English</h2>
          <h2 style={bilingualTitle}>Arabic</h2>
        </div>
        <TermRow
          en={`We are pleased to offer you the position of ${offer.position || '___'} with IOTA Technologies, reporting to ${primarySig ? primarySig.name : 'Management'}.`}
          ar={`يسرّنا أن نقدم لكم عرض وظيفة بمسمى ${offer.position || '___'} لدى شركة تقنيات إيوتا، تحت إشراف ${primarySig ? primarySig.name : 'الإدارة'}.`}
        />
        <TermRow
          en={`Your employment will commence on ${fmt(offer.startDate)}.`}
          ar={`يبدأ عملكم بتاريخ ${fmt(offer.startDate)}.`}
        />
        <TermRow
          en={`You will be subject to a probation period of ${probDays} days, which may be extended as per Saudi Labor Law.`}
          ar={`تخضعون لفترة تجربة مدتها ${probDays} يوماً قابلة للتمديد وفقاً لنظام العمل السعودي.`}
        />
        <TermRow
          en={`Working hours will be ${hoursPerDay} hours per day, 5 days per week, as per company policy and Saudi Labor Law.`}
          ar={`تكون ساعات العمل ${hoursPerDay} ساعات يومياً، 5 أيام في الأسبوع، وفقاً لسياسة الشركة ونظام العمل السعودي.`}
        />
        <TermRow
          en="The company will register you under GOSI and contribute as per Saudi regulations. Employee contribution will be deducted from salary as applicable."
          ar="سيتم تسجيلكم في التأمينات الاجتماعية، وتتحمل الشركة حصتها حسب الأنظمة، ويتم خصم نسبة الموظف من الراتب وفقاً للنظام."
        />
        <TermRow
          en="You will be provided with medical insurance coverage as per company policy."
          ar="سيتم توفير تأمين طبي لكم حسب سياسة الشركة."
        />
        <PageFooter pageNum={3} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 5 — EMPLOYMENT TERMS (part 2)
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="EMPLOYMENT TERMS" contractNumber={offer.contractNumber} />
        <div style={{ ...bilingualHeader, marginTop: 28 }}>
          <h2 style={bilingualTitle}>English</h2>
          <h2 style={bilingualTitle}>Arabic</h2>
        </div>
        <TermRow
          en={`You are entitled to ${leaveDays} days annual leave, increasing to 30 days after 5 years of service, as per Saudi Labor Law.`}
          ar={`تستحقون ${leaveDays} يوم إجازة سنوية، وتزيد إلى 30 يوماً بعد 5 سنوات خدمة وفقاً لنظام العمل السعودي.`}
        />
        <TermRow
          en="Official public holidays will be granted as declared by the Kingdom of Saudi Arabia."
          ar="تُمنح الإجازات الرسمية حسب ما تعلنه المملكة العربية السعودية."
        />
        <TermRow
          en="End of Service Benefits will be calculated and paid as per Saudi Labor Law."
          ar="يتم احتساب وصرف مكافأة نهاية الخدمة وفقاً لنظام العمل السعودي."
        />
        <TermRow
          en={`Either party may terminate the contract by providing ${noticeDays} days written notice as per Saudi Labor Law.`}
          ar={`يحق لأي من الطرفين إنهاء العقد بإشعار كتابي ${noticeDays} يوماً وفقاً لنظام العمل السعودي.`}
        />
        <TermRow
          en="You are required to maintain confidentiality of company information during and after employment."
          ar="يجب المحافظة على سرية معلومات الشركة أثناء وبعد فترة العمل."
        />
        {offer.clauses && offer.clauses.length > 0 && offer.clauses.map((clause, i) => (
          <TermRow key={i} en={`${clause.title ? clause.title + ': ' : ''}${clause.content}`} ar="" />
        ))}
        <PageFooter pageNum={4} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 6 — EMPLOYEE ACKNOWLEDGMENT
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="ACKNOWLEDGMENT" contractNumber={offer.contractNumber} />
        <h1 style={{ ...bigOrangeHeading, fontSize: 48 }}>{'Employee\nAcknowledgment'}</h1>
        <table style={salaryTableStyle}>
          <thead>
            <tr>
              <th style={salaryThStyle}>Component</th>
              <th style={salaryThStyle}>Compensation</th>
            </tr>
          </thead>
          <tbody>
            <tr style={salaryRowStyle}>
              <td style={salaryTdStyle}>Basic Salary</td>
              <td style={salaryTdStyle}>{fmtCurrency(offer.basicSalary, cur)}</td>
            </tr>
            <tr style={salaryRowStyle}>
              <td style={salaryTdStyle}>House Rent Allowance</td>
              <td style={salaryTdStyle}>{fmtCurrency(offer.housingAllowance, cur)}</td>
            </tr>
            <tr style={salaryRowStyle}>
              <td style={salaryTdStyle}>Transport &amp; Other Allowance</td>
              <td style={salaryTdStyle}>
                {fmtCurrency((offer.transportationAllowance || 0) + (offer.otherAllowances || 0), cur)}
              </td>
            </tr>
            <tr>
              <td style={salaryTotalCellStyle}><strong>Total</strong></td>
              <td style={salaryTotalCellStyle}><strong>{fmtCurrency(offer.totalSalary, cur)}</strong></td>
            </tr>
          </tbody>
        </table>
        <p style={{ ...bodyText, textAlign: 'right', fontSize: 11, color: '#555', marginBottom: 32 }}>
          {currencyLabel} {totalWords} only per month
        </p>
        <div style={sigRowStyle}>
          {primarySig && (
            <SigLine
              name={primarySig.name}
              title={primarySig.title || 'Head of HR Department'}
              signatureData={showSignatures ? primarySig.signatureData : null}
              signedAt={showSignatures ? primarySig.signedAt : null}
              orange
            />
          )}
          <SigLine
            name={offer.candidateName}
            title={offer.position}
            signatureData={showSignatures ? offer.employeeSignatureData : null}
            signedAt={showSignatures ? offer.employeeSignedAt : null}
          />
        </div>
        <PageFooter pageNum={5} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 7 — AGREEMENT
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="AGREEMENT" contractNumber={offer.contractNumber} />
        <h1 style={{ ...bigOrangeHeading, fontSize: 56 }}>Agreement</h1>
        <table style={agreementTableStyle}>
          <tbody>
            <tr style={agreementFirstRowStyle}>
              <td style={agreementTdLabelStyle}>Date</td>
              <td style={agreementTdValueStyle}>{fmt(offer.startDate)}</td>
            </tr>
            <tr style={agreementRowStyle}>
              <td style={agreementTdLabelStyle}>Contract No.</td>
              <td style={agreementTdValueStyle}>{offer.contractNumber}</td>
            </tr>
            <tr style={agreementRowStyle}>
              <td style={agreementTdLabelStyle}>Between</td>
              <td style={agreementTdValueStyle}>{`IOTA Technologies and\n${offer.candidateName || ''}`}</td>
            </tr>
            {primarySig && (
              <tr style={agreementRowStyle}>
                <td style={agreementTdLabelStyle}>Authorised Signatory of IOTA Technologies</td>
                <td style={agreementTdValueStyle}>{primarySig.name}</td>
              </tr>
            )}
            {offer.passportNumber && (
              <tr style={agreementRowStyle}>
                <td style={agreementTdLabelStyle}>Passport / Government ID #</td>
                <td style={agreementTdValueStyle}>{offer.passportNumber}</td>
              </tr>
            )}
            <tr style={agreementRowStyle}>
              <td style={agreementTdLabelStyle}>Employee Name (As per legal document)</td>
              <td style={agreementTdValueStyle}>{(offer.candidateName || '').toUpperCase()}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...sigRowStyle, marginTop: 36 }}>
          <div style={{ flex: 1 }}>
            <p style={nameDateLabel}>NAME:&nbsp;<span style={nameDateLine} /></p>
            <p style={nameDateSub}>(for and on behalf of IOTA Technologies)</p>
            <p style={{ ...nameDateLabel, marginTop: 24 }}>DATE:&nbsp;<span style={nameDateLine} /></p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={nameDateLabel}>NAME:&nbsp;<span style={nameDateLine} /></p>
            <p style={nameDateSub}>(Employee)</p>
            <p style={{ ...nameDateLabel, marginTop: 24 }}>DATE:&nbsp;<span style={nameDateLine} /></p>
          </div>
        </div>
        <div style={{ ...sigRowStyle, marginTop: 32 }}>
          {primarySig && (
            <SigLine
              name={primarySig.name}
              title={primarySig.title || 'Head of HR Department'}
              signatureData={showSignatures ? primarySig.signatureData : null}
              signedAt={showSignatures ? primarySig.signedAt : null}
              orange
            />
          )}
          <SigLine
            name={offer.candidateName}
            title={offer.position}
            signatureData={showSignatures ? offer.employeeSignatureData : null}
            signedAt={showSignatures ? offer.employeeSignedAt : null}
          />
        </div>
        <PageFooter pageNum={6} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 8 — MISSION & VALUES (English)
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageLight}>
        <PageHeader section="ABOUT IOTA" contractNumber={String(new Date().getFullYear())} />
        <h2 style={columnHeading}>Our Mission</h2>
        <p style={bodyText}>
          Our mission is to leverage AI to disrupt traditional banking by enabling partners and
          customers to access next-generation, data-driven solutions that deliver unmatched value.
          Through a combination of domain knowledge and cutting-edge AI technologies, we help our
          clients stay ahead of the digital curve.
        </p>
        {[
          { num: '01', title: 'Innovative Excellence', text: 'At IOTA Technologies, we drive continuous innovation by delivering cutting-edge IT solutions that solve complex business challenges. We embrace emerging technologies including AI, Cloud, Cybersecurity, and Data to create transformative value. Our commitment to excellence ensures high-quality delivery, precision, and measurable impact.' },
          { num: '02', title: 'Sustainable Leadership', text: 'We lead with integrity, accountability, and long-term vision. Our strategies focus on sustainable growth, ethical governance, and industry leadership. We invest in people, partnerships, and innovation to build lasting value.' },
          { num: '03', title: 'Teamwork and Collaboration', text: 'We believe success is built on trust, respect, and collective strength. Our teams collaborate across borders, disciplines, and cultures to deliver unified solutions. We foster an inclusive environment where every voice contributes to innovation.' },
          { num: '04', title: 'Exceptional Customer Service', text: "Our customers are at the heart of everything we do. We deliver responsive, reliable, and value-driven services that exceed expectations. Through strategic partnerships, we act as trusted advisors in our clients' digital transformation journey." },
        ].map((v) => (
          <div key={v.num}>
            <h3 style={valueTitle}>{v.title}</h3>
            <p style={bodyText}>{v.text}</p>
            <p style={valueNum}>{v.num}</p>
            <hr style={valueDivider} />
          </div>
        ))}
        <PageFooter pageNum={7} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 9 — MISSION & VALUES (Arabic)
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ ...pageLight, direction: 'rtl' }}>
        <PageHeader section="ABOUT IOTA" contractNumber={String(new Date().getFullYear())} />
        <h2 style={{ ...columnHeading, textAlign: 'right', fontFamily: "'Noto Sans Arabic', Arial, sans-serif" }}>مهمتنا</h2>
        <p style={{ ...bodyText, textAlign: 'right', fontFamily: "'Noto Sans Arabic', Arial, sans-serif" }}>
          تتمثل مهمتنا في تسخير الذكاء الاصطناعي لإحداث نقلة نوعية في القطاع المصرفي التقليدي، وذلك بتمكين شركائنا وعملائنا من الوصول إلى حلول منظورة تعتمد على البيانات، وتقدم قيمة لا مثيل لها.
        </p>
        {[
          { num: '01', title: 'التميّز الابتكاري', text: 'نلتزم بدفع عجلة الابتكار المستمر من خلال تقديم حلول تقنية تعالج التحديات المعقدة للأعمال. نتبنى أحدث التقنيات مثل الذكاء الاصطناعي والسحابية والأمن السيبراني وتحليلات البيانات لتحقيق قيمة حقيقية ومستدامة.' },
          { num: '02', title: 'القيادة المستدامة', text: 'نقود أعمالنا بنزاهة ومسؤولية ورؤية استراتيجية طويلة المدى. تركز استراتيجياتنا على النمو المستدام والحوكمة الرشيدة والريادة في القطاع. نستثمر في الكفاءات والشراكات والابتكار لبناء قيمة طويلة الأجل.' },
          { num: '03', title: 'العمل الجماعي والتعاون', text: 'نؤمن بأن النجاح يتحقق من خلال الثقة والاحترام والعمل بروح الفريق الواحد. تتعاون فرقنا عبر الحدود والتخصصات والثقافات لتقديم حلول متكاملة وفعّالة.' },
          { num: '04', title: 'خدمة عملاء استثنائية', text: 'عملاؤنا هم محور اهتمامنا وأساس نجاحنا. نقدم خدمات موثوقة وسريعة الاستجابة ومبنية على تحقيق قيمة مضافة تفوق التوقعات. نحرص على بناء شراكات استراتيجية طويلة الأمد ونكون مستشاراً موثوقاً في رحلة التحول الرقمي لعملائنا.' },
        ].map((v) => (
          <div key={v.num}>
            <h3 style={{ ...valueTitle, textAlign: 'right', fontFamily: "'Noto Sans Arabic', Arial, sans-serif" }}>{v.title}</h3>
            <p style={{ ...bodyText, textAlign: 'right', fontFamily: "'Noto Sans Arabic', Arial, sans-serif" }}>{v.text}</p>
            <p style={{ ...valueNum, textAlign: 'right' }}>{v.num}</p>
            <hr style={valueDivider} />
          </div>
        ))}
        <PageFooter pageNum={8} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          LAST PAGE — CONTACT / BACK COVER
      ════════════════════════════════════════════════════════════════ */}
      <div style={pageBackCover}>
        <div style={{ ...pageHeaderStyle, borderBottom: 'none', color: 'rgba(255,255,255,0.55)' }}>
          <span style={{ fontWeight: 600, letterSpacing: '0.08em' }}>CONTACT</span>
          <span>{offer.contractNumber}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img src="/logo/logo-single.png" alt="IOTA" style={{ height: 34, filter: 'brightness(0) invert(1)' }} />
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '0.05em', fontFamily: "'Inter', Arial, sans-serif" }}>IOTA</span>
          </div>
          <h2 style={getInTouchHeading}>Get in touch</h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <span style={contactIcon}>📍</span>
            <span style={contactText}>Office #9, 1st Floor, Jarir Street, AlMalaz, Riyadh, KSA - 12836</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={contactIcon}>✉</span>
            <span style={contactText}>hr@iotatechnologies.ai</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={contactIcon}>🌐</span>
            <span style={contactText}>iotatechnologies.ai</span>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 32, paddingTop: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{new Date().getFullYear()}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          AUDIT TRAIL (optional, hidden from print)
      ════════════════════════════════════════════════════════════════ */}
      {showAuditTrail && offer.auditLog && offer.auditLog.length > 0 && (
        <div className="offer-audit-trail" style={pageLight}>
          <PageHeader section="AUDIT TRAIL" contractNumber={offer.contractNumber} />
          <h2 style={columnHeading}>Audit Trail &amp; Certificate of Execution</h2>
          <p style={bodyText}>
            The following log records all significant events in the lifecycle of this Agreement.
          </p>
          <table style={auditTableStyle}>
            <thead>
              <tr>
                <th style={auditThStyle}>Timestamp (UTC)</th>
                <th style={auditThStyle}>Action</th>
                <th style={auditThStyle}>Performed By</th>
                <th style={auditThStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {offer.auditLog.map((entry, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f0f3f8' : '#fff' }}>
                  <td style={auditTdStyle}>{new Date(entry.performedAt).toUTCString()}</td>
                  <td style={auditTdStyle}>{entry.action.replace(/_/g, ' ')}</td>
                  <td style={auditTdStyle}>{entry.performedBy}</td>
                  <td style={auditTdStyle}>{entry.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PageFooter pageNum="" />
        </div>
      )}
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────

const documentWrap = {
  fontFamily: "'Inter', Arial, sans-serif",
  color: TEXT,
  background: '#fff',
};

const pageBase = {
  width: '210mm',
  minHeight: '297mm',
  margin: '0 auto',
  boxSizing: 'border-box',
  pageBreakAfter: 'always',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};

const pageCover = { ...pageBase, padding: 0, background: '#000510' };

const pageLight = {
  ...pageBase,
  background: BG_PAGE,
  padding: '14mm 16mm 10mm',
};

const pageBackCover = {
  ...pageBase,
  background: BLUE,
  padding: '14mm 16mm 10mm',
};

const coverHero = {
  flex: '0 0 58%',
  background: 'radial-gradient(ellipse at 60% 40%, #0d2a6e 0%, #061030 40%, #000510 100%)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  padding: '18px 18px 0',
};

const coverLogoStyle = { height: 32, filter: 'brightness(0) invert(1)', zIndex: 2 };

const coverContractNum = {
  position: 'absolute',
  top: 14,
  right: 16,
  color: 'rgba(255,255,255,0.65)',
  fontSize: 10,
  letterSpacing: '0.06em',
  fontFamily: "'Inter', Arial, sans-serif",
};

const coverOrangeStripe = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 5,
  background: ORANGE,
};

const coverBluePanel = {
  flex: '0 0 42%',
  background: BLUE,
  padding: '20px 20px 20px 28px',
  display: 'flex',
  alignItems: 'flex-end',
  position: 'relative',
};

const coverBluePanelOrange = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 5,
  background: ORANGE,
};

const coverTitle = {
  fontSize: 44,
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 28px 0',
  lineHeight: 1.1,
  fontFamily: "'Inter', Arial, sans-serif",
  whiteSpace: 'pre-line',
};

const coverMeta2Col = { display: 'flex', gap: 24, marginBottom: 8 };

const coverMetaLabel = {
  margin: 0,
  fontSize: 9.5,
  color: 'rgba(255,255,255,0.6)',
  fontFamily: "'Inter', Arial, sans-serif",
  marginBottom: 3,
};

const coverMetaValue = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  fontFamily: "'Inter', Arial, sans-serif",
  whiteSpace: 'pre-line',
};

const coverDocLabel = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  alignSelf: 'stretch',
};

const pageHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  paddingBottom: 8,
  marginBottom: 4,
  fontSize: 9,
  color: '#6b7a8d',
  fontFamily: "'Inter', Arial, sans-serif",
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
};

const pageFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  borderTop: '1px solid #c8d0db',
  paddingTop: 8,
  marginTop: 'auto',
};

const footerBarStyle = {
  display: 'inline-block',
  width: 4,
  height: 14,
  background: DARK_BLUE,
  borderRadius: 1,
  flexShrink: 0,
};

const bigOrangeHeading = {
  fontSize: 60,
  fontWeight: 800,
  color: ORANGE,
  margin: '12px 0 18px',
  lineHeight: 1.05,
  fontFamily: "'Inter', Arial, sans-serif",
  whiteSpace: 'pre-line',
};

const twoColLayout = { display: 'flex', gap: 20, flex: 1 };
const twoColLeft = { flex: 1 };
const twoColRight = { flex: 1 };

const leadBlue = {
  fontSize: 12.5,
  color: DARK_BLUE,
  fontWeight: 600,
  lineHeight: 1.6,
  marginBottom: 12,
  fontFamily: "'Inter', Arial, sans-serif",
};

const bodyText = {
  fontSize: 11.5,
  lineHeight: 1.7,
  color: '#2a2a2a',
  marginBottom: 10,
  textAlign: 'justify',
  fontFamily: "'Inter', Arial, sans-serif",
};

const columnHeading = {
  fontSize: 14,
  fontWeight: 700,
  color: DARK_BLUE,
  marginTop: 0,
  marginBottom: 8,
  fontFamily: "'Inter', Arial, sans-serif",
};

const ulStyle = { paddingLeft: 16, marginBottom: 8 };
const liStyle = {
  fontSize: 11.5,
  lineHeight: 1.65,
  color: '#2a2a2a',
  marginBottom: 6,
  fontFamily: "'Inter', Arial, sans-serif",
};

const signOffStyle = {
  fontSize: 11.5,
  color: '#555',
  marginBottom: 2,
  marginTop: 16,
  fontFamily: "'Inter', Arial, sans-serif",
};

const signOffName = {
  fontSize: 13,
  fontWeight: 700,
  margin: 0,
  fontFamily: "'Inter', Arial, sans-serif",
};

const bilingualHeader = { display: 'flex', marginBottom: 4 };

const bilingualTitle = {
  flex: 1,
  fontSize: 24,
  fontWeight: 700,
  color: DARK_BLUE,
  margin: 0,
  fontFamily: "'Inter', Arial, sans-serif",
};

const termRowStyle = {
  display: 'flex',
  gap: 24,
  paddingTop: 10,
  paddingBottom: 10,
  position: 'relative',
};

const termColStyle = {
  flex: 1,
  fontSize: 11,
  lineHeight: 1.65,
  color: '#2a2a2a',
  fontFamily: "'Inter', Arial, sans-serif",
  textAlign: 'justify',
};

const termDividerStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 1,
  background: ORANGE,
  opacity: 0.3,
};

const salaryTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
  fontFamily: "'Inter', Arial, sans-serif",
  marginBottom: 6,
};

const salaryThStyle = {
  background: '#2952a3',
  color: '#fff',
  padding: '10px 14px',
  fontWeight: 700,
  textAlign: 'left',
  fontSize: 12,
};

const salaryRowStyle = { background: '#c2d4e8' };

const salaryTdStyle = {
  padding: '10px 14px',
  color: '#1a2a4a',
  borderBottom: '2px solid #fff',
  fontSize: 12,
};

const salaryTotalCellStyle = {
  padding: '10px 14px',
  color: '#1a2a4a',
  background: '#a8c0d8',
  fontSize: 12.5,
};

const agreementTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 12,
};

const agreementFirstRowStyle = {
  borderTop: `2px solid ${ORANGE}`,
  borderBottom: '1px solid #c8d0db',
};

const agreementRowStyle = { borderBottom: '1px solid #c8d0db' };

const agreementTdLabelStyle = {
  padding: '10px 12px 10px 0',
  color: DARK_BLUE,
  fontSize: 11.5,
  width: '42%',
  verticalAlign: 'top',
};

const agreementTdValueStyle = {
  padding: '10px 0',
  color: TEXT,
  fontSize: 11.5,
  verticalAlign: 'top',
  whiteSpace: 'pre-line',
};

const nameDateLabel = {
  fontSize: 11,
  color: TEXT,
  margin: '0 0 2px',
  display: 'flex',
  alignItems: 'center',
  fontFamily: "'Inter', Arial, sans-serif",
};

const nameDateLine = {
  display: 'inline-block',
  flex: 1,
  borderBottom: `1.5px solid ${ORANGE}`,
  height: 14,
  marginLeft: 6,
};

const nameDateSub = {
  fontSize: 9.5,
  color: '#666',
  margin: 0,
  fontFamily: "'Inter', Arial, sans-serif",
};

const sigRowStyle = { display: 'flex', gap: 32 };

const sigLineWrap = { flex: 1 };

const sigImageStyle = {
  maxWidth: 160,
  maxHeight: 52,
  display: 'block',
  marginBottom: 4,
};

const sigUnderline = {
  width: '80%',
  borderBottom: '1px solid #ccc',
  marginBottom: 4,
  minWidth: 120,
};

const sigLabelStyle = {
  fontSize: 10,
  color: '#666',
  margin: '0 0 2px',
  fontFamily: "'Inter', Arial, sans-serif",
};

const sigNameStyle = {
  fontSize: 13,
  fontWeight: 700,
  margin: '4px 0 2px',
  fontFamily: "'Inter', Arial, sans-serif",
};

const sigTitleStyle = {
  fontSize: 10.5,
  color: '#555',
  margin: 0,
  fontFamily: "'Inter', Arial, sans-serif",
};

const valueTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: DARK_BLUE,
  marginTop: 12,
  marginBottom: 4,
  fontFamily: "'Inter', Arial, sans-serif",
};

const valueNum = {
  fontSize: 11,
  fontWeight: 700,
  color: ORANGE,
  margin: '6px 0 2px',
  fontFamily: "'Inter', Arial, sans-serif",
};

const valueDivider = {
  border: 'none',
  borderTop: '1px solid #c8d0db',
  margin: '4px 0 0',
};

const auditTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 10.5,
  fontFamily: "'Inter', Arial, sans-serif",
  marginTop: 12,
};

const auditThStyle = {
  background: DARK_BLUE,
  color: '#fff',
  padding: '7px 10px',
  textAlign: 'left',
  fontWeight: 600,
};

const auditTdStyle = {
  padding: '6px 10px',
  verticalAlign: 'top',
  borderBottom: '1px solid #dde3ec',
};

const getInTouchHeading = {
  fontSize: 40,
  fontWeight: 700,
  color: '#fff',
  margin: '0 0 20px',
  fontFamily: "'Inter', Arial, sans-serif",
};

const contactIcon = { color: ORANGE, fontSize: 14, flexShrink: 0, marginTop: 1 };

const contactText = {
  fontSize: 12.5,
  color: '#fff',
  fontFamily: "'Inter', Arial, sans-serif",
};

const pagedCss = `
@page {
  size: A4;
  margin: 0;
  @top-center { content: none; }
  @bottom-right { content: none; }
}
@media print {
  body { margin: 0; }
  .offer-document > div { page-break-after: always; }
  .offer-audit-trail { display: none !important; }
}
`;
