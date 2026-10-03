import { resolveBearerToken } from 'src/utils/jwt-auth';

import { IOTA_API_HOST } from 'src/lib/iota-api';

// ----------------------------------------------------------------------

/**
 * `fetch` against the Encore gateway with the signed-in user's live bearer
 * token attached. For the action modules that were written around the Fetch
 * API rather than axios: they keep their response handling and return shapes,
 * and only swap `fetch(url, init)` for `apiFetch(path, init)`.
 *
 * This runs in the browser, where the Supabase session lives. It must NOT be
 * called from a `'use server'` module or a server component: there is no user
 * session on the server, so the request goes out without a token and every
 * `auth: true` endpoint answers 401 "unauthenticated".
 */
export async function apiFetch(path, init = {}) {
  const token = await resolveBearerToken();

  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    // Send nothing rather than something stale, same as src/lib/iota-api.
    delete headers.Authorization;
  }

  const url = path.startsWith('http') ? path : `${IOTA_API_HOST}${path}`;

  return fetch(url, { cache: 'no-store', ...init, headers });
}
