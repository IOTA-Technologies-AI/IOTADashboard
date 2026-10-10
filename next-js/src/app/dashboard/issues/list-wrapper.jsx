'use client';

import { IssueListView } from 'src/sections/issues/view/issue-list-view';

import { PageGuard } from 'src/auth/guard';

export default function IssuesListWrapper() {
  return (
    <PageGuard>
      <IssueListView />
    </PageGuard>
  );
}
