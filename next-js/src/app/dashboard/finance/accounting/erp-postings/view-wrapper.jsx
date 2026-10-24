'use client';

import { PostingsView } from 'src/sections/fah/view/postings-view';

import { PageGuard } from 'src/auth/guard';

export default function PostingsWrapper() {
  return (
    <PageGuard>
      <PostingsView />
    </PageGuard>
  );
}
