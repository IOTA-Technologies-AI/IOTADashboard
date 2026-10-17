/**
 * Everything the IOTA Employee Offer Letter shows, from an offer record — the
 * one mapping used by the preview, the offer page, the signing page and the
 * final PDF, so they can never disagree.
 *
 * Per-employee wording lives in offer.letterTerms (Supabase offers.letterTerms);
 * anything not set falls back to the template's standard terms.
 */

/** The template's standard terms (the IOTA offer letter, October 2026). */
export const DEFAULT_LETTER_TERMS = {
  title: 'Mr.',
  grade: '',
  division: '',
  reportsTo: '',
  duties: '',
  probationDays: 90,
  insuranceClass: '',
  dependantsCovered: 2,
  airTicketCap: 2000,
  eosIncludesAllowances: false,
  dependantsIqamaCovered: false,
  regulatedFinancialCustomer: false,
  trainingCostRecovery: 0,
  offerValidUntil: '',
  governmentId: '',
  signatoryName: '',
};

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/** "one (1)", "sixty (60)" — the letter's style for small numbers. */
export function inWords(n) {
  const v = Number(n);
  if (!Number.isInteger(v) || v < 0) return String(n ?? '');
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];
  let w;
  if (v <= 20) w = ONES[v];
  else if (v < 100) w = `${tens[Math.floor(v / 10)]}${v % 10 ? `-${ONES[v % 10]}` : ''}`;
  else return String(v);
  return `${w} (${v})`;
}

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** October 18, 2026 — the cover page. */
export const longDateUS = (v) =>
  toDate(v)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? '';

/** 1 December 2026 — in the clauses. */
export const longDate = (v) =>
  toDate(v)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '';

export const money = (v, currency = 'SAR') =>
  `${currency} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "one (1) year", "eighteen (18) months". */
export function termInWords(months) {
  const m = Number(months);
  if (!m) return '';
  if (m % 12 === 0) {
    const y = m / 12;
    return `${inWords(y)} year${y === 1 ? '' : 's'}`;
  }
  return `${inWords(m)} month${m === 1 ? '' : 's'}`;
}

const isSaudi = (nationality) => /saudi/i.test(String(nationality || ''));

/**
 * The letter's data. `offer` is an offers row (or the New Offer form mapped to
 * the same field names); `issuedAt` defaults to the document ID's issue time.
 */
export function letterDataFromOffer(offer = {}) {
  const terms = { ...DEFAULT_LETTER_TERMS, ...(offer.letterTerms || {}) };
  const client = offer.clientName && offer.clientCustomerId != null ? offer.clientName : null;
  const currency = offer.currency || 'SAR';
  const basic = Number(offer.basicSalary) || 0;
  const housing = Number(offer.housingAllowance) || 0;
  const transport = Number(offer.transportationAllowance) || 0;
  const other = Number(offer.otherAllowances) || 0;
  const total = Number(offer.totalSalary) || basic + housing + transport + other;
  const signatory = (offer.iotaSignatories || [])[0];

  return {
    documentNumber: offer.contractNumber || '',
    issuedAt: offer.documentIssuedAt || offer.createdAt || new Date().toISOString(),
    title: terms.title,
    name: offer.candidateName || offer.employeeName || '',
    passportNumber: offer.passportNumber || '',
    governmentId: terms.governmentId,
    nationality: offer.nationality || '',
    expatriate: !isSaudi(offer.nationality),
    position: offer.position || '',
    grade: terms.grade,
    division: terms.division || offer.department || '',
    client,
    reportsTo:
      terms.reportsTo ||
      (client
        ? `the IOTA Delivery Manager responsible for the ${client} account`
        : 'your IOTA line manager'),
    duties: terms.duties,
    startDate: offer.startDate,
    fixedTerm: (offer.contractType || 'Limited') !== 'Unlimited',
    contractMonths: Number(offer.contractDuration) || 12,
    probationDays: Number(terms.probationDays) || 90,
    hoursPerDay: Number(offer.workingHours) || 8,
    annualLeaveDays: Number(offer.annualLeaveDays) || 30,
    noticeDays: Number(offer.noticePeriod) || 60,
    currency,
    salary: { basic, housing, transport, other, total },
    insuranceClass: terms.insuranceClass,
    dependantsCovered: Number(terms.dependantsCovered) || 0,
    airTicketCap: Number(terms.airTicketCap) || 0,
    eosIncludesAllowances: !!terms.eosIncludesAllowances,
    dependantsIqamaCovered: !!terms.dependantsIqamaCovered,
    regulatedFinancialCustomer: !!client && !!terms.regulatedFinancialCustomer,
    trainingCostRecovery: Number(terms.trainingCostRecovery) || 0,
    offerValidUntil: terms.offerValidUntil,
    signatoryName: terms.signatoryName || signatory?.name || 'Abdul Raheem Syed',
    clauses: (offer.clauses || []).filter((c) => c && (c.title || c.content)),
  };
}
