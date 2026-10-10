import { CONFIG } from 'src/global-config';

/**
 * The IOTA API host — the one place it is decided.
 *
 * It comes from NEXT_PUBLIC_SERVER_URL (CONFIG.serverUrl). Over 70 places used
 * to hardcode the staging host instead, so pointing the dashboard at another
 * Encore environment would have left those screens reading and writing the old
 * one. The fallback keeps today's host when the variable is unset.
 *
 * Normalised: no trailing slash, and no legacy `/supabaseservices` suffix
 * (either turns `${API_HOST}/profile/jd` into a path the API does not serve).
 */
export const DEFAULT_API_HOST = 'https://staging-iotaapiserver-s572.encr.app';

// The Minimal template's demo server, still in old .env files. Never the API.
const TEMPLATE_HOST = /api-dev-minimal/i;

export function normalizeApiHost(url) {
  const value = String(url || '').trim();
  const host = value && !TEMPLATE_HOST.test(value) ? value : DEFAULT_API_HOST;
  return host.replace(/\/supabaseservices\/?$/, '').replace(/\/+$/, '');
}

/** e.g. https://staging-iotaapiserver-s572.encr.app — no trailing slash */
export const API_HOST = normalizeApiHost(CONFIG.serverUrl);
