import useSWR, { mutate } from 'swr';

import iotaApi from 'src/lib/iota-api';

/** Integrations → Consents: website, lead and applicant consents; see consents/ in the API. */

const fetcher = ([url, params]) => iotaApi.get(url, { params }).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };

export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

export function useWebsiteConsents(month) {
  const { data, error, isLoading } = useSWR(['/consents/website', { month }], fetcher, options);
  return { data: data ?? null, error, loading: isLoading };
}

/** kind: 'leads' | 'applicants' | 'candidates' | 'newHires' */
export function useConsentRecords(params) {
  const { data, error, isLoading } = useSWR(['/consents/records', params], fetcher, options);
  return { records: data?.records ?? [], total: data?.total ?? 0, error, loading: isLoading };
}

export async function withdrawConsent(kind, id, note) {
  const res = await iotaApi.post(`/consents/${kind}/${id}/withdraw`, { note });
  await mutate(
    (key) =>
      (Array.isArray(key) &&
        (String(key[0]).startsWith('/consents') ||
          String(key[0]).startsWith('/leads') ||
          key[0] === 'job-applications')) ||
      (typeof key === 'string' && key.startsWith('/consents'))
  );
  return res.data;
}

const refreshConsents = () =>
  mutate(
    (key) =>
      (Array.isArray(key) && String(key[0]).startsWith('/consents')) ||
      (typeof key === 'string' && (key.startsWith('/consents') || key.startsWith('/privacy')))
  );

/** One person's consent, for their own page. kind as in useConsentRecords. */
export function useConsentRecord(kind, id) {
  const { data, error, isLoading } = useSWR(
    kind && id ? `/consents/person/${kind}/${id}` : null,
    (url) => iotaApi.get(url).then((res) => res.data),
    options
  );
  return { record: data?.record ?? null, error, loading: isLoading };
}

/** Every consent's wording, current and past versions. */
export function useConsentTexts(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? '/consents/texts' : null,
    (url) => iotaApi.get(url).then((res) => res.data),
    { ...options, dedupingInterval: 10 * 60 * 1000 }
  );
  return { wording: data ?? null, error, loading: isLoading };
}

/** The wording of one version, from the catalogue. */
export const textOfVersion = (wording, version) => {
  for (const t of wording?.texts ?? []) {
    const v = t.versions.find((x) => x.version === version);
    if (v) return { ...v, title: t.title };
  }
  return null;
};

export function useRetention() {
  const { data, error, isLoading } = useSWR(
    '/privacy/retention',
    (url) => iotaApi.get(url).then((res) => res.data),
    options
  );
  return { retention: data ?? null, error, loading: isLoading };
}

export function useRetentionDue(rule) {
  const { data, error, isLoading } = useSWR(
    rule ? ['/privacy/retention/due', { rule }] : null,
    fetcher,
    options
  );
  return { items: data?.items ?? [], error, loading: isLoading };
}

export async function saveRetention(config) {
  const res = await iotaApi.put('/privacy/retention', config);
  await mutate('/privacy/retention', res.data, false);
  await mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/privacy/retention/'));
  return res.data;
}

export async function runRetention() {
  const res = await iotaApi.post('/privacy/retention/run');
  await refreshConsents();
  return res.data;
}

/** Every record matching the filters (up to 10,000), for export. */
export async function fetchAllConsentRecords(filters) {
  const all = [];
  for (let page = 0; page < 100; page += 1) {
    const res = await iotaApi.get('/consents/records', {
      params: { ...filters, page, limit: 100 },
    });
    const { records = [], total = 0 } = res.data ?? {};
    all.push(...records);
    if (!records.length || all.length >= total) break;
  }
  return all;
}

/** The retention queue: 'review' | 'pending' | 'kept'. */
export function useRetentionQueue(status, enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled && status ? ['/privacy/retention/queue', { status }] : null,
    fetcher,
    options
  );
  return { items: data?.items ?? [], error, loading: isLoading };
}

/** keep | delete | release one queued record (admins). */
export async function decideRetention(id, decision, note) {
  const res = await iotaApi.post(`/privacy/retention/queue/${id}/decision`, { decision, note });
  await mutate(
    (key) =>
      (typeof key === 'string' && key.startsWith('/privacy')) ||
      (Array.isArray(key) && String(key[0]).startsWith('/privacy'))
  );
  return res.data;
}
