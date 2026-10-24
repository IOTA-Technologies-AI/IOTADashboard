'use client';

import { ReimbursementsView } from 'src/sections/fah/view/reimbursements-view';

import { PageGuard } from 'src/auth/guard';

export default function ReimbursementsWrapper() {
  return (
    <PageGuard>
      <ReimbursementsView />
    </PageGuard>
  );
}
