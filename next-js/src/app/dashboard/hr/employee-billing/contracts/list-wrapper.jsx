'use client';

import { ContractListView } from 'src/sections/employee-billing/view';

import { PageGuard } from 'src/auth/guard';

export default function ContractListWrapper() {
  return (
    <PageGuard>
      <ContractListView />
    </PageGuard>
  );
}
