import { CONFIG } from 'src/global-config';

import BankingListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Banking` };

export default function Page() {
  return <BankingListWrapper />;
}
