'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { apiHelper } from 'src/utils/apiHelper';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function ExpenseApprovalDialog({ open, onClose, expense, onApprovalComplete }) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [amountError, setAmountError] = useState('');

  // Get the maximum allowed amount (SAR amount)
  const maxAmount = expense?.expenseAmount || 0;

  // Initialize approved amount when expense changes or dialog opens
  useEffect(() => {
    if (expense && open) {
      setApprovedAmount(expense.expenseAmount || 0);
      setAmountError('');
    }
  }, [expense, open]);

  if (!expense) return null;

  const hasOriginalCurrency =
    expense.originalExpenseCurrency &&
    expense.originalExpenseCurrency !== 'SAR' &&
    expense.originalExpenseAmount;

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setApprovedAmount(value);

    if (value > maxAmount) {
      setAmountError(
        `Cannot exceed original amount (${fCurrency(maxAmount, { currency: 'SAR' })})`
      );
    } else if (value <= 0) {
      setAmountError('Amount must be greater than 0');
    } else {
      setAmountError('');
    }
  };

  const handleApproval = async (approved) => {
    // Validate amount before approving
    if (approved && (approvedAmount <= 0 || approvedAmount > maxAmount)) {
      toast.error('Please enter a valid approved amount');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const approverName = user?.displayName || user?.name || user?.email || 'Unknown';

      const updateData = {
        expenseApprovalStatus: approved,
        expenseApprovedBy: approverName,
        expenseApprovedDate: now,
        // Use the user-entered approved amount
        expenseApprovedAmount: approved ? approvedAmount : 0,
      };

      console.log('🔵 [ExpenseApprovalDialog] Sending approval update:', {
        referenceId: expense.referenceId,
        approved,
        updateData,
      });

      await apiHelper.updateExpense(expense.referenceId, updateData);

      toast.success(`Expense ${approved ? 'approved' : 'rejected'} successfully!`);
      onApprovalComplete?.();
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} expense`);
    } finally {
      setLoading(false);
    }
  };

  const isPending =
    expense.expenseApprovalStatus === null || expense.expenseApprovalStatus === undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Expense Approval</Typography>
          <Label
            variant="soft"
            color={
              expense.expenseApprovalStatus === true
                ? 'success'
                : expense.expenseApprovalStatus === false
                  ? 'error'
                  : 'warning'
            }
          >
            {expense.expenseApprovalStatus === true
              ? 'Approved'
              : expense.expenseApprovalStatus === false
                ? 'Rejected'
                : 'Pending'}
          </Label>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Expense ID and Type */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <InfoItem label="Expense ID" value={`#${expense.id}`} />
            <InfoItem label="Expense Type" value={expense.expenseTypeDesc || 'N/A'} />
          </Box>

          {/* Date and Employee */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <InfoItem label="Expense Date" value={fDate(expense.expenseDate)} />
            <InfoItem label="Expense By" value={expense.expenseBy || 'N/A'} />
          </Box>

          <Divider />

          {/* Amount Section - Show both original and converted if applicable */}
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
            Amount Details
          </Typography>

          {hasOriginalCurrency ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              <Stack spacing={2}>
                {/* Original Amount */}
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Original Amount ({expense.originalExpenseCurrency})
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {fCurrency(expense.originalExpenseAmount, {
                      currency: expense.originalExpenseCurrency,
                    })}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Iconify icon="eva:arrow-downward-fill" sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Converted to SAR
                  </Typography>
                </Box>

                {/* Converted Amount */}
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Converted Amount (SAR)
                  </Typography>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {fCurrency(expense.expenseAmount, { currency: 'SAR' })}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Amount (SAR)
              </Typography>
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                {fCurrency(expense.expenseAmount, { currency: 'SAR' })}
              </Typography>
            </Box>
          )}

          {/* Editable Approved Amount - only show for pending expenses */}
          {isPending && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Approved Amount"
                value={approvedAmount}
                onChange={handleAmountChange}
                error={!!amountError}
                helperText={
                  amountError ||
                  `Max: ${fCurrency(maxAmount, { currency: 'SAR' })} - You can reduce but not exceed`
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  max: maxAmount,
                  step: 0.01,
                }}
              />
            </Box>
          )}

          <Divider />

          {/* Description */}
          <InfoItem
            label="Description / Notes"
            value={expense.expenseSettlementNotes || 'No description provided'}
          />

          {/* External Transaction ID */}
          {expense.externalTransactionId && (
            <InfoItem label="External Transaction ID" value={expense.externalTransactionId} />
          )}

          {/* Attachment */}
          {expense.fileLocation && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                Attachment
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="eva:external-link-fill" />}
                href={expense.fileLocation}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Receipt
              </Button>
            </Box>
          )}

          {/* If already approved/rejected, show approval info */}
          {!isPending && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                Approval Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <InfoItem label="Approved By" value={expense.expenseApprovedBy || 'N/A'} />
                <InfoItem
                  label="Approved Date"
                  value={expense.expenseApprovedDate ? fDate(expense.expenseApprovedDate) : 'N/A'}
                />
              </Box>
              {expense.expenseApprovedAmount && (
                <InfoItem
                  label="Approved Amount"
                  value={fCurrency(expense.expenseApprovedAmount, { currency: 'SAR' })}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {isPending ? (
          <>
            <Button onClick={onClose} color="inherit" disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:close-circle-bold" />
                )
              }
              onClick={() => handleApproval(false)}
              disabled={loading}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:check-circle-bold" />
                )
              }
              onClick={() => handleApproval(true)}
              disabled={loading || !!amountError || approvedAmount <= 0}
            >
              Approve
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Helper component for displaying info
function InfoItem({ label, value }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
