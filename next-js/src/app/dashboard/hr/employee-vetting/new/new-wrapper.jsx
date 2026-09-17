'use client';

import { VettingNewView } from 'src/sections/employee-vetting/view';

import { PageGuard } from 'src/auth/guard';

export default function VettingNewWrapper() {
  return (
    <PageGuard>
      <VettingNewView />
    </PageGuard>
  );
}
