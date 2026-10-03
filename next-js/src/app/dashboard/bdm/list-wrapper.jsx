'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Alert from '@mui/material/Alert';

import { getBDMs } from 'src/actions/bdm';
import { getCommissions } from 'src/actions/commission';

import { LoadingScreen } from 'src/components/loading-screen';

import { BDMListView } from 'src/sections/bdm/view/bdm-list-view';

import { PageGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

// Fetched client-side: the API needs the signed-in user's bearer token, which only
// exists in the browser session — a server component has none and gets 401.
async function loadBdmList() {
  const [bdms = [], deals = []] = await Promise.all([getBDMs(), getCommissions()]);
  return { bdms, deals };
}

function enrich(bdms, deals) {
  return bdms.map((bdm) => {
    const bdmDeals = deals.filter((deal) => String(deal.bdmId) === String(bdm.id));
    const totalCommission = bdmDeals.reduce(
      (sum, deal) => sum + (deal.bdmCommissionAmount || 0),
      0
    );

    const paidCommission = bdmDeals.reduce((sum, deal) => {
      const total = deal.bdmCommissionAmount || 0;
      if (
        typeof deal.bdmCommissionPaidAmount === 'number' &&
        !Number.isNaN(deal.bdmCommissionPaidAmount)
      ) {
        return sum + Math.min(Math.max(deal.bdmCommissionPaidAmount, 0), total);
      }
      if (deal.bdmCommissionPaid) {
        return sum + total;
      }
      return sum;
    }, 0);

    const pendingCommission = Math.max(totalCommission - paidCommission, 0);
    const dealsCount = bdmDeals.length;
    const activeDeals = bdmDeals.filter((deal) => deal.status === 'active').length;

    return {
      ...bdm,
      dealsCount,
      activeDeals,
      totalCommission,
      paidCommission,
      pendingCommission,
    };
  });
}

export default function BDMListWrapper() {
  const { data, isLoading, error } = useSWR('bdm-list', loadBdmList, {
    revalidateOnFocus: false,
  });

  const enriched = useMemo(() => enrich(data?.bdms || [], data?.deals || []), [data]);

  return (
    <PageGuard>
      {isLoading && <LoadingScreen />}
      {!isLoading && error && (
        <Alert severity="error" sx={{ m: 3 }}>
          {error?.message || 'Could not load BDMs.'}
        </Alert>
      )}
      {!isLoading && !error && <BDMListView bdms={enriched} />}
    </PageGuard>
  );
}
