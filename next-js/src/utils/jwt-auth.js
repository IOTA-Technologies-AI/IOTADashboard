/**
 * JWT Authorization Enhancement for Permission Guards
 *
 * This module provides JWT extraction and server-side permission verification.
 * Since we're on Encore (backend), we can enhance the existing permission checks
 * by extracting JWT from Authorization header and validating it server-side.
 *
 * Current Flow:
 * 1. Frontend: Gets user from AuthContext (Supabase OAuth)
 * 2. Frontend: Calls /user-nav-permissions/{userId}/paths with user email
 * 3. Backend: Returns allowed paths based on user email
 * 4. Frontend: PermissionGuard checks paths against current pathname
 *
 * Enhanced Flow with JWT:
 * 1. Frontend: Extracts JWT token from Supabase session
 * 2. Frontend: Sends JWT in Authorization header: "Bearer {token}"
 * 3. Backend: Decodes JWT to get user info (no need for email parameter)
 * 4. Backend: Validates JWT signature and expiry
 * 5. Backend: Extracts userId/email from JWT claims
 * 6. Backend: Returns permissions based on verified user
 * 7. Frontend: Uses permissions as before
 */

import axios from 'axios';

import { supabase } from 'src/lib/supabase';

/**
 * Extract JWT token from browser localStorage (Supabase session storage)
 * Supabase stores auth data in localStorage under key: sb-{PROJECT_ID}-auth-token
 */
export const extractJWTFromSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    // Match the session key exactly. `includes('auth-token')` also matches
    // `sb-<ref>-auth-token-code-verifier`, the PKCE key Supabase writes during
    // sign-in, and `find` would return whichever happened to come first.
    const authKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );

    if (!authKey) return null;

    let raw = window.localStorage.getItem(authKey);
    if (!raw) return null;

    // supabase-js may store the session base64-encoded behind this prefix.
    if (raw.startsWith('base64-')) {
      raw = window.atob(raw.slice('base64-'.length));
    }

    const parsed = JSON.parse(raw);

    // supabase-js v2 stores the session object directly. Earlier versions
    // nested it under `session` or `currentSession`. Accept all three: reading
    // only the v2 shape is what silently returned null on every call and left
    // every request unauthenticated.
    return (
      parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null
    );
  } catch (error) {
    console.error('[JWT] Failed to extract JWT:', error.message);
    return null;
  }
};

/**
 * Refresh when the token has less than this long to live. The API allows no
 * clock skew, so a token that is valid when read and expired when it arrives
 * still fails; a minute of margin covers that.
 */
const REFRESH_MARGIN_SECONDS = 60;

const secondsUntilExpiry = (token) => {
  const claims = decodeJWT(token);
  return claims?.exp ? claims.exp - Date.now() / 1000 : Number.NEGATIVE_INFINITY;
};

/**
 * The access token for the LIVE session — refreshed if it is about to expire.
 *
 * `extractJWTFromSession` reads localStorage directly, which is only a snapshot
 * of whatever supabase-js last wrote. It has no way to refresh, and it happily
 * returns a token that expired months ago. On 2026-09-15 that was a token from
 * 15 April: the API verified the signature, rejected the expiry, and every
 * request from the dashboard failed with "invalid or expired token".
 *
 * This asks supabase-js for the session instead, checks the token's own `exp`
 * rather than trusting the stored `expires_at`, and forces a refresh when it is
 * stale. If the refresh token is dead the session cannot be revived: the local
 * copy is cleared so the guard sends the user back through Entra, rather than
 * leaving a corpse in storage for the next request to send again.
 *
 * Network failures are the one case that keeps the session: a transient outage
 * must not sign everybody out.
 *
 * @returns {Promise<string|null>} bearer token, or null when there is no usable session
 */
export const getLiveAccessToken = async () => {
  if (typeof window === 'undefined' || !supabase?.auth) return null;

  try {
    const {
      data: { session } = {},
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) return null;

    if (secondsUntilExpiry(session.access_token) > REFRESH_MARGIN_SECONDS) {
      return session.access_token;
    }

    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && data?.session?.access_token) {
      return data.session.access_token;
    }

    console.warn('[JWT] Session refresh failed:', refreshError?.message || 'no session returned');
    if (refreshError?.name !== 'AuthRetryableFetchError') {
      await supabase.auth.signOut({ scope: 'local' });
    }
    return null;
  } catch (err) {
    console.error('[JWT] Failed to resolve live session:', err?.message || err);
    return null;
  }
};

