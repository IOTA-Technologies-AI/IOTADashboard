'use client';

import { m } from 'framer-motion';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { ForbiddenIllustration } from 'src/assets/illustrations';
import { useCanEditLockedRecord } from 'src/actions/admin-edit-mode';

import { varBounce, MotionContainer } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { ExpenseNewEditForm } from '../expense-new-edit-form';

// ----------------------------------------------------------------------

export function ExpenseEditView({ expense }) {
  const { user } = useAuthContext();

  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';

  const isPending =
    expense?.expenseApprovalStatus === null || expense?.expenseApprovalStatus === undefined;
  const isOwner = expense?.expenseBy === user?.name || expense?.expenseBy === user?.displayName;
  // A super-admin can edit an approved/rejected expense, but only while Record
  // Edit Mode is switched on in Account > Admin Settings. The backend enforces
  // the same rule and audits every field that changes.
  const { canEditLocked, editModeLoading } = useCanEditLockedRecord(isPending);
  const canEdit = canEditLocked || (isPending && isOwner);

  const deniedReason = !canEdit
    ? isPending
      ? 'You can only edit your own expenses.'
      : isSuperAdmin
        ? 'This expense has already been approved or rejected. Switch on Record Edit Mode in Account > Admin Settings to edit it.'
        : 'This expense has already been approved or rejected and cannot be edited.'
    : null;

  // Don't flash "permission denied" while the edit-mode window is still loading.
  if (editModeLoading) return null;

  if (!canEdit) {
    return (
      <DashboardContent>
        <Container component={MotionContainer} sx={{ textAlign: 'center' }}>
          <m.div variants={varBounce('in')}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Permission denied
            </Typography>
          </m.div>

          <m.div variants={varBounce('in')}>
            <Typography sx={{ color: 'text.secondary' }}>{deniedReason}</Typography>
          </m.div>

          <m.div variants={varBounce('in')}>
            <ForbiddenIllustration sx={{ my: { xs: 5, sm: 10 } }} />
          </m.div>
        </Container>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Expense', href: paths.dashboard.expense.root },
          { name: expense?.expenseTypeDesc || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <ExpenseNewEditForm currentExpense={expense} />
    </DashboardContent>
  );
}
