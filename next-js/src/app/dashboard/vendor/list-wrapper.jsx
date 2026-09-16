'use client';

import { VendorListView } from 'src/sections/vendor/view';

import { PageGuard } from 'src/auth/guard';

export default function VendorListWrapper() {
  return (
    <PageGuard>
      <VendorListView />
    </PageGuard>
  );
}
