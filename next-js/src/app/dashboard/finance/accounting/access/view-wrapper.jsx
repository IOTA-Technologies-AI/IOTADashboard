'use client';

import { AccessView } from 'src/sections/fah/view/access-view';

import { PageGuard } from 'src/auth/guard';

export default function AccessWrapper() {
  return (
    <PageGuard>
      <AccessView />
    </PageGuard>
  );
}
