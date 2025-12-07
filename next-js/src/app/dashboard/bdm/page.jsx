import { getBDMs } from 'src/actions/bdm';
import { getDeals } from 'src/actions/deals';

import { BDMListView } from 'src/sections/bdm/view/bdm-list-view';

export default async function Page() {
  const [bdms = [], deals = []] = await Promise.all([getBDMs(), getDeals()]);

  const enriched = bdms.map((bdm) => {
    const bdmDeals = deals.filter((deal) => String(deal.bdmId) === String(bdm.id));
    const totalCommission = bdmDeals.reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);
    const paidCommission = bdmDeals
      .filter((deal) => deal.bdmCommissionPaid)
      .reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);
    const pendingCommission = totalCommission - paidCommission;
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
