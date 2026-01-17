import { CONFIG } from 'src/global-config';

import { IntegrationCreateView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Add Integration | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <IntegrationCreateView />;
}
