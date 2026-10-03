'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Alert from '@mui/material/Alert';

import { getBDM } from 'src/actions/bdm';
import { getCommissions } from 'src/actions/commission';

import { LoadingScreen } from 'src/components/loading-screen';

import { BDMProfileView } from 'src/sections/bdm/view/bdm-profile-view';

import { PageGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

// Fetched client-side: the API needs the signed-in user's bearer token, which only
// exists in the browser session — a server component has none and gets 401.
async function loadBdmProfile(id) {
  const [bdm, deals] = await Promise.all([getBDM(id), getCommissions()]);
  return { bdm, deals: deals || [] };
}

export default function BDMProfileWrapper({ id }) {
  const { data, isLoading, error } = useSWR(
    id ? ['bdm-profile', id] : null,
    () => loadBdmProfile(id),
    { revalidateOnFocus: false }
  );

  const bdmDeals = useMemo(
    () => (data?.deals || []).filter((deal) => String(deal.bdmId) === String(id)),
    [data, id]
  );

  let content = null;
  if (isLoading) {
    content = <LoadingScreen />;
  } else if (error) {
    content = (
      <Alert severity="error" sx={{ m: 3 }}>
        {error?.message || 'Could not load this BDM.'}
      </Alert>
    );
  } else if (!data?.bdm) {
    content = (
      <Alert severity="warning" sx={{ m: 3 }}>
        BDM not found.
      </Alert>
    );
  } else {
    content = <BDMProfileView bdm={data.bdm} deals={bdmDeals} />;
  }

  return <PageGuard>{content}</PageGuard>;
}
