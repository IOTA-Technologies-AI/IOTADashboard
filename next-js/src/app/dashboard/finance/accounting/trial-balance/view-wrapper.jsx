'use client';

import { TrialBalanceView } from 'src/sections/fah/view/trial-balance-view';

import { PageGuard } from 'src/auth/guard';

export default function TrialBalanceWrapper() {
  return (
    <PageGuard>
      <TrialBalanceView />
    </PageGuard>
  );
}
