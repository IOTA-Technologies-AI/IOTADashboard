'use client';

import { AccountListView } from 'src/sections/fah/view/account-list-view';

import { PageGuard } from 'src/auth/guard';

export default function AccountListWrapper() {
  return (
    <PageGuard>
      <AccountListView />
    </PageGuard>
  );
}
