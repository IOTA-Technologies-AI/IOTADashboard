'use client';

import { JournalListView } from 'src/sections/fah/view/journal-list-view';

import { PageGuard } from 'src/auth/guard';

export default function JournalListWrapper() {
  return (
    <PageGuard>
      <JournalListView />
    </PageGuard>
  );
}
