'use client';

import { useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { ExpenseNewEditForm } from '../expense-new-edit-form';

// ----------------------------------------------------------------------

export function ExpenseEditView({ expense }) {
  const router = useRouter();
  const { user } = useAuthContext();

  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canEdit = normalizedRole === 'superAdmin';

  useEffect(() => {
    if (!canEdit) {
      toast.error('Only super admins can edit expenses');
      router.replace(paths.dashboard.expense.root);
    }
  }, [canEdit, router]);

  if (!canEdit) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links=[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: expense?.expenseTypeDesc || 'Edit' },
        ]
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ExpenseNewEditForm currentExpense={expense} />
    </DashboardContent>
  );
}
