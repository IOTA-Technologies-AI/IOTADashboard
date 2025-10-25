'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ExpenseDetails } from '../expense-details';

// ----------------------------------------------------------------------

export function ExpenseDetailsView({ expense }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Expense Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: expense?.expenseTypeDesc || 'Details' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ExpenseDetails expense={expense} />
    </DashboardContent>
  );
}
