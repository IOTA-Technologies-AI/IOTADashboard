import useSWR from 'swr';

import iotaApi from 'src/lib/iota-api';

/**
 * Talent — client requirements and the resume library. All calls go through
 * the shared client, which attaches the live bearer token.
 */

const fetcher = (url, params) => iotaApi.get(url, { params }).then((r) => r.data);

const swrOptions = { revalidateOnFocus: false, keepPreviousData: true };

// ─── Requirements ────────────────────────────────────────────────────────────

export function useTalentRequirements(params = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/talent/requirements', params],
    ([url, p]) => fetcher(url, p),
    swrOptions
  );
  return { requirements: data?.requirements || [], error, loading: isLoading, mutate };
}

export function useTalentRequirement(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/talent/requirements/${id}` : null,
    (url) => fetcher(url),
    swrOptions
  );
  return { requirement: data?.requirement || null, error, loading: isLoading, mutate };
}

export async function createRequirement(payload) {
  const res = await iotaApi.post('/talent/requirements', payload);
  return res.data?.requirement;
}

export async function updateRequirement(id, payload) {
  const res = await iotaApi.patch(`/talent/requirements/${id}`, payload);
  return res.data?.requirement;
}

export async function deleteRequirement(id) {
  await iotaApi.delete(`/talent/requirements/${id}`);
}

export async function generateRequirementJd(id) {
  const res = await iotaApi.post(`/talent/requirements/${id}/generate-jd`, {});
  return res.data?.requirement;
}

export async function createJobFromRequirement(id) {
  const res = await iotaApi.post(`/talent/requirements/${id}/create-job`, {});
  return res.data;
}

export async function recordLinkedinPost(id, postUrl) {
  const res = await iotaApi.post(`/talent/requirements/${id}/linkedin`, { postUrl });
  return res.data?.requirement;
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export function useTalentResumes(params = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/talent/resumes', params],
    ([url, p]) => fetcher(url, p),
    swrOptions
  );
  return { resumes: data?.resumes || [], error, loading: isLoading, mutate };
}

export function useTalentResume(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/talent/resumes/${id}` : null,
    (url) => fetcher(url),
    swrOptions
  );
  return {
    resume: data?.resume || null,
    shares: data?.shares || [],
    error,
    loading: isLoading,
    mutate,
  };
}

/** Uploads a raw resume; the API formats and anonymises it. */
export async function uploadTalentResume({ fileName, fileBase64, requirementId }) {
  // AI structuring of a long resume can take a while.
  const res = await iotaApi.post(
    '/talent/resumes',
    { fileName, fileBase64, requirementId: requirementId || undefined },
    { timeout: 180000 }
  );
  return res.data?.resume;
}

export async function updateTalentResume(id, payload) {
  const res = await iotaApi.patch(`/talent/resumes/${id}`, payload);
  return res.data?.resume;
}

export async function getOriginalResumeLink(id) {
  const res = await iotaApi.get(`/talent/resumes/${id}/original`);
  return res.data;
}

export async function shareTalentResume(id, { pdfBase64, expiresInDays }) {
  const res = await iotaApi.post(`/talent/resumes/${id}/share`, { pdfBase64, expiresInDays });
  return res.data?.share;
}

export async function revokeResumeShare(shareId) {
  const res = await iotaApi.post(`/talent/shares/${shareId}/revoke`, {});
  return res.data?.share;
}

/** The API's message for a failed call, or a fallback. */
export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;
