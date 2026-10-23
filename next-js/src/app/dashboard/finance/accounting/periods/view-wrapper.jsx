'use client';

import { PeriodListView } from 'src/sections/fah/view/period-list-view';

import { PageGuard } from 'src/auth/guard';

export default function PeriodListWrapper() {
  return (
    <PageGuard>
      <PeriodListView />
    </PageGuard>
  );
}
