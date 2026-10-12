'use client';

import { LeadListView } from 'src/sections/leads/view/lead-list-view';

import { PageGuard } from 'src/auth/guard';

export default function LeadsListWrapper() {
  return (
    <PageGuard>
      <LeadListView />
    </PageGuard>
  );
}
