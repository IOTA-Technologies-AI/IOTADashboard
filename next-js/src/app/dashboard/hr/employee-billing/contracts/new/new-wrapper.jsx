'use client';

import { ContractFormView } from 'src/sections/employee-billing/view';

import { PageGuard } from 'src/auth/guard';

export default function ContractNewWrapper() {
  return (
    <PageGuard>
      <ContractFormView />
    </PageGuard>
  );
}
