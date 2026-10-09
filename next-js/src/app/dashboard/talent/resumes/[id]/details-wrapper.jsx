'use client';

import { useParams } from 'next/navigation';

import { ResumeDetailsView } from 'src/sections/talent/view';

import { PageGuard } from 'src/auth/guard';

export default function ResumeDetailsWrapper() {
  const { id } = useParams();
  return (
    <PageGuard>
      <ResumeDetailsView id={id} />
    </PageGuard>
  );
}
