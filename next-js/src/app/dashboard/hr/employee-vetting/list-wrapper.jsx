'use client';

import { VettingListView } from 'src/sections/employee-vetting/view';

import { PageGuard } from 'src/auth/guard';

export default function VettingListWrapper() {
  return (
    <PageGuard>
      <VettingListView />
    </PageGuard>
  );
}
