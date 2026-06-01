import { CONFIG } from 'src/global-config';

import { CommissionCreateView } from 'src/sections/commission/view/commission-create-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new commission` };

export default async function Page() {
  return <CommissionCreateView />;
}
