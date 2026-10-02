'use client';

import { CareersIntakeView } from 'src/sections/job/view';

import { PageGuard } from 'src/auth/guard';

export default function CareersIntakeWrapper() {
  return (
    <PageGuard>
      <CareersIntakeView />
    </PageGuard>
  );
}
