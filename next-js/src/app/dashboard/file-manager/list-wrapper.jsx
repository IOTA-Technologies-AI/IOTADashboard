'use client';

import { PageGuard } from 'src/auth/guard';
import { FileManagerView } from 'src/sections/file-manager/view';

export default function FileManagerListWrapper() {
  return (
    <PageGuard>
      <FileManagerView />
    </PageGuard>
  );
}
