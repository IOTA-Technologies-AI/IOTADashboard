import { CONFIG } from 'src/global-config';

import { VATARView } from 'src/sections/vat/view';

// ----------------------------------------------------------------------

export const metadata = { title: `VAT – Accounts Receivable | ${CONFIG.appName}` };

export default function Page() {
  return <VATARView />;
}
