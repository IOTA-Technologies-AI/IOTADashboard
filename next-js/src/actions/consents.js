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
      Array.isArray(key) && (key[0] === '/consents/records' || String(key[0]).startsWith('/leads'))
  );
  return res.data;
}
