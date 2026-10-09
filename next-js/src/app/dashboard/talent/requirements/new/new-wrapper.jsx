'use client';

import { RequirementNewView } from 'src/sections/talent/view';

import { PageGuard } from 'src/auth/guard';

export default function NewRequirementWrapper() {
  return (
    <PageGuard>
      <RequirementNewView />
    </PageGuard>
  );
}
