'use client';

import { BillingCollectionsView } from 'src/sections/employee-billing/view';

import { PageGuard } from 'src/auth/guard';

export default function BillingCollectionsWrapper() {
  return (
    <PageGuard>
      <BillingCollectionsView />
    </PageGuard>
  );
}
