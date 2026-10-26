'use client';

import { AuditView } from 'src/sections/fah/view/audit-view';

import { PageGuard } from 'src/auth/guard';

export default function AuditWrapper() {
  return (
    <PageGuard>
      <AuditView />
    </PageGuard>
  );
}
