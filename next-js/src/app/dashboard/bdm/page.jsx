'use client';

import { useState, useEffect } from 'react';

import { getBDMs } from 'src/actions/bdm';
import { getDeals } from 'src/actions/deals';

import { BDMListView } from 'src/sections/bdm/view/bdm-list-view';

export default function Page() {
  const [enriched, setEnriched] = useState([]);

  useEffect(() => {
    Promise.all([getBDMs(), getDeals()]).then(([bdms = [], deals = []]) => {
      const data = bdms.map((bdm) => {
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
      setEnriched(data);
    });
  }, []);

  return <BDMListView bdms={enriched} />;
}
