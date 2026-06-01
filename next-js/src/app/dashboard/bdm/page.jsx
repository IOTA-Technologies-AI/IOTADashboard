import { getBDMs } from 'src/actions/bdm';
import { getCommissions } from 'src/actions/commission';

import { BDMListView } from 'src/sections/bdm/view/bdm-list-view';

// Mark dynamic because data is fetched with no-store from external APIs.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const [bdms = [], deals = []] = await Promise.all([getBDMs(), getCommissions()]);

  const enriched = bdms.map((bdm) => {
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

  return <BDMListView bdms={enriched} />;
}
