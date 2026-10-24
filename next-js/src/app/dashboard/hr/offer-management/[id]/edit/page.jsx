'use client';

import { use } from 'react';

import { OfferFormView } from 'src/sections/offer/view/offer-form-view';

// ----------------------------------------------------------------------

export default function OfferManagementEditPage({ params }) {
  const { id } = use(params);
  return <OfferFormView editId={id} />;
}
