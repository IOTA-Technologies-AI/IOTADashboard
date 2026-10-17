import iotaApi from 'src/lib/iota-api';

/** IOTA document IDs (offers/documentIds.ts in the API). */

export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/** Decode a 12-character ID (hyphens optional) into company, type, client, candidate and time. */
export async function decodeDocumentId(id) {
  const clean = String(id || '')
    .replace(/[-\s]/g, '')
    .toUpperCase();
  const res = await iotaApi.get(`/documents/decode/${encodeURIComponent(clean)}`);
  return res.data;
}

/** The ERP's customers, for choosing an offer's client. */
export async function listCustomers() {
  const res = await iotaApi.get('/customers');
  return (res.data?.customers ?? [])
    .filter((c) => c.customerStatus !== false)
    .map((c) => ({ id: c.id, name: c.customerNameEn }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
