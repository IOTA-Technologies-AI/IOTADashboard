import axios from 'axios';

import { resolveBearerToken } from 'src/utils/jwt-auth';

/**
 * Employee vetting — IDfy background verification.
 *
 * Errors are re-thrown rather than swallowed into an empty result: a vetting
 * that silently returns nothing is indistinguishable from a candidate with no
 * checks, and these calls cost money per submission.
 */

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

/**
 * A dedicated instance that attaches the bearer token itself.
 *
 * The app-wide interceptor lives in `src/utils/apiHelper.js` and is registered
 * as a side effect of importing that module — it patches the DEFAULT axios
 * instance. Nothing in this route's bundle imports apiHelper, so on the vetting
 * pages that interceptor never ran: a plain `axios.get` sent no Authorization
 * header at all and the gateway rejected every call as unauthenticated.
 *
 * Owning the interceptor here removes the dependency on another module having
 * been loaded first, which is not something an import graph should be trusted
 * to guarantee — and not something a reader of this file could see.
 */
const vettingApi = axios.create({ baseURL: API_BASE_URL });

vettingApi.interceptors.request.use(async (config) => {
  const token = await resolveBearerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Send nothing rather than something stale: the API then reports a missing
    // token, which is the truth, instead of an invalid one.
    delete config.headers.Authorization;
  }
  return config;
});

/**
 * The catalogue of checks IOTA can run, fetched from the backend rather than
 * duplicated here. The backend builds IDfy's request bodies from the same
 * definitions, so the form can never collect fields the API does not expect.
 */
export async function getVettingCatalogue() {
  const response = await vettingApi.get('/vetting/checks');
  return response.data?.checks || [];
}

export async function listVettings() {
  const response = await vettingApi.get('/vetting');
  return response.data?.data || [];
}

export async function getVetting(id) {
  const response = await vettingApi.get(`/vetting/${id}`);
  return response.data?.data || null;
}

export async function createVetting(payload) {
  const response = await vettingApi.post('/vetting', payload);
  return response.data?.data || null;
}

/**
 * Send a vetting that was saved as a draft. Only checks still in draft are
 * dispatched, so calling this twice cannot resubmit — and pay for — a check
 * that already went out.
 */
export async function submitVetting(id) {
  const response = await vettingApi.post(`/vetting/${id}/submit`);
  return response.data?.data || null;
}

/** Poll IDfy for outstanding checks and persist whatever has landed. */
export async function refreshVetting(id) {
  const response = await vettingApi.post(`/vetting/${id}/refresh`);
  return response.data?.data || null;
}

export async function deleteVetting(id) {
  const response = await vettingApi.delete(`/vetting/${id}`);
  return response.data;
}
