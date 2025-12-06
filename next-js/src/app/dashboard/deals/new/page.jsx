import { CONFIG } from 'src/global-config';

import { DealNewEditForm } from 'src/sections/deals/deal-new-edit-form';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new deal | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  return <DealNewEditForm />;
}
