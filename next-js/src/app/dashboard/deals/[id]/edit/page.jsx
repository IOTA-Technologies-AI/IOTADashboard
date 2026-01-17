import { notFound } from 'next/navigation';

import { CONFIG } from 'src/global-config';
import { getDeal } from 'src/actions/deals';

import { DealEditView } from 'src/sections/deals/view/deal-edit-view';

export const metadata = { title: `Edit deal` };

export default async function Page({ params }) {
  const { id } = params;
  const deal = await getDeal(id);

  if (!deal) {
    notFound();
  }

  return <DealEditView currentDeal={deal} />;
}
