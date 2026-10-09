'use client';

import { useParams } from 'next/navigation';

import { RequirementDetailsView } from 'src/sections/talent/view';

import { PageGuard } from 'src/auth/guard';

export default function RequirementDetailsWrapper() {
  const { id } = useParams();
  return (
    <PageGuard>
      <RequirementDetailsView id={id} />
    </PageGuard>
  );
}
