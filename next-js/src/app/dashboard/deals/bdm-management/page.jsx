import { getBDMs } from 'src/actions/bdm';
import { CONFIG } from 'src/global-config';
import { getDeals } from 'src/actions/deals';

import { BDMManagementView } from 'src/sections/deals/view/bdm-management-view';

// ----------------------------------------------------------------------

export const metadata = { title: `BDM Management | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  const [deals, bdms] = await Promise.all([getDeals(), getBDMs()]);

  return <BDMManagementView deals={deals} bdms={bdms} />;
}
