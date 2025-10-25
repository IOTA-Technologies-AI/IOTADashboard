import { CONFIG } from 'src/global-config';

import { VendorCreateView } from 'src/sections/vendor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new vendor | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <VendorCreateView />;
}
