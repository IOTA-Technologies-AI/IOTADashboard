'use client';

import { PageGuard } from 'src/auth/guard';
import { OverviewAnalyticsView } from 'src/sections/overview/analytics/view';

export default function AnalyticsListWrapper() {
  return (
    <PageGuard>
      <OverviewAnalyticsView />
    </PageGuard>
  );
}
