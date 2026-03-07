'use client';

import { PageGuard } from 'src/auth/guard';
import OverviewAccountsView from 'src/sections/overview/accounts/view/overview-accounts-view';

export default function AccountsListWrapper() {
  return (
    <PageGuard>
      <OverviewAccountsView />
    </PageGuard>
  );
}
