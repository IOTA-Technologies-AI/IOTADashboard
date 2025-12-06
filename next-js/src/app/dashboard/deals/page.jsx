import { CONFIG } from 'src/global-config';
import { getDeals } from 'src/actions/deals';

import { DealListView } from 'src/sections/deals/view/deal-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Deals | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  const deals = await getDeals();

  return <DealListView deals={deals} />;
}
