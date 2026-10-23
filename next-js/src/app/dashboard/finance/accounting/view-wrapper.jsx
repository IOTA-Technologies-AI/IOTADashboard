'use client';

import { FahOverviewView } from 'src/sections/fah/view/fah-overview-view';

import { PageGuard } from 'src/auth/guard';

export default function OverviewWrapper() {
  return (
    <PageGuard>
      <FahOverviewView />
    </PageGuard>
  );
}
