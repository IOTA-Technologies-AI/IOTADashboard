import { CONFIG } from 'src/global-config';

import { AccountChangePasswordView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Account change password settings``,
};

export default function Page() {
  return <AccountChangePasswordView />;
}
