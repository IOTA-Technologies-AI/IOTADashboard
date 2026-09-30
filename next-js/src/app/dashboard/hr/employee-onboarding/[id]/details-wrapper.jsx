'use client';

import { useParams } from 'next/navigation';

import { OnboardingDetailsView } from 'src/sections/employee-onboarding/view';

import { PageGuard } from 'src/auth/guard';

export default function OnboardingDetailsWrapper() {
  const { id } = useParams();
  return (
    <PageGuard>
      <OnboardingDetailsView id={id} />
    </PageGuard>
  );
}
