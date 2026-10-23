'use client';

import { JournalEditView } from 'src/sections/fah/view/journal-edit-view';

import { PageGuard } from 'src/auth/guard';

export default function JournalNewWrapper() {
  return (
    <PageGuard>
      <JournalEditView />
    </PageGuard>
  );
}
