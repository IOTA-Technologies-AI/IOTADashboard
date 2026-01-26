'use client';

import { ExpenseListView } from 'src/sections/expense/view';

import { PageGuard } from 'src/auth/guard';

export default function ExpenseListWrapper({ expenses, permissionError }) {
  return (
    <PageGuard>
      <ExpenseListView expenses={expenses} permissionError={permissionError} />
    </PageGuard>
  );
}
