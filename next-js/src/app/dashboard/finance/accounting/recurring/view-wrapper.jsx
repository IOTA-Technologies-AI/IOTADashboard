'use client';

import { RecurringView } from 'src/sections/fah/view/recurring-view';

import { PageGuard } from 'src/auth/guard';

export default function RecurringWrapper() {
  return (
    <PageGuard>
      <RecurringView />
    </PageGuard>
  );
}
