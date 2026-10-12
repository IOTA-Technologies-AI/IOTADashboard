import useSWR, { mutate } from 'swr';

import iotaApi from 'src/lib/iota-api';

/** Inbound leads (Sales → Leads); see leads/ in the API. */

const fetcher = ([url, params]) => iotaApi.get(url, { params }).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };

const refreshAll = () => mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/leads'));

export function useLeads(params) {
  const { data, error, isLoading } = useSWR(['/leads/inbox', params], fetcher, options);
  return {
    leads: data?.leads ?? [],
    total: data?.total ?? 0,
    counts: data?.counts ?? {},
    deadLetters: data?.deadLetters ?? 0,
    error,
    loading: isLoading,
  };
}

export function useLead(id) {
  const { data, error, isLoading } = useSWR(
    id ? [`/leads/inbox/${id}`, {}] : null,
    fetcher,
    options
  );
  return { lead: data?.lead ?? null, error, loading: isLoading };
}

export function useDeadLetters(enabled) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/leads/dead-letters', {}] : null,
    fetcher,
    options
  );
  return { deadLetters: data?.deadLetters ?? [], error, loading: isLoading };
}

export function useLeadWebflowStatus(enabled) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/leads/webflow/status', {}] : null,
    fetcher,
    options
  );
  return { status: data ?? null, error, loading: isLoading };
}

export async function updateLead(id, payload) {
  const res = await iotaApi.patch(`/leads/inbox/${id}`, payload);
  await refreshAll();
  return res.data.lead;
}

export async function convertLead(id, payload = {}) {
  const res = await iotaApi.post(`/leads/inbox/${id}/convert`, payload);
  await refreshAll();
  return res.data;
}

export async function resolveDeadLetter(id) {
  await iotaApi.post(`/leads/dead-letters/${id}/resolve`, {});
  await refreshAll();
}

export async function saveLeadRouting(payload) {
  const res = await iotaApi.put('/leads/webflow/routing', payload);
  await refreshAll();
  return res.data;
}

export async function registerLeadWebhook(publicApiUrl) {
  const res = await iotaApi.post('/leads/webflow/register', { publicApiUrl }, { timeout: 60000 });
  await refreshAll();
  return res.data;
}

/** The API's message for a failed call, or `fallback`. */
export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;
