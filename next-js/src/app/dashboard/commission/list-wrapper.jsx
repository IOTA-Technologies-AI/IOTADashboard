'use client';

import useSWR from 'swr';

import { getCommissions } from 'src/actions/commission';

import { LoadingScreen } from 'src/components/loading-screen';

import { CommissionListView } from 'src/sections/commission/view/commission-list-view';

import { PageGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

// Fetched client-side: the API needs the signed-in user's bearer token, which only
// exists in the browser session — a server component has none and gets 401.
export default function CommissionListWrapper() {
  const { data, isLoading } = useSWR('commission-list', getCommissions, {
    revalidateOnFocus: false,
  });

  return (
    <PageGuard>
      {isLoading ? <LoadingScreen /> : <CommissionListView commissions={data || []} />}
    </PageGuard>
  );
}
