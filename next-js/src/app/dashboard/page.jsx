import { CONFIG } from 'src/global-config';

import { OverviewAppView } from 'src/sections/overview/app/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard` };

export default function Page() {
  return <OverviewAppView />;
}
