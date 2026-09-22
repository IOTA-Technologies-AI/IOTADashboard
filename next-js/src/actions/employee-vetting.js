import iotaApi from 'src/lib/iota-api';

/**
 * Employee vetting — IDfy background verification.
 *
 * Errors are re-thrown rather than swallowed into an empty result: a vetting
 * that silently returns nothing is indistinguishable from a candidate with no
 * checks, and these calls cost money per submission.
 *
 * Calls go through the shared `src/lib/iota-api` client, which attaches the
 * live bearer token itself. These pages once used the default axios instance
 * and relied on `src/utils/apiHelper.js` having been imported somewhere else in
 * the bundle to authenticate them — it had not been, and every call 401'd.
 */

/**
 * The catalogue of checks IOTA can run, fetched from the backend rather than
 * duplicated here. The backend builds IDfy's request bodies from the same
 * definitions, so the form can never collect fields the API does not expect.
 */
export async function getVettingCatalogue() {
  const response = await iotaApi.get('/vetting/checks');
  return response.data?.checks || [];
}

export async function listVettings() {
  const response = await iotaApi.get('/vetting');
  return response.data?.data || [];
}

export async function getVetting(id) {
  const response = await iotaApi.get(`/vetting/${id}`);
  return response.data?.data || null;
}

export async function createVetting(payload) {
  const response = await iotaApi.post('/vetting', payload);
  return response.data?.data || null;
}

/**
 * Send a vetting that was saved as a draft. Only checks still in draft are
 * dispatched, so calling this twice cannot resubmit — and pay for — a check
 * that already went out.
 */
export async function submitVetting(id) {
  const response = await iotaApi.post(`/vetting/${id}/submit`);
  return response.data?.data || null;
}

/** Poll IDfy for outstanding checks and persist whatever has landed. */
export async function refreshVetting(id) {
  const response = await iotaApi.post(`/vetting/${id}/refresh`);
  return response.data?.data || null;
}

export async function deleteVetting(id) {
  const response = await iotaApi.delete(`/vetting/${id}`);
  return response.data;
}
