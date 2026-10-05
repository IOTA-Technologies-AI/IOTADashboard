'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';
import { bilingualLineFaults } from 'src/utils/invoice-lines';
import { totpStatus, approveInvoice } from 'src/utils/apiHelper';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { TOTPModal } from 'src/components/totp-modal/TOTPModal';

import {
  blobToBase64,
  renderInvoicePdfBlob,
} from 'src/sections/employee-billing/utils/build-invoice-for-pdf';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function InvoiceApprovalDialog({ open, onClose, invoice, onApprovalComplete }) {
  const { user } = useAuthContext();
  const userIdentifier = user?.email;
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpModalOpen, setTotpModalOpen] = useState(false);

  useEffect(() => {
    if (open && userIdentifier) {
      totpStatus(userIdentifier)
        .then(({ totpEnabled: enabled }) => setTotpEnabled(enabled))
        .catch(() => setTotpEnabled(false));
    }
  }, [open, userIdentifier]);

  if (!invoice) return null;

  // Also reviewable: an invoice issued before it was approved, left in 'sent'.
  const isPending =
    invoice.status === 'pending' || (invoice.status === 'sent' && !invoice.approvedBy);
  // Every line must be in English and Arabic before approval; the API refuses
  // otherwise. Rejecting sends it back to the creator to complete.
  const lineFaults = bilingualLineFaults(invoice.items);
  const linesAreBilingual = lineFaults.length === 0;
  const approverName = user?.displayName || user?.name || user?.email || 'Unknown';
  const approverEmail = user?.email || '';

  const handleStartReject = () => {
    setRejecting(true);
    setRejectionReason('');
    setReasonError('');
  };

  const handleCancelReject = () => {
    setRejecting(false);
    setRejectionReason('');
    setReasonError('');
  };

  const handleApproval = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      setReasonError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      // For approval, generate the PDF and pass base64 to the backend for OneDrive upload
      let pdfBase64 = '';
      if (approved) {
        try {
          // The list row carries only summary fields. Load the stored invoice
          // so the archived PDF has its line items, customer and PO details.
          const { blob } = await renderInvoicePdfBlob(invoice.invoiceId || invoice.id);
          pdfBase64 = await blobToBase64(blob);
        } catch (pdfErr) {
          console.warn('[InvoiceApprovalDialog] PDF generation failed (non-blocking):', pdfErr);
        }
      }

      await approveInvoice(invoice.invoiceId || invoice.id, {
        approved,
        approverName,
        approverEmail,
        ...(approved ? { pdfBase64 } : { rejectionReason: rejectionReason.trim() }),
      });

      toast.success(
        approved
          ? 'Invoice approved and uploaded to OneDrive!'
          : 'Invoice rejected. The creator has been notified by email.'
      );

      onApprovalComplete?.();
      onClose();
    } catch (error) {
      console.error('[InvoiceApprovalDialog] Error:', error);
      toast.error(
        error?.response?.data?.message || `Failed to ${approved ? 'approve' : 'reject'} invoice`
      );
    } finally {
      setLoading(false);
      setRejecting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Invoice Review</Typography>
          <Label
            variant="soft"
            color={
              invoice.status === 'approved'
                ? 'success'
                : invoice.status === 'rejected'
                  ? 'error'
                  : 'warning'
            }
          >
            {invoice.status}
          </Label>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Invoice ID and Customer */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <InfoItem label="Invoice Number" value={invoice.invoiceNumber || `#${invoice.id}`} />
            <InfoItem
              label="Customer"
              value={invoice.invoiceTo?.name || invoice.customerName || 'N/A'}
            />
          </Box>

          {/* Dates */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <InfoItem
              label="Invoice Date"
              value={fDate(invoice.createDate || invoice.invoiceDate)}
            />
            <InfoItem label="Due Date" value={fDate(invoice.dueDate)} />
          </Box>

          <Divider />

          {/* Amount */}
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
              Total Amount ({invoice.currencyCode || 'SAR'})
            </Typography>
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              {fCurrency(invoice.totalAmount || invoice.total, {
                currency: invoice.currencyCode || 'SAR',
              })}
            </Typography>
          </Box>

          {/* Items summary */}
          {invoice.items && invoice.items.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                Line Items
              </Typography>
              <Stack spacing={1}>
                {invoice.items.map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">{item.title || item.name}</Typography>
                      {item.titleAr && (
                        <Typography variant="body2" dir="rtl" sx={{ textAlign: 'right' }}>
                          {item.titleAr}
                        </Typography>
                      )}
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {item.description}
                        </Typography>
                      )}
                      {item.descriptionAr && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          dir="rtl"
                          sx={{ textAlign: 'right' }}
                        >
                          {item.descriptionAr}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ ml: 2, flexShrink: 0 }}>
                      {fCurrency((item.price || item.unitPrice || 0) * (item.quantity || 1), {
                        currency: invoice.currencyCode || 'SAR',
                      })}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {isPending && !linesAreBilingual && (
            <Alert severity="error">
              This invoice cannot be approved until every line is in English and Arabic. Reject it
              so the creator can complete it.
              {lineFaults.map((fault) => (
                <Box key={fault.line} component="div" sx={{ mt: 0.5 }}>
                  {fault.line ? `Line ${fault.line}: ` : ''}
                  {fault.problems.join(', ')}
                </Box>
              ))}
            </Alert>
          )}

          {/* Existing rejection reason if already rejected */}
          {invoice.status === 'rejected' && invoice.rejectionReason && (
            <>
              <Divider />
              <InfoItem label="Rejection Reason" value={invoice.rejectionReason} />
            </>
          )}

          {/* Rejection reason input */}
          {rejecting && (
            <>
              <Divider />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Rejection"
                placeholder="Provide a clear reason so the creator can correct and resubmit..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.trim()) setReasonError('');
                }}
                error={!!reasonError}
                helperText={reasonError}
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {isPending && !rejecting ? (
          <>
            <Button onClick={onClose} color="inherit" disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:close-circle-bold" />}
              onClick={handleStartReject}
              disabled={loading}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Iconify icon="solar:check-circle-bold" />}
              onClick={() => setTotpModalOpen(true)}
              disabled={loading || !linesAreBilingual}
            >
              Approve
            </Button>

            <TOTPModal
              open={totpModalOpen}
              onClose={() => setTotpModalOpen(false)}
              onVerified={() => handleApproval(true)}
              userId={userIdentifier}
              totpEnabled={totpEnabled}
              actionLabel="Approve Invoice"
            />
          </>
        ) : isPending && rejecting ? (
          <>
            <Button onClick={handleCancelReject} color="inherit" disabled={loading}>
              Back
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:close-circle-bold" />
                )
              }
              onClick={() => handleApproval(false)}
              disabled={loading || !rejectionReason.trim()}
            >
              Confirm Rejection
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

// ---------------------------------------------------------------------------

function InfoItem({ label, value }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || 'N/A'}</Typography>
    </Box>
  );
}
