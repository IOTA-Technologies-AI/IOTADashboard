'use client';

import { PageGuard } from 'src/auth/guard';
import { VendorListView } from 'src/sections/vendor/view';

export default function VendorListWrapper({ vendors }) {
  return (
    <PageGuard>
      <VendorListView vendors={vendors} />
    </PageGuard>
  );
}
