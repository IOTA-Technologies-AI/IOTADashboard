import { CONFIG } from 'src/global-config';
import { getDeal } from 'src/actions/deals';

import { DealNewEditForm } from 'src/sections/deals/deal-new-edit-form';

// ----------------------------------------------------------------------

export const metadata = { title: `Edit deal | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }) {
  const { id } = params;
  const deal = await getDeal(id);

  return <DealNewEditForm currentDeal={deal} />;
}
