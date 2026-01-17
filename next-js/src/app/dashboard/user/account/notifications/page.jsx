import { CONFIG } from 'src/global-config';

import { AccountNotificationsView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Account notifications settings``,
};

export default function Page() {
  return <AccountNotificationsView />;
}
