import { OfferLetterPDF } from './offer-letter-pdf';
import { OfferLetterOnePagePDF } from './offer-letter-one-page-pdf';

// ----------------------------------------------------------------------

/**
 * Which letter an offer is primarily on (offers.letterTerms.letterFormat).
 * New offers use the one-page bilingual offer; an offer created before it
 * keeps the detailed letter, because its signature and stamp zones were
 * placed on that letter's pages.
 */
export const isOnePageOffer = (offer) => offer?.letterTerms?.letterFormat === 'one_page';

export const LETTERS = {
  one_page: { label: 'One-page offer', short: 'One page', help: 'Bilingual, for signature' },
  detailed: { label: 'Detailed letter', short: 'Detailed', help: 'Full terms, kept for GOSI' },
};

/**
 * The generated letters the employee signs: those HR chose when sending
 * (letterTerms.signingLetters), else the primary letter alone.
 */
export function signingLettersOf(offer) {
  const chosen = (offer?.letterTerms?.signingLetters ?? []).filter((l) => LETTERS[l]);
  if (chosen.length) return chosen;
  return [isOnePageOffer(offer) ? 'one_page' : 'detailed'];
}

/**
 * Generated letters the employee is shown to read, never signs
 * (letterTerms.readingLetters) — the detailed GOSI letter beside a one-page offer.
 */
export function readingLettersOf(offer) {
  const signing = signingLettersOf(offer);
  return (offer?.letterTerms?.readingLetters ?? []).filter(
    (l) => LETTERS[l] && !signing.includes(l)
  );
}

/** The letter signature zones belong to: the offer's main letter. */
export const mainLetterOf = (offer) => (isOnePageOffer(offer) ? 'one_page' : 'detailed');

const dateOf = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

/**
 * The signatures given so far, for drawing into the letters: the employee's,
 * and IOTA's (the signatory named on the letter if they signed, else the
 * first who did).
 */
export function offerSignatures(offer) {
  if (!offer) return null;
  const employee = offer.employeeSignatureData
    ? {
        data: offer.employeeSignatureData,
        name: offer.candidateName,
        date: dateOf(offer.employeeSignedAt),
      }
    : null;
  const signed = (offer.iotaSignatories ?? []).filter((x) => x.signedAt && x.signatureData);
  const named = signed.find((x) => x.name === offer.letterTerms?.signatoryName) ?? signed[0];
  const iota = named
    ? { data: named.signatureData, name: named.name, date: dateOf(named.signedAt) }
    : null;
  return employee || iota ? { employee, iota } : null;
}

/**
 * Whether a letter's signatures are drawn in (the current way) rather than
 * stamped through signature zones: zones placed before this change belong to
 * the primary letter and keep being used there.
 */
export function drawsSignatures(offer, letter) {
  const zones = Array.isArray(offer?.signatureZones) ? offer.signatureZones : [];
  const primary = isOnePageOffer(offer) ? 'one_page' : 'detailed';
  return !(letter === primary && zones.length > 0);
}

/**
 * One letter of an offer (`letter`: one_page | detailed; default the primary
 * letter), with `signatures` drawn in when given.
 */
export function SigningLetterPDF({ offer, letter, signatures }) {
  const which = letter || (isOnePageOffer(offer) ? 'one_page' : 'detailed');
  return which === 'one_page' ? (
    <OfferLetterOnePagePDF offer={offer} signatures={signatures} />
  ) : (
    <OfferLetterPDF offer={offer} signatures={signatures} />
  );
}
