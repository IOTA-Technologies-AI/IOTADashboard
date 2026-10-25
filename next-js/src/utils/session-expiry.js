import { paths } from 'src/routes/paths';

import { signOut } from 'src/auth/context/supabase/action';

// ----------------------------------------------------------------------

/**
 * The Encore gateway's 401 messages (auth/auth.ts in the API) that mean "this
 * session is no longer usable" — signing in again fixes every one of them.
 *
 * The other gateway 401s are deliberately absent: "single sign-on required"
 * and "user is not provisioned" would fail again straight after a fresh
 * sign-in, so signing the user out for them would only loop. So are 401s an
 * endpoint throws itself, such as OneDrive's "Unauthorized: …" for a bad
 * Microsoft token.
 */
const SESSION_ENDED = ['missing bearer token', 'invalid or expired token'];

/**
 * The gateway's 401 when the session is fine but its TOTP check has lapsed
 * (12 hours, auth/sessions.ts in the API). Signing in again is not needed —
 * a new code is — so TotpGuard is asked to prompt instead.
 */
const SECOND_FACTOR = 'second factor required';

/** Window event TotpGuard listens for to ask for the code again. */
export const TOTP_REQUIRED_EVENT = 'iota:totp-required';

export const SESSION_EXPIRED_REASON = 'session-expired';

let ending = false;

/** True when an axios error is the gateway rejecting the session itself. */
export function isSessionExpiredError(error) {
  if (error?.response?.status !== 401) return false;
  const message = String(error.response.data?.message || '').toLowerCase();
  return SESSION_ENDED.some((m) => message.includes(m));
}

/** True when an axios error is the gateway asking for the TOTP code again. */
export function isSecondFactorError(error) {
  if (error?.response?.status !== 401) return false;
  return String(error.response.data?.message || '')
    .toLowerCase()
    .includes(SECOND_FACTOR);
}

/** Asks TotpGuard for a new code (dashboard only; public pages have no session). */
export function requireSecondFactor() {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith(paths.dashboard.root)) return;
  window.dispatchEvent(new Event(TOTP_REQUIRED_EVENT));
}

/**
 * Signs the user out and sends them to sign in again, returning to this page
 * afterwards. Runs once however many requests fail together, and only inside
 * the dashboard — public pages (candidate intake, signing links) have no
 * session to end.
 */
export async function endExpiredSession() {
  if (typeof window === 'undefined' || ending) return;
  if (!window.location.pathname.startsWith(paths.dashboard.root)) return;
  ending = true;

  try {
    // Only this browser: the session here is already dead, and a global
    // sign-out would also end the user's sessions on their other devices.
    await signOut({ scope: 'local' });
  } catch (err) {
    // The session is already unusable; go to sign-in regardless.
    console.warn('[session] sign-out after expiry failed:', err?.message || err);
  }

  const params = new URLSearchParams({
    returnTo: `${window.location.pathname}${window.location.search}`,
    reason: SESSION_EXPIRED_REASON,
  });
  // A full load, not a router push: nothing from the dead session survives.
  window.location.replace(`${paths.auth.supabase.signIn}?${params}`);
}

/** Ends the session on an expired-session 401 from this axios instance. */
export function watchSessionExpiry(instance) {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (isSessionExpiredError(error)) endExpiredSession();
      else if (isSecondFactorError(error)) requireSecondFactor();
      return Promise.reject(error);
    }
  );
}
