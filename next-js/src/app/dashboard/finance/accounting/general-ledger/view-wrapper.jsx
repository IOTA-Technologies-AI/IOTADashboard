'use client';

import { LedgerView } from 'src/sections/fah/view/ledger-view';

import { PageGuard } from 'src/auth/guard';

export default function LedgerWrapper() {
  return (
    <PageGuard>
      <LedgerView />
    </PageGuard>
  );
}
