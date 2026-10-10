import useSWR from 'swr';

import iotaApi from 'src/lib/iota-api';

/** Issue reports ("Report an issue"); see diagnostics/issues.ts in the API. */

const fetcher = (url) => iotaApi.get(url).then((res) => res.data);

export async function createIssue(body) {
  const res = await iotaApi.post('/issues', body, { timeout: 120000 });
  return res.data;
}

export function useIssues(status) {
  const url = status && status !== 'all' ? `/issues?status=${status}` : '/issues';
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, { revalidateOnFocus: false });
  return {
    issues: data?.issues ?? [],
    canManage: !!data?.canManage,
    error,
    loading: isLoading,
    refresh: mutate,
  };
}

export function useIssue(id) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/issues/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  return { issue: data, error, loading: isLoading, refresh: mutate };
}

export async function updateIssue(id, patch) {
  const res = await iotaApi.patch(`/issues/${id}`, patch);
  return res.data;
}

export async function refreshIssueEvidence(id) {
  const res = await iotaApi.post(`/issues/${id}/refresh`, {}, { timeout: 60000 });
  return res.data;
}

export async function getIssueBrief(id) {
  const res = await iotaApi.get(`/issues/${id}/brief`);
  return res.data?.markdown ?? '';
}
