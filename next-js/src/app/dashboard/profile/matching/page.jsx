import { Suspense } from 'react';

import { MatchingView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Profile | AI Matching' };

export default function Page() {
  return (
    <Suspense>
      <MatchingView />
    </Suspense>
  );
}
