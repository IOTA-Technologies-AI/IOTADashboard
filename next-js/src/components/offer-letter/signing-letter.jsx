import { OfferLetterPDF } from './offer-letter-pdf';
import { OfferLetterOnePagePDF } from './offer-letter-one-page-pdf';

// ----------------------------------------------------------------------

/**
 * Which letter an offer is signed on (offers.letterTerms.letterFormat).
 * New offers use the one-page bilingual offer; an offer created before it
 * keeps the detailed letter, because its signature and stamp zones were
 * placed on that letter's pages.
 */
export const isOnePageOffer = (offer) => offer?.letterTerms?.letterFormat === 'one_page';

/** The letter the employee signs and the system files. */
export function SigningLetterPDF({ offer }) {
  return isOnePageOffer(offer) ? (
    <OfferLetterOnePagePDF offer={offer} />
  ) : (
    <OfferLetterPDF offer={offer} />
  );
}
