'use client';

import { LinkedInView } from 'src/sections/linkedin/view/linkedin-view';

import { PageGuard } from 'src/auth/guard';

export default function LinkedInWrapper() {
  return (
    <PageGuard>
      <LinkedInView />
    </PageGuard>
  );
}
