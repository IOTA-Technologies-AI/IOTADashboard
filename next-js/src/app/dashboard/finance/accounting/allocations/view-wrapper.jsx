'use client';

import { AllocationsView } from 'src/sections/fah/view/allocations-view';

import { PageGuard } from 'src/auth/guard';

export default function AllocationsWrapper() {
  return (
    <PageGuard>
      <AllocationsView />
    </PageGuard>
  );
}
