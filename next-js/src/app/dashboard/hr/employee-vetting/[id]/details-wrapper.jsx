'use client';

import { VettingDetailsView } from 'src/sections/employee-vetting/view';

import { PageGuard } from 'src/auth/guard';

export default function VettingDetailsWrapper({ id }) {
  return (
    <PageGuard>
      <VettingDetailsView id={id} />
    </PageGuard>
  );
}
