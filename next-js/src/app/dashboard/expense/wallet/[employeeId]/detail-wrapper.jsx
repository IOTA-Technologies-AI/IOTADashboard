'use client';

import { WalletDetailView } from 'src/sections/expense/wallet';

import { PageGuard } from 'src/auth/guard';

export default function WalletDetailWrapper({ employeeId, wallet, transactions }) {
  return (
    <PageGuard>
      <WalletDetailView employeeId={employeeId} wallet={wallet} transactions={transactions} />
    </PageGuard>
  );
}
