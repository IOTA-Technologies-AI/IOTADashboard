import useSWR from 'swr';

import iotaApi from 'src/lib/iota-api';

/**
 * The home dashboard (dashboard/dashboard.ts in the API): finance, sales and
 * HR figures for the modules the user can access, and their pending actions.
 * Money is in SAR.
 */
const fetcher = (url) => iotaApi.get(url).then((res) => res.data);

export function useDashboardOverview() {
  const { data, error, isLoading, mutate } = useSWR('/dashboard/overview', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return { overview: data, error, loading: isLoading, refresh: mutate };
}

/** What is waiting for the signed-in user; feeds the notifications bell. */
export function useMyActions() {
  const { data, error, isLoading, mutate } = useSWR('/dashboard/my-actions', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  return { actions: data?.actions ?? [], error, loading: isLoading, refresh: mutate };
}
