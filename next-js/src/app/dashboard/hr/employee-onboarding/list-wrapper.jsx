'use client';

import { OnboardingListView } from 'src/sections/employee-onboarding/view';

import { PageGuard } from 'src/auth/guard';

export default function OnboardingListWrapper() {
  return (
    <PageGuard>
      <OnboardingListView />
    </PageGuard>
  );
}
