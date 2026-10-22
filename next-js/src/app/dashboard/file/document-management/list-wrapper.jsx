'use client';

import { DocumentListView } from 'src/sections/document-management/view/document-list-view';

import { PageGuard } from 'src/auth/guard';

export default function DocumentListWrapper() {
  return (
    <PageGuard>
      <DocumentListView />
    </PageGuard>
  );
}
