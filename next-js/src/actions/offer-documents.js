import iotaApi from 'src/lib/iota-api';

/**
 * Offers for onboarded employees, and uploaded offer letters.
 * See offers/offerDocuments.ts in the API.
 */

/** Onboarded employees whose vetting a Super Admin approved, with no offer yet. */
export async function listEligibleCandidates() {
  const res = await iotaApi.get('/offers/eligible-candidates');
  return res.data?.candidates || [];
}

/**
 * Uploads a PDF offer letter straight to OneDrive (no request-size limit),
 * then records it on the offer.
 */
export async function uploadOfferLetter(offerId, file) {
  const { data } = await iotaApi.post(`/offers/${offerId}/create-upload-session`, {
    fileName: file.name,
  });
  const res = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
      'Content-Length': String(file.size),
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`The upload failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const uploaded = await res.json();
  await iotaApi.post(`/offers/${offerId}/link-document`, {
    fileName: data.safeFileName,
    fileId: uploaded.id,
    webUrl: uploaded.webUrl,
  });
}

export async function getOfferDocument(offerId) {
  const res = await iotaApi.get(`/offers/${offerId}/document`);
  return res.data;
}

export async function getOfferDocumentByToken(token) {
  const res = await iotaApi.get(`/offers/sign/${token}/document`);
  return res.data;
}

/** Cross-checks the uploaded letter against the offer's data. */
export async function verifyOfferDocument(offerId) {
  const res = await iotaApi.post(`/offers/${offerId}/verify-document`, {}, { timeout: 180000 });
  return res.data?.verification;
}

export async function setOfferStampPlacements(offerId, stampPlacements) {
  const res = await iotaApi.post(`/offers/${offerId}/stamp-placements`, { stampPlacements });
  return res.data;
}

export const base64ToBlobUrl = (base64, type = 'application/pdf') =>
  URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type }));
