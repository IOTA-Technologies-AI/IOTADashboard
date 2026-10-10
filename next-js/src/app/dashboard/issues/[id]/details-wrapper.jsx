'use client';

import { IssueDetailsView } from 'src/sections/issues/view/issue-details-view';

import { PageGuard } from 'src/auth/guard';

export default function IssueDetailsWrapper({ id }) {
  return (
    <PageGuard>
      <IssueDetailsView id={id} />
    </PageGuard>
  );
}
