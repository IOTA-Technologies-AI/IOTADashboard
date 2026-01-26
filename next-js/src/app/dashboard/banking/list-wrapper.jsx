'use client';

import { PageGuard } from 'src/auth/guard';
import { OverviewBankingView } from 'src/sections/overview/banking/view';

export default function BankingListWrapper() {
  return (
    <PageGuard>
      <OverviewBankingView />
    </PageGuard>
  );
}
