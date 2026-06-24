import { CONFIG } from 'src/global-config';

import { VATListView } from 'src/sections/vat/view';

// ----------------------------------------------------------------------

export const metadata = { title: `VAT Management | ${CONFIG.appName}` };

export default function Page() {
  return <VATListView />;
}
