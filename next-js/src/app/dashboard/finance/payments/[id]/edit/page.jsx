import { CONFIG } from 'src/global-config';

import { PaymentEditView } from 'src/sections/payment/view/payment-edit-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Edit Payment` };

export default function Page({ params }) {
  const { id } = params;

  return <PaymentEditView id={id} />;
}
