'use client';

import { WalletListView } from 'src/sections/expense/wallet';

import { PageGuard } from 'src/auth/guard';

export default function WalletListWrapper() {
  return (
    <PageGuard>
      <WalletListView />
    </PageGuard>
  );
}
