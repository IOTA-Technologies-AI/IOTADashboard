import { CONFIG } from 'src/global-config';

import { VATAPView } from 'src/sections/vat/view';

// ----------------------------------------------------------------------

export const metadata = { title: `VAT – Accounts Payable | ${CONFIG.appName}` };

export default function Page() {
  return <VATAPView />;
}
