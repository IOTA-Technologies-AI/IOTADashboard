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

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';
import { approveProformaInvoice } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * Approves or rejects a proforma before it may be dispatched to the supplier.
 * A proforma without a tagged supplier can still be approved — the supplier is
 * only required at dispatch — but the dialog says so, since approving one that
 * nobody can send is rarely what the approver means to do.
 */
export function ProformaApprovalDialog({ open, onClose, proforma, onComplete }) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (!open) {
      setRejectionReason('');
      setReasonError('');
      setRejecting(false);
    }
  }, [open]);

  if (!proforma) return null;

  const approverName = user?.displayName || user?.name || user?.email || 'Unknown';
  const approverEmail = user?.email || '';

  const submit = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      setReasonError('A reason is required to reject a proforma.');
      return;
    }
    try {
      setLoading(true);
      const updated = await approveProformaInvoice(proforma.proformaId, {
        approved,
        approverName,
        approverEmail,
        ...(approved ? {} : { rejectionReason: rejectionReason.trim() }),
      });
      toast.success(approved ? 'Proforma approved.' : 'Proforma rejected.');
      onComplete?.(updated);
      onClose();
    } catch {
      toast.error('Failed to record the decision. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const row = (label, value) => (
    <Stack direction="row" justifyContent="space-between" sx={{ typography: 'body2' }}>
      <Box sx={{ color: 'text.secondary' }}>{label}</Box>
      <Box sx={{ fontWeight: 'fontWeightMedium', textAlign: 'right' }}>{value}</Box>
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review proforma invoice</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {row('Proforma', proforma.proformaNumber)}
          {row('Source invoice', proforma.invoiceNumber || '—')}
          {row('Customer', proforma.customerName || '—')}
          {row('Supplier', proforma.supplierName || 'Not tagged yet')}
          {row('Issued', fDate(proforma.issueDate))}
          <Divider sx={{ my: 1 }} />
          {row(
            'Subtotal',
            fCurrency(proforma.baseAmount, { currencyCode: proforma.currencyCode })
          )}
          {row('VAT', fCurrency(proforma.vatAmount, { currencyCode: proforma.currencyCode }))}
          {row('Total', fCurrency(proforma.total, { currencyCode: proforma.currencyCode }))}
        </Stack>

        {!proforma.supplierName && (
          <Typography variant="caption" sx={{ color: 'warning.main', mt: 2, display: 'block' }}>
            No supplier is tagged yet. You can approve now, but the proforma cannot be dispatched
            until one is set.
          </Typography>
        )}

        {rejecting && (
          <TextField
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 3 }}
            label="Reason for rejection"
            value={rejectionReason}
            error={!!reasonError}
            helperText={reasonError}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (reasonError) setReasonError('');
            }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        {rejecting ? (
          <Button color="error" variant="contained" onClick={() => submit(false)} disabled={loading}>
            Confirm rejection
          </Button>
        ) : (
          <Button color="error" onClick={() => setRejecting(true)} disabled={loading}>
            Reject
          </Button>
        )}

        {!rejecting && (
          <Button variant="contained" onClick={() => submit(true)} disabled={loading}>
            {loading ? 'Saving…' : 'Approve'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
