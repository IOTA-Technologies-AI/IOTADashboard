/**
 * Which IOTA office issued an invoice or proforma.
 *
 * Documents store their currency, which is copied from the issuing office
 * (each office bills in its own currency). The office decides the legal name,
 * VAT number and bank details printed on the document, so a currency that
 * matches no office, or more than one, is refused rather than printed under
 * another entity — the same rule iota-offices.js applies to contracts.
 *
 * @param {string} currencyCode - the document's currency, e.g. 'SAR'
 * @param {Array<{ id: string, name?: string, currency: string }>} offices
 * @returns {object} the one office billing in that currency
 * @throws {Error} with a message fit to show the user
 */
export function resolveDocumentOffice(currencyCode, offices) {
  const code = String(currencyCode || '').trim().toUpperCase();
  if (!code) {
    throw new Error('This document has no currency, so the issuing IOTA office is unknown.');
  }
  const matches = (offices || []).filter(
    (o) => String(o?.currency || '').trim().toUpperCase() === code
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(
      `No IOTA office bills in ${code}, so this document can't be printed with the right legal entity, VAT number and bank details. Check the office settings.`
    );
  }
  throw new Error(
    `More than one IOTA office bills in ${code} (${matches
      .map((o) => o.name || o.id)
      .join(', ')}), so the issuing entity is ambiguous. Give each office its own currency in the office settings.`
  );
}
