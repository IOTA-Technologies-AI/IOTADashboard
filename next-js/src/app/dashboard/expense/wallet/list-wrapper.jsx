'use client';

import { WalletListView } from 'src/sections/expense/wallet';

import { PageGuard } from 'src/auth/guard';

export default function WalletListWrapper({ wallets }) {
  return (
    <PageGuard>
      <WalletListView wallets={wallets} />
    </PageGuard>
  );
}
