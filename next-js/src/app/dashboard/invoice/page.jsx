import { CONFIG } from 'src/global-config';

import { InvoiceListView } from 'src/sections/invoice/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Invoice list` };

export default function Page() {
  return <InvoiceListView />;
}
