'use client';

import { ResumeLibraryView } from 'src/sections/talent/view';

import { PageGuard } from 'src/auth/guard';

export default function ResumesWrapper() {
  return (
    <PageGuard>
      <ResumeLibraryView />
    </PageGuard>
  );
}
