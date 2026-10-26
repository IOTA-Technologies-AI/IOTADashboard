'use client';

import { StatementsView } from 'src/sections/fah/view/statements-view';

import { PageGuard } from 'src/auth/guard';

export default function StatementsWrapper() {
  return (
    <PageGuard>
      <StatementsView />
    </PageGuard>
  );
}
