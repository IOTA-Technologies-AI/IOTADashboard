import useSWR, { mutate } from 'swr';

import iotaApi from 'src/lib/iota-api';

/** Offer settings from appConfig (offers/offerSettings.ts in the API). */

const fetcher = (url) => iotaApi.get(url).then((res) => res.data);
const options = { revalidateOnFocus: false };

export const apiMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/** Who may sign offer letters for IOTA: Microsoft users on the appConfig list. */
export function useOfferSignatories() {
  const { data, error, isLoading } = useSWR('/offers/signatories', fetcher, options);
  return {
    signatories: data?.signatories ?? [],
    unmatched: data?.unmatched ?? [],
    error,
    loading: isLoading,
  };
}

/** Clauses saved for reuse on any offer. */
export function useSavedClauses() {
  const { data, error, isLoading } = useSWR('/offers/clause-library', fetcher, options);
  return { clauses: data?.clauses ?? [], error, loading: isLoading };
}

export async function saveClause(clause) {
  const res = await iotaApi.post('/offers/clause-library', clause);
  await mutate('/offers/clause-library', { clauses: res.data.clauses }, false);
  return res.data.clause;
}

export async function deleteSavedClause(id) {
  const res = await iotaApi.delete(`/offers/clause-library/${encodeURIComponent(id)}`);
  await mutate('/offers/clause-library', { clauses: res.data.clauses }, false);
}
