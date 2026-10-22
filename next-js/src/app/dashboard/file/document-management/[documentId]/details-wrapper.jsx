'use client';

import { DocumentDetailsView } from 'src/sections/document-management/view/document-details-view';

import { PageGuard } from 'src/auth/guard';

export default function DocumentDetailsWrapper({ documentId }) {
  return (
    <PageGuard>
      <DocumentDetailsView documentId={documentId} />
    </PageGuard>
  );
}
