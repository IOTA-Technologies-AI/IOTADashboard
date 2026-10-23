'use client';

import { DimensionsView } from 'src/sections/fah/view/dimensions-view';

import { PageGuard } from 'src/auth/guard';

export default function DimensionsWrapper() {
  return (
    <PageGuard>
      <DimensionsView />
    </PageGuard>
  );
}
