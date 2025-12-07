import { notFound } from 'next/navigation';

import { CONFIG } from 'src/global-config';
import { getDeal } from 'src/actions/deals';

import { DealDetailsView } from 'src/sections/deals/view/deal-details-view';

export const metadata = {
  title: `Deal Details | Dashboard - ${CONFIG.appName}`,
};

export default async function Page({ params }) {
  const { id } = params;

  try {
    const deal = await getDeal(id);

    if (!deal) {
      notFound();
    }

    return <DealDetailsView deal={deal} />;
  } catch (error) {
    console.error('Failed to load deal details page:', error);
    notFound();
  }
}
