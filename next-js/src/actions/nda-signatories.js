import useSWR from 'swr';

import iotaApi from 'src/lib/iota-api';

/**
 * Who may sign NDAs for IOTA (and approve NDA exceptions): the Microsoft users
 * on appConfig ndas › iotaSignatories (ndas/ndaSignatories.ts in the API,
 * which also refuses anyone else).
 *
 * `users` has the shape of useMicrosoftUsers() — { name, email, role } — so it
 * drops into the existing signatory pickers.
 */
export const NDA_SIGNATORY_CONFIG = 'appConfig ndas › iotaSignatories';

const fetcher = (url) => iotaApi.get(url).then((res) => res.data);

export function useNdaSignatories() {
  const { data, error, isLoading } = useSWR('/ndas/signatories', fetcher, {
    revalidateOnFocus: false,
  });
  return {
    users: (data?.signatories ?? []).map((s) => ({ name: s.name, email: s.email, role: s.title })),
    unmatched: data?.unmatched ?? [],
    error,
    loading: isLoading,
  };
}
