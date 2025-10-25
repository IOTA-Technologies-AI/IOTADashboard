'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ExpenseNewEditForm } from '../expense-new-edit-form';

// ----------------------------------------------------------------------

export function ExpenseCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new expense"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: 'New expense' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ExpenseNewEditForm />
    </DashboardContent>
  );
}
