import { CONFIG } from 'src/global-config';

import { CheckoutView } from 'src/sections/checkout/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Checkout` };

export default function Page() {
  return <CheckoutView />;
}
