'use client';

import { CloseView } from 'src/sections/fah/view/close-view';

import { PageGuard } from 'src/auth/guard';

export default function CloseWrapper() {
  return (
    <PageGuard>
      <CloseView />
    </PageGuard>
  );
}
