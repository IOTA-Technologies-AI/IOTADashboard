import axios from 'axios';

/**
 * Employee vetting — IDfy background verification.
 *
 * Every call goes through the global axios instance whose request interceptor
 * (src/utils/apiHelper.js) attaches the live bearer token, so these inherit the
 * same auth as the rest of the IOTA API surface.
 *
 * Errors are re-thrown rather than swallowed into an empty result: a vetting
 * that silently returns nothing is indistinguishable from a candidate with no
 * checks, and these calls cost money per submission.
 */

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

/**
 * The catalogue of checks IOTA can run, fetched from the backend rather than
 * duplicated here. The backend builds IDfy's request bodies from the same
 * definitions, so the form can never collect fields the API does not expect.
 */
export async function getVettingCatalogue() {
  const response = await axios.get(`${API_BASE_URL}/vetting/checks`);
  return response.data?.checks || [];
}

export async function listVettings() {
  const response = await axios.get(`${API_BASE_URL}/vetting`);
  return response.data?.data || [];
}

export async function getVetting(id) {
  const response = await axios.get(`${API_BASE_URL}/vetting/${id}`);
  return response.data?.data || null;
}

export async function createVetting(payload) {
  const response = await axios.post(`${API_BASE_URL}/vetting`, payload);
  return response.data?.data || null;
}

/** Poll IDfy for outstanding checks and persist whatever has landed. */
export async function refreshVetting(id) {
  const response = await axios.post(`${API_BASE_URL}/vetting/${id}/refresh`);
  return response.data?.data || null;
}

export async function deleteVetting(id) {
  const response = await axios.delete(`${API_BASE_URL}/vetting/${id}`);
  return response.data;
}
