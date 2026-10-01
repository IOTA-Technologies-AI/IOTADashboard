/**
 * Shapes a resource-calculation proposal exactly as the API declares it.
 *
 * The backend decodes the request against `ResourceCalculationResource` and
 * `ResourceCalculationLineItem` (profile/profileInterfaces.ts) and rejects the
 * WHOLE request on the first field that is missing or of the wrong type:
 * a premium factor typed as "2.1", a resource without `totalMonthly`, a null
 * `jdId`. The form holds its values the way inputs hand them over, so every
 * number, string and boolean is normalised here, in one place, before sending.
 *
 * Kept free of React so it can be exercised from a plain Node script.
 */

export const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

const toText = (value) => (value === null || value === undefined ? '' : String(value));

/** One cost line, every field present and typed. Extra keys such as `code` are kept. */
export function normalizeLineItem(item, index = 0) {
  const src = item || {};
  const monthly = toNumber(src.monthly);
  return {
    ...src,
    id: toText(src.id) || `li${index + 1}`,
    label: toText(src.label),
    category: toText(src.category) || 'custom',
    monthly,
    annual: toNumber(src.annual, monthly * 12),
    isComputed: Boolean(src.isComputed),
    formula: toText(src.formula),
    order: toNumber(src.order, index + 1),
    isActive: src.isActive !== false,
    isEditable: Boolean(src.isEditable),
  };
}

/** One quoted resource, every field present and typed. Totals are recomputed by the API. */
export function normalizeResource(resource, index = 0) {
  const src = resource || {};
  const lineItems = (Array.isArray(src.lineItems) ? src.lineItems : []).map(normalizeLineItem);
  const monthlyFromLines = lineItems
    .filter((li) => li.isActive)
    .reduce((sum, li) => sum + li.monthly, 0);
  const totalMonthly = toNumber(src.totalMonthly, monthlyFromLines) || monthlyFromLines;
  return {
    id: toText(src.id) || `r${index + 1}`,
    fullName: toText(src.fullName).trim(),
    jdId: toText(src.jdId),
    candidateId: toText(src.candidateId),
    nationality: toText(src.nationality).trim(),
    quantity: Math.max(1, Math.round(toNumber(src.quantity, 1)) || 1),
    insurancePremiumFactor: toNumber(src.insurancePremiumFactor, 1) || 1,
    dependentsCount: Math.max(0, Math.round(toNumber(src.dependentsCount))),
    familyStatus: Boolean(src.familyStatus),
    insuranceCostPerPax: toNumber(src.insuranceCostPerPax, 3000) || 3000,
    ticketCostPerPax: toNumber(src.ticketCostPerPax, 2500) || 2500,
    baseSalary: toNumber(src.baseSalary),
    resumeUrl: toText(src.resumeUrl),
    lineItems,
    totalMonthly,
    totalAnnual: toNumber(src.totalAnnual, totalMonthly * 12) || totalMonthly * 12,
  };
}
