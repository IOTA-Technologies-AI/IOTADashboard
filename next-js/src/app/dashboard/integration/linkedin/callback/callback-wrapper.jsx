'use client';

import { LinkedInCallbackView } from 'src/sections/linkedin/view/linkedin-callback-view';

import { PageGuard } from 'src/auth/guard';

export default function LinkedInCallbackWrapper() {
  return (
    <PageGuard>
      <LinkedInCallbackView />
    </PageGuard>
  );
}
