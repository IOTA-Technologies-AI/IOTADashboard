import { CONFIG } from 'src/global-config';

import { AccountSocialsView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: `Account socials settings``,
};

export default function Page() {
  return <AccountSocialsView />;
}
