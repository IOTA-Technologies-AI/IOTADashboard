'use client';

import { ReconciliationView } from 'src/sections/fah/view/reconciliation-view';

import { PageGuard } from 'src/auth/guard';

export default function ReconciliationWrapper() {
  return (
    <PageGuard>
      <ReconciliationView />
    </PageGuard>
  );
}
