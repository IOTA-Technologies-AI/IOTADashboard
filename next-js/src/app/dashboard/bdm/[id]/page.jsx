import { notFound } from 'next/navigation';

import { getBDM } from 'src/actions/bdm';
import { getCommissions } from 'src/actions/commission';

import { BDMProfileView } from 'src/sections/bdm/view/bdm-profile-view';

export default async function Page({ params }) {
  const { id } = params;

  const [bdm, deals] = await Promise.all([getBDM(id), getCommissions()]);

  if (!bdm) {
    notFound();
  }

  const bdmDeals = (deals || []).filter((deal) => String(deal.bdmId) === String(id));

  return <BDMProfileView bdm={bdm} deals={bdmDeals} />;
}
