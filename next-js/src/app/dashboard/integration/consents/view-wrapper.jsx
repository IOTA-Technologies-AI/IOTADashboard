'use client';

import { ConsentsView } from 'src/sections/consents/view/consents-view';

import { PageGuard } from 'src/auth/guard';

export default function ConsentsWrapper() {
  return (
    <PageGuard>
      <ConsentsView />
    </PageGuard>
  );
}
