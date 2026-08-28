'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { EditAuditTimeline } from 'src/components/edit-audit';
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

      {/* Only rendered once this expense has actually been edited under
          Record Edit Mode — otherwise it stays out of the way. */}
      <EditAuditTimeline
        entityType="expense"
        entityId={expense?.referenceId}
        sx={{ mt: 3 }}
      />
    </DashboardContent>
  );
}
