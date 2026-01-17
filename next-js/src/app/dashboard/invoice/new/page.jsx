import { CONFIG } from 'src/global-config';

import { InvoiceCreateView } from 'src/sections/invoice/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new invoice` };

export default function Page() {
  return <InvoiceCreateView />;
}
