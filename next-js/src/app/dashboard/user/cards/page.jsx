import { CONFIG } from 'src/global-config';

import { UserCardsView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

export const metadata = { title: `User cards` };

export default function Page() {
  return <UserCardsView />;
}
