'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import {
  submitManualMatch,
  approveReconciliation,
  fetchUnmatchedTransactions,
  fetchPendingReconciliation,
} from 'src/actions/reconciliation';

import { Iconify } from 'src/components/iconify/iconify';

// ─────────────────────────────────────────────────────────────────────────────

const APPROVER_ROLES = ['manager', 'admin', 'superAdmin'];

// ─────────────────────────────────────────────────────────────────────────────

function TransactionRow({ transaction, selected, onSelect }) {
  const isDebit = transaction.transactionType === 'debit';
  const amount = transaction.amount || 0;

  return (
    <TableRow
      hover
      selected={selected}
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        '&.Mui-selected': { bgcolor: 'action.selected' },
        '&.Mui-selected:hover': { bgcolor: 'action.selected' },
      }}
    >
      <TableCell padding="none" sx={{ pl: 1 }}>
        <Iconify
          icon={selected ? 'solar:check-circle-bold' : 'solar:add-circle-line-duotone'}
          sx={{ color: selected ? 'primary.main' : 'text.disabled', width: 20, height: 20 }}
        />
      </TableCell>
      <TableCell sx={{ maxWidth: 160 }}>
        <Typography variant="body2" noWrap fontWeight={500}>
          {transaction.description || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {transaction.counterpartyName || transaction.referenceNumber || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {transaction.transactionDate ? fDate(transaction.transactionDate) : '—'}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography
          variant="body2"
          fontWeight={600}
          color={isDebit ? 'error.main' : 'success.main'}
        >
          {isDebit ? '-' : '+'}
          {fCurrency(amount)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function PendingApprovalRow({ request, onAction, isApprover }) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onAction({ id: request.id, action: 'approve' });
    setLoading(false);
  };

  const handleRejectConfirm = async () => {
    setLoading(true);
    await onAction({ id: request.id, action: 'reject', rejectionReason });
    setLoading(false);
    setRejectDialogOpen(false);
    setRejectionReason('');
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {request.statementTransactionId?.slice(0, 8)}…
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ↔ {request.manualTransactionId?.slice(0, 8)}…
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {request.requestedBy || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label="Pending" size="small" color="warning" variant="soft" sx={{ fontSize: 11 }} />
        </TableCell>
        <TableCell align="right">
          {isApprover && (
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              <Tooltip title="Approve match">
                <span>
                  <IconButton
                    size="small"
                    color="success"
                    onClick={handleApprove}
                    disabled={loading}
                  >
                    {loading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Iconify icon="solar:check-circle-bold" width={18} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Reject match">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={loading}
                  >
                    <Iconify icon="solar:close-circle-bold" width={18} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        </TableCell>
      </TableRow>

      {/* Reject dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject Reconciliation Match</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting this match request.
          </DialogContentText>
          <TextField
            label="Rejection reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={!rejectionReason.trim() || loading}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AccountsReconciliationPanel({ userEmail, userRole, onMatchSubmitted, sx }) {
  const isApprover = APPROVER_ROLES.includes(userRole);

  const [statementTxns, setStatementTxns] = useState([]);
  const [manualTxns, setManualTxns] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [selectedManual, setSelectedManual] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ── Load data ────────────────────────────────────────────────────────────

  const loadUnmatched = useCallback(async () => {
    setLoading(true);
    const [unmatchedRes, pendingRes] = await Promise.all([
      fetchUnmatchedTransactions(),
      fetchPendingReconciliation(),
    ]);
    if (unmatchedRes.success) {
      setStatementTxns(unmatchedRes.data?.statementTransactions || []);
      setManualTxns(unmatchedRes.data?.manualTransactions || []);
    }
    if (pendingRes.success) {
      setPendingRequests(pendingRes.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUnmatched();
  }, [loadUnmatched]);

  // ── Submit manual match ──────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedStatement || !selectedManual) return;
    setSubmitting(true);
    try {
      const result = await submitManualMatch({
        statementTransactionId: selectedStatement,
        manualTransactionId: selectedManual,
        requestedBy: userEmail || 'unknown',
      });
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Match submitted for approval.',
          severity: 'success',
        });
        setSelectedStatement(null);
        setSelectedManual(null);
        loadUnmatched();
        onMatchSubmitted?.();
      } else {
        setSnackbar({ open: true, message: result.error || 'Submit failed', severity: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedStatement, selectedManual, userEmail, loadUnmatched, onMatchSubmitted]);

  // ── Approve / reject ─────────────────────────────────────────────────────

  const handleAction = useCallback(
    async ({ id, action, rejectionReason }) => {
      const result = await approveReconciliation({
        id,
        action,
        reviewedBy: userEmail || 'unknown',
        rejectionReason,
      });
      if (result.success) {
        setSnackbar({
          open: true,
          message: action === 'approve' ? 'Match approved successfully.' : 'Match rejected.',
          severity: action === 'approve' ? 'success' : 'info',
        });
        loadUnmatched();
        onMatchSubmitted?.();
      } else {
        setSnackbar({ open: true, message: result.error || 'Action failed', severity: 'error' });
      }
    },
    [userEmail, loadUnmatched, onMatchSubmitted]
  );

  // ─────────────────────────────────────────────────────────────────────────

  const selectedStatementTxn = statementTxns.find((t) => t.id === selectedStatement);
  const selectedManualTxn = manualTxns.find((t) => t.id === selectedManual);
  const amountDiff =
    selectedStatementTxn && selectedManualTxn
      ? Math.abs((selectedStatementTxn.amount || 0) - (selectedManualTxn.amount || 0))
      : null;
  const typeMismatch =
    selectedStatementTxn &&
    selectedManualTxn &&
    selectedStatementTxn.transactionType !== selectedManualTxn.transactionType;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={sx}>
      {/* ── Manual Matching ─────────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Manual Reconciliation"
          subheader="Select one transaction from each column to create a match request"
          action={
            <Button
              size="small"
              startIcon={<Iconify icon="solar:refresh-circle-line-duotone" />}
              onClick={loadUnmatched}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={48}
                  sx={{ mb: 1, borderRadius: 1 }}
                />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 0,
                '& > *:first-of-type': {
                  borderRight: { md: '1px solid' },
                  borderColor: { md: 'divider' },
                },
              }}
            >
              {/* Statement transactions */}
              <Box>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.neutral' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:file-text-bold-duotone" color="info.main" />
                    <Typography variant="subtitle2">Bank Statement Entries</Typography>
                    <Chip label={statementTxns.length} size="small" color="info" variant="soft" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Imported from uploaded statements — not yet reconciled
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="none" sx={{ pl: 1, width: 28 }} />
                        <TableCell>Description</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {statementTxns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No unmatched statement entries
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        statementTxns.map((txn) => (
                          <TransactionRow
                            key={txn.id}
                            transaction={txn}
                            selected={selectedStatement === txn.id}
                            onSelect={() =>
                              setSelectedStatement((prev) => (prev === txn.id ? null : txn.id))
                            }
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Manual transactions */}
              <Box>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.neutral' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:pen-bold-duotone" color="warning.main" />
                    <Typography variant="subtitle2">Manual Entries</Typography>
                    <Chip label={manualTxns.length} size="small" color="warning" variant="soft" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Manually recorded transactions — awaiting statement match
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="none" sx={{ pl: 1, width: 28 }} />
                        <TableCell>Description</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {manualTxns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No unmatched manual entries
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        manualTxns.map((txn) => (
                          <TransactionRow
                            key={txn.id}
                            transaction={txn}
                            selected={selectedManual === txn.id}
                            onSelect={() =>
                              setSelectedManual((prev) => (prev === txn.id ? null : txn.id))
                            }
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}

          {/* Match preview & submit */}
          {(selectedStatement || selectedManual) && (
            <>
              <Divider />
              <Box sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">
                      Selected statement entry
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedStatementTxn
                        ? `${selectedStatementTxn.description || '—'} · ${fCurrency(selectedStatementTxn.amount)}`
                        : 'None selected'}
                    </Typography>
                  </Box>

                  <Iconify icon="solar:link-bold" sx={{ color: 'primary.main', flexShrink: 0 }} />

                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">
                      Selected manual entry
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedManualTxn
                        ? `${selectedManualTxn.description || '—'} · ${fCurrency(selectedManualTxn.amount)}`
                        : 'None selected'}
                    </Typography>
                  </Box>

                  <LoadingButton
                    variant="contained"
                    loading={submitting}
                    disabled={!selectedStatement || !selectedManual}
                    onClick={handleSubmit}
                    startIcon={<Iconify icon="solar:send-bold" />}
                    sx={{ flexShrink: 0 }}
                  >
                    Submit for Approval
                  </LoadingButton>
                </Stack>

                {typeMismatch && (
                  <Alert
                    severity="warning"
                    sx={{ mt: 1.5 }}
                    icon={<Iconify icon="solar:danger-bold" />}
                  >
                    Transaction types differ (one is credit, the other debit). Verify before
                    submitting.
                  </Alert>
                )}
                {amountDiff !== null && amountDiff > 0 && !typeMismatch && (
                  <Alert
                    severity={amountDiff < 10 ? 'info' : 'warning'}
                    sx={{ mt: 1.5 }}
                    icon={<Iconify icon="solar:info-circle-bold" />}
                  >
                    Amount difference: {fCurrency(amountDiff)}.{' '}
                    {amountDiff < 10 ? 'Minor rounding difference.' : 'Please review carefully.'}
                  </Alert>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Approvals ────────────────────────────────────────── */}
      {(isApprover || pendingRequests.length > 0) && (
        <Card>
          <CardHeader
            title="Pending Match Requests"
            subheader={
              isApprover
                ? 'Review and approve or reject reconciliation matches submitted by your team'
                : 'Match requests awaiting approval'
            }
            action={
              pendingRequests.length > 0 && (
                <Chip
                  label={`${pendingRequests.length} pending`}
                  color="warning"
                  size="small"
                  variant="soft"
                />
              )
            }
          />
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transaction IDs</TableCell>
                  <TableCell>Requested by</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">{isApprover ? 'Action' : ''}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No pending requests
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((req) => (
                    <PendingApprovalRow
                      key={req.id}
                      request={req}
                      isApprover={isApprover}
                      onAction={handleAction}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
