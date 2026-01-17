import { CONFIG } from 'src/global-config';

import { AccountBillingView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Account billing settings`,
};

export default function Page() {
  return <AccountBillingView />;
}
