import { CONFIG } from 'src/global-config';

import { ProductListView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Product list` };

export default function Page() {
  return <ProductListView />;
}
