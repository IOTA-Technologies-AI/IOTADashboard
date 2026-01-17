import { CONFIG } from 'src/global-config';

import { OrderListView } from 'src/sections/order/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Order list` };

export default function Page() {
  return <OrderListView />;
}
