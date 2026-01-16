'use client';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency, fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ExpenseApprovalDialog } from './expense-approval-dialog';

// ----------------------------------------------------------------------

export function ExpenseDetails({ expense }) {
  const router = useRouter();
  const approvalDialog = useBoolean();

  const renderInfo = (
    <Card sx={{ pt: 5, px: 5 }}>
      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense Type
          </Typography>
          <Typography variant="body2">{expense?.expenseTypeDesc || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            ID
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {expense?.id || 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Employee Related
          </Typography>
          <Label
            variant="soft"
            color={expense?.isEmployeeRelated ? 'info' : 'default'}
            sx={{ width: 'fit-content' }}
          >
            {expense?.isEmployeeRelated ? 'Yes' : 'No'}
          </Label>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense Date
          </Typography>
          <Typography variant="body2">
            {expense?.expenseDate ? fDate(expense.expenseDate) : 'N/A'}
          </Typography>
        </Stack>

        {/* Amount Section - Show original and converted if different currency */}
        {expense?.originalExpenseCurrency &&
        expense?.originalExpenseCurrency !== 'SAR' &&
        expense?.originalExpenseAmount ? (
          <>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                Original Amount ({expense.originalExpenseCurrency})
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {fCurrency(expense.originalExpenseAmount, {
                  currency: expense.originalExpenseCurrency,
                })}
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                Converted Amount (SAR)
              </Typography>
              <Typography variant="h6" sx={{ color: 'primary.main' }}>
                {fCurrency(expense.expenseAmount, { currency: 'SAR' })}
              </Typography>
            </Stack>
          </>
        ) : (
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Amount (SAR)
            </Typography>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              {fCurrency(expense?.expenseAmount || 0, { currency: 'SAR' })}
            </Typography>
          </Stack>
        )}

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Expense By (Employee ID)
          </Typography>
          <Typography variant="body2">{expense?.expenseBy || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            External Transaction ID
          </Typography>
          <Typography variant="body2">{expense?.externalTransactionId || 'N/A'}</Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approval Status
          </Typography>
          <Label
            variant="soft"
            color={
              (expense?.expenseApprovalStatus === 'approved' && 'success') ||
              (expense?.expenseApprovalStatus === 'pending' && 'warning') ||
              (expense?.expenseApprovalStatus === 'rejected' && 'error') ||
              'default'
            }
            sx={{ width: 'fit-content', textTransform: 'capitalize' }}
          >
            {expense?.expenseApprovalStatus || 'Pending'}
          </Label>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved By
          </Typography>
          <Typography variant="body2">{expense?.expenseApprovedBy || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved Date
          </Typography>
          <Typography variant="body2">
            {expense?.expenseApprovedDate ? fDate(expense.expenseApprovedDate) : 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Approved Amount
          </Typography>
          <Typography variant="body2">
            {expense?.expenseApprovedAmount
              ? `${fNumber(expense.expenseApprovedAmount)} ${expense?.expenseCurrency || 'SAR'}`
              : 'N/A'}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Original Transaction Date
          </Typography>
          <Typography variant="body2">
            {expense?.originalTransactionDate ? fDate(expense.originalTransactionDate) : 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Settlement Notes
          </Typography>
          <Typography variant="body2">{expense?.expenseSettlementNotes || 'N/A'}</Typography>
        </Stack>

        <Stack spacing={1} sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Receipt URL
          </Typography>
          {expense?.fileLocation ? (
            <Box
              component="a"
              href={expense.fileLocation}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                wordBreak: 'break-all',
              }}
            >
              {expense.fileLocation}
            </Box>
          ) : (
            <Typography variant="body2">N/A</Typography>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

      <Box
        sx={{
          rowGap: 3,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Reference ID
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {expense?.referenceId || 'N/A'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Created At
          </Typography>
          <Typography variant="body2">
            {expense?.createdAt ? fDate(expense.createdAt) : 'N/A'}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );

  const isPending =
    expense?.expenseApprovalStatus === null || expense?.expenseApprovalStatus === undefined;

  const renderActions = (
    <Card sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        {/* Show "Approve Expense" for pending expenses */}
        {isPending && (
          <Button
            fullWidth
            size="small"
            variant="contained"
            color="success"
            startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
            onClick={approvalDialog.onTrue}
          >
            Approve / Reject
          </Button>
        )}

        <Button
          fullWidth
          size="small"
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="solar:pen-bold" width={18} />}
          component={RouterLink}
          href={paths.dashboard.expense.edit(expense?.referenceId)}
        >
          Edit
        </Button>

        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => router.back()}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
        >
          Back
        </Button>
      </Stack>
    </Card>
  );

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 9 }}>{renderInfo}</Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Box sx={{ position: 'sticky', top: 100, zIndex: 10 }}>{renderActions}</Box>
        </Grid>
      </Grid>

      {/* Expense Approval Dialog */}
      <ExpenseApprovalDialog
        open={approvalDialog.value}
        onClose={approvalDialog.onFalse}
        expense={expense}
        onApprovalComplete={() => router.refresh()}
      />
    </>
  );
}
