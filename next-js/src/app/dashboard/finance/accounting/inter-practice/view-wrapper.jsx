'use client';

import { InterPracticeView } from 'src/sections/fah/view/inter-practice-view';

import { PageGuard } from 'src/auth/guard';

export default function InterPracticeWrapper() {
  return (
    <PageGuard>
      <InterPracticeView />
    </PageGuard>
  );
}
