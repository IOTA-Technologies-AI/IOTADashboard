import useSWR, { mutate } from 'swr';

import iotaApi from 'src/lib/iota-api';

/** Integrations → LinkedIn: the company page connection and its synced activity; see linkedin/ in the API. */

const fetcher = (url) => iotaApi.get(url).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };

const refreshAll = () => mutate((key) => typeof key === 'string' && key.startsWith('/linkedin'));

export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export function useLinkedInStatus() {
  const { data, error, isLoading } = useSWR('/linkedin/status', fetcher, options);
  return { status: data ?? null, error, loading: isLoading };
}

export function useLinkedInOverview(enabled) {
  const { data, error, isLoading } = useSWR(
    enabled ? '/linkedin/overview' : null,
    fetcher,
    options
  );
  return { overview: data ?? null, error, loading: isLoading };
}

export function useLinkedInOrganizations(enabled) {
  const { data, error, isLoading } = useSWR(
    enabled ? '/linkedin/organizations' : null,
    fetcher,
    options
  );
  return { organizations: data?.organizations ?? [], error, loading: isLoading };
}

/** Where LinkedIn sends the admin back to — must be listed in the LinkedIn app. */
export const linkedInRedirectUri = (callbackPath) =>
  typeof window === 'undefined' ? '' : `${window.location.origin}${callbackPath}`;

export async function startLinkedInConnect(redirectUri) {
  const res = await iotaApi.post('/linkedin/connect', { redirectUri });
  return res.data.url;
}

export async function completeLinkedInConnect({ code, state }) {
  const res = await iotaApi.post('/linkedin/oauth/complete', { code, state });
  await refreshAll();
  return res.data;
}

export async function chooseLinkedInOrganization(organizationId) {
  const res = await iotaApi.put('/linkedin/organization', { organizationId });
  await refreshAll();
  return res.data;
}

export async function syncLinkedIn() {
  try {
    const res = await iotaApi.post('/linkedin/sync');
    return res.data;
  } finally {
    // A failed sync is recorded on the connection, so the status changes either way.
    await refreshAll();
  }
}

export async function disconnectLinkedIn() {
  const res = await iotaApi.delete('/linkedin/connection');
  await refreshAll();
  return res.data;
}
