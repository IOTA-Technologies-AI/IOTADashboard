'use client';

import { MonthEndView } from 'src/sections/fah/view/month-end-view';

import { PageGuard } from 'src/auth/guard';

export default function MonthEndWrapper() {
  return (
    <PageGuard>
      <MonthEndView />
    </PageGuard>
  );
}
