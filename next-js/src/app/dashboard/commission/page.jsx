import { getCommissions } from 'src/actions/commission';

import { CommissionListView } from 'src/sections/commission/view/commission-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Commission` };

export default async function Page() {
  const commissions = await getCommissions();

  return <CommissionListView commissions={commissions} />;
}
