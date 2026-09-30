import iotaApi from 'src/lib/iota-api';

/**
 * Employee onboarding — one-time, OTP-verified form sent to employees who
 * already exist in HR > Employees. HR calls go through the shared client with
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

export async function applyOnboardingSubmission(id) {
  const response = await iotaApi.post(`/employee-onboarding/submissions/${id}/apply`);
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

export async function submitOnboardingForm(token, sessionToken, formData) {
  const response = await iotaApi.post(`/employee-onboarding/tokens/${token}/submit`, {
    sessionToken,
    ...formData,
  });
  return response.data;
}
