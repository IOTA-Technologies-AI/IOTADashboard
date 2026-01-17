import { CONFIG } from 'src/global-config';

import { IntegrationListView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Integrations | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <IntegrationListView />;
}
