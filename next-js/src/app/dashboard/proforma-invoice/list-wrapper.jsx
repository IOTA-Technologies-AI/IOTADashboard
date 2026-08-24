'use client';

import { ProformaListView } from 'src/sections/proforma-invoice/view';

import { PageGuard } from 'src/auth/guard';

export default function ProformaListWrapper() {
  return (
    <PageGuard>
      <ProformaListView />
    </PageGuard>
  );
}