/**
 * @summary The bearer token to send, preferring the live session.
 * @description `getLiveAccessToken` is the right answer whenever it has one.
 * But it returns null for several reasons that are NOT "the user is signed
 * out" — supabase-js has not finished restoring the session from storage yet,
 * or a refresh failed on a flaky network — and the request interceptors treat
 * null as "send no Authorization header at all". The gateway then rejects the
 * call before its own auth handler ever runs, with Encore's generic
 * "Authentication required", which looks identical to being signed out and is
 * why a signed-in user saw every expense query fail with 401.
 *
 * So when the live lookup comes back empty, fall back to the stored token —
 * but ONLY while it is genuinely still valid. An expired token is never sent:
 * that is the failure this fallback exists to avoid repeating, and the API
 * reporting a missing token is far more useful than it reporting an expired
 * one nobody can explain.
 *
 * @returns {Promise<string|null>} bearer token, or null when nothing usable exists
 */
export const resolveBearerToken = async () => {
  const live = await getLiveAccessToken();
  if (live) return live;

  const stored = extractJWTFromSession();
  if (stored && secondsUntilExpiry(stored) > 0) {
    console.warn(
      '[JWT] Live session unavailable; falling back to the stored token, which is still valid.'
    );
    return stored;
  }

  return null;
};

/**
 * Get user info from JWT (client-side decoding)
 * Note: This is NOT cryptographic validation, just decoding
 * For security-critical operations, backend should validate signature
 */
export const decodeJWT = (token) => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format');
      return null;
    }

    // Decode payload (base64url to base64)
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('[JWT] Failed to decode JWT:', error.message);
    return null;
  }
};

/**
 * @summary The Supabase `session_id` of the CURRENT session.
 * @description The gateway binds the second factor to this exact claim
 * (`auth/auth.ts` gate 4 → `totpVerifiedSession.sessionId`), so it is the only
 * identifier under which "this session cleared MFA" is a meaningful statement.
 * The client used to record that fact against the user's EMAIL instead, which
 * says nothing about which session was verified — the two could therefore
 * disagree, and when they did the dashboard rendered normally while every API
 * call came back 401 "second factor required".
 *
 * Returns null when there is no usable session or the claim is absent. Callers
 * must treat null as "not verified" and prompt, never as "verified".
 *
 * @returns {Promise<string|null>} The session_id claim, or null.
 */
export const getLiveSessionId = async () => {
  const token = await resolveBearerToken();
  if (!token) return null;
  const claims = decodeJWT(token);
  return typeof claims?.session_id === 'string' ? claims.session_id : null;
};

/**
 * Fetch user permissions with JWT authentication
 * Backend validates JWT and uses embedded user info instead of relying on email parameter
 */
export const fetchUserPermissionsWithJWT = async (forceRefresh = false) => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://staging-iotaapiserver-s572.encr.app/';

  try {
    const token = extractJWTFromSession();
    if (!token) {
      console.warn('[JWT] No JWT token available');
      return [];
    }

    const response = await axios.get(`${API_BASE_URL}user-nav-permissions/paths`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const paths = response.data?.paths || [];
    console.log('[JWT] Fetched permissions via JWT:', paths.length, 'paths');
    return paths;
  } catch (error) {
    console.error('[JWT] Failed to fetch permissions with JWT:', error.message);
    return [];
  }
};

/**
 * Validate JWT expiry
 */
export const isJWTValid = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return false;

  const expiryTime = decoded.exp * 1000; // exp is in seconds
  return Date.now() < expiryTime;
};

/**
 * Get user info from JWT
 */
export const getUserFromJWT = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded) return null;

  return {
    id: decoded.sub,
    email: decoded.email,
    roles: decoded.roles || [],
    aud: decoded.aud,
  };
};

export const getJWTUserInfo = () => {
  const token = extractJWTFromSession();
  if (!token) return null;

  if (!isJWTValid(token)) {
    console.warn('[JWT] Token expired');
    return null;
  }

  return getUserFromJWT(token);
};
