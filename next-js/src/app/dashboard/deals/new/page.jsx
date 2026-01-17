import { CONFIG } from 'src/global-config';

import { DealCreateView } from 'src/sections/deals/view/deal-create-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new deal` };

export default async function Page() {
  return <DealCreateView />;
}
