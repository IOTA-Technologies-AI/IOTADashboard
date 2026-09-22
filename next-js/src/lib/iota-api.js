import axios from 'axios';

import { resolveBearerToken } from 'src/utils/jwt-auth';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

/**
 * The client for calls that go STRAIGHT to the Encore gateway, rather than
 * through this app's own `/api/*` proxy routes. Use `src/lib/axios.js` for
 * those; use this for everything that names the API host itself.
 *
 * Why this module exists at all: the app-wide interceptor in
 * `src/utils/apiHelper.js` patches the DEFAULT axios instance as a side effect
 * of importing that module. Any file that does `import axios from 'axios'` and
 * calls the API is therefore authenticated only when something else in the same
 * route's bundle happens to have imported apiHelper first. That is not a
 * property an import graph can be trusted to hold, and it is invisible in the
 * file that depends on it — it has already broken the vetting pages and the
 * nav-permission fetch, each of which then grew its own private copy of this
 * interceptor. This is that copy, once, in a place a new module can find.
 *
 * The host is resolved the same way as in `src/lib/axios.js`: the deployed
 * `NEXT_PUBLIC_SERVER_URL` has carried a trailing slash and a legacy
 * `/supabaseservices` suffix, either of which turns `${HOST}/jobs` into a path
 * the API does not serve, and the variable is unset on any target where nobody
 * filled it in.
 */
const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

export const IOTA_API_HOST = normalizeHost(CONFIG.serverUrl);

const iotaApi = axios.create({
  baseURL: IOTA_API_HOST,
  headers: { 'Content-Type': 'application/json' },
});

iotaApi.interceptors.request.use(async (config) => {
  const token = await resolveBearerToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    // Send nothing rather than something stale: the API then reports a missing
    // token, which is the truth, instead of an invalid one — which is what
    // sends everybody looking at the signing secret.
    delete config.headers.Authorization;
  }

  return config;
});

export default iotaApi;
