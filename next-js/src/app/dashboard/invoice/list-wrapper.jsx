'use client';

import { InvoiceListView } from 'src/sections/invoice/view';

import { PageGuard } from 'src/auth/guard';

export default function InvoiceListWrapper() {
  return (
    <PageGuard>
      <InvoiceListView />
    </PageGuard>
  );
}
