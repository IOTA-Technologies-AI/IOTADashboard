'use client';

import { JournalDetailsView } from 'src/sections/fah/view/journal-details-view';

import { PageGuard } from 'src/auth/guard';

export default function JournalDetailsWrapper({ id }) {
  return (
    <PageGuard>
      <JournalDetailsView id={id} />
    </PageGuard>
  );
}
