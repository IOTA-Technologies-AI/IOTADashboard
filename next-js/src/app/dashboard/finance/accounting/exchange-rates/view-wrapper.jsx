'use client';

import { RatesView } from 'src/sections/fah/view/rates-view';

import { PageGuard } from 'src/auth/guard';

export default function RatesWrapper() {
  return (
    <PageGuard>
      <RatesView />
    </PageGuard>
  );
}
