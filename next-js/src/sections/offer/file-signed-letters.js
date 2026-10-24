import { stampPdf } from 'src/utils/document-stamp';
import { finalizeOffer } from 'src/utils/apiHelper';

import iotaApi from 'src/lib/iota-api';
import { sendDocumentVersion } from 'src/actions/document-management';

import { LETTERS } from 'src/components/offer-letter';

// ----------------------------------------------------------------------

/** Signed offer letters are filed as contracts of Talent & Managed Services. */
const PRACTICE = 5;
const DOC_TYPE = 'AGR';
const CLASSIFICATION = 'confidential';

const officeOf = (offer) =>
  /india|ind\b/i.test(String(offer?.iotaOffice ?? '')) ? 'India' : 'KSA';

/**
 * File every signed letter of an offer in Document Management: each gets a
 * document ID (one per letter, linked to the offer), its first page is
 * stamped with the classification and the ID, and the stamped PDF is kept in
 * OneDrive as version 1. The offer then records where each letter is.
 *
 * `renderSigned(letter)` resolves to the signed letter as a PDF Blob.
 * Filing again after a failure part-way reuses what was already filed.
 * Resolves to the updated offer.
 */
export async function fileSignedLetters(offer, letters, renderSigned) {
  const filed = [];
  for (const letter of letters) {
    const label = LETTERS[letter]?.label ?? 'Offer letter';

    const { data } = await iotaApi.post('/document-management/documents', {
      title: `${label} — ${offer.candidateName} (${offer.contractNumber})`,
      practice: PRACTICE,
      docType: DOC_TYPE,
      classification: CLASSIFICATION,
      customerId: null,
      subjectName: offer.candidateName,
      iotaOffice: officeOf(offer),
      notes: `Signed by ${offer.candidateName} and IOTA. Offer ${offer.contractNumber}.`,
      sourceType: 'offer',
      sourceId: `${offer.id}:${letter}`,
    });
    const { document } = data;

    if (!document.currentVersion) {
      const blob = await renderSigned(letter);

      await sendDocumentVersion(document.documentId, {
        render: (version) =>
          stampPdf(blob, {
            documentId: document.display,
            version,
            classification: document.classification || CLASSIFICATION,
            positions: document.stampPositions,
          }),
        // Already stamped: Document Management hands it out as it is.
        origin: 'generated',
        extension: 'pdf',
        note: 'Signed by the employee and IOTA',
      });
    }

    const detail = await iotaApi.get(`/document-management/documents/${document.documentId}`);
    const latest = (detail.data.versions ?? []).reduce(
      (a, v) => (!a || v.version > a.version ? v : a),
      null
    );
    filed.push({
      letter,
      documentId: document.display,
      version: latest?.version ?? 1,
      webUrl: latest?.onedriveWebUrl ?? null,
      fileId: latest?.onedriveFileId ?? null,
    });
  }
  return finalizeOffer(offer.id, filed);
}
