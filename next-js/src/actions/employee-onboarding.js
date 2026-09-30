import iotaApi from 'src/lib/iota-api';

/**
 * Employee onboarding — one-time, OTP-verified form sent either to an existing
 * employee or to a new joiner (at their personal email) who has no HR record
 * yet; that record is created when HR accepts the submission. HR calls go through the shared client with
 * the live bearer token; the public form calls carry no token (the link + OTP
 * are the credential) and go through the same client, which simply sends no
 * Authorization header when there is no session.
 */

// ─── HR ──────────────────────────────────────────────────────────────────────

export async function generateOnboardingLink(payload) {
  const response = await iotaApi.post('/employee-onboarding/tokens', payload);
  return response.data;
}

export async function listOnboardingTokens(params = {}) {
  const response = await iotaApi.get('/employee-onboarding/tokens', { params });
  return response.data?.tokens || [];
}

export async function revokeOnboardingToken(id) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${id}/revoke`);
  return response.data;
}

export async function listOnboardingSubmissions(params = {}) {
  const response = await iotaApi.get('/employee-onboarding/submissions', { params });
  return response.data || { submissions: [], tokens: [] };
}

export async function getOnboardingSubmission(id) {
  const response = await iotaApi.get(`/employee-onboarding/submissions/${id}`);
  return response.data;
}

/**
 * Accept a submission. For a new joiner, `payload` carries what only HR knows
 * (employee code, joining date, designation…) and the employee record is
 * created; for an existing employee it is ignored.
 */
export async function applyOnboardingSubmission(id, payload = {}) {
  const response = await iotaApi.post(`/employee-onboarding/submissions/${id}/apply`, payload);
  return response.data;
}

// ─── Public form ─────────────────────────────────────────────────────────────

export async function getOnboardingToken(token) {
  const response = await iotaApi.get(`/employee-onboarding/tokens/${token}`);
  return response.data;
}

export async function requestOnboardingOtp(token, email) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${token}/request-otp`, {
    email,
  });
  return response.data;
}

export async function verifyOnboardingOtp(token, email, code) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${token}/verify-otp`, {
    email,
    code,
  });
  return response.data;
}

/** Save progress. The draft comes back from verify-otp on the next visit. */
export async function saveOnboardingDraft(token, sessionToken, draft, step) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${token}/draft`, {
    sessionToken,
    draft,
    step,
  });
  return response.data;
}

export async function submitOnboardingForm(token, sessionToken, formData) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${token}/submit`, {
    sessionToken,
    ...formData,
  });
  return response.data;
}
