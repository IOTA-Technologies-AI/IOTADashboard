import { getLiveSessionId } from 'src/utils/jwt-auth';

// ----------------------------------------------------------------------
// The tab's own record of "this Supabase session has cleared MFA".
//
// Keyed on the Supabase `session_id`, which is what the gateway binds the
// second factor to (auth/auth.ts gate 4). An email-keyed stamp would outlive
// the session it was made for — sessionStorage survives a sign-out within the
// same tab — and vouch for a session that never cleared MFA. Keyed on the
// session, the client and the server cannot disagree.
//
// Used by the login callback (stamps after the code is accepted), TotpGuard
// (reads it, re-stamps on re-verification) and AuthProvider (does not fetch
// permissions until it is set, since those endpoints need a cleared session).
// ----------------------------------------------------------------------

/** Hours before the dashboard asks for the code again (env-configurable). */
export const REAUTH_HOURS =
  Number(process.env.NEXT_PUBLIC_TOTP_REAUTH_HOURS) > 0
    ? Number(process.env.NEXT_PUBLIC_TOTP_REAUTH_HOURS)
    : 8;

export const REAUTH_MS = REAUTH_HOURS * 60 * 60 * 1000;

const PREFIX = 'totp_verified_at_';

export const totpSessionKey = (sessionId) => `${PREFIX}${sessionId}`;

/** When this session cleared MFA (ms since epoch), or null. */
export function getTotpVerifiedAt(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = sessionStorage.getItem(totpSessionKey(sessionId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function setTotpVerifiedAt(sessionId) {
  if (!sessionId) return;
  try {
    sessionStorage.setItem(totpSessionKey(sessionId), String(Date.now()));
  } catch {
    // sessionStorage unavailable (SSR / private mode) — non-fatal
  }
}

export function clearTotpVerifiedAt(sessionId) {
  if (!sessionId) return;
  try {
    sessionStorage.removeItem(totpSessionKey(sessionId));
  } catch {
    // non-fatal
  }
}

/** Drop every stamp this tab holds — on sign-out, so none outlives its session. */
export function clearAllTotpStamps() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // non-fatal
  }
}

/** True when the stamp is missing or older than the re-auth window. */
export function isTotpStampExpired(sessionId) {
  const ts = getTotpVerifiedAt(sessionId);
  if (!ts) return true;
  return Date.now() - ts > REAUTH_MS;
}

/** Stamp the live session as having cleared MFA just now. */
export async function markLiveSessionTotpVerified() {
  try {
    const sessionId = await getLiveSessionId();
    if (sessionId) setTotpVerifiedAt(sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Whether the live session has cleared MFA as far as this tab knows: a stamp
 * exists and is within the re-auth window. Calls that the gateway gates on the
 * second factor should not be made before this is true.
 */
export async function isLiveSessionTotpVerified() {
  try {
    const sessionId = await getLiveSessionId();
    return !!sessionId && !isTotpStampExpired(sessionId);
  } catch {
    return false;
  }
}
