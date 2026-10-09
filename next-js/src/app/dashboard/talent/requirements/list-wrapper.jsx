'use client';

import { RequirementListView } from 'src/sections/talent/view';

import { PageGuard } from 'src/auth/guard';

export default function RequirementsWrapper() {
  return (
    <PageGuard>
      <RequirementListView />
    </PageGuard>
  );
}
