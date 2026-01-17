import { CONFIG } from 'src/global-config';

import { AccountGeneralView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Account general settings``,
};

export default function Page() {
  return <AccountGeneralView />;
}
