'use client';

import { ExpenseListView } from 'src/sections/expense/view';

import { PageGuard } from 'src/auth/guard';

export default function ExpenseListWrapper() {
  return (
    <PageGuard>
      <ExpenseListView />
    </PageGuard>
  );
}
