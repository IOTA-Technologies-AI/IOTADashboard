import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fCurrency } from 'src/utils/format-number';

import { recordBillingFollowUp, transitionBillingStage } from 'src/actions/employee-billing';

import { toast } from 'src/components/snackbar';

import { StageLabel } from './stage-label';
import { portalLabel } from './utils/stages';

// ----------------------------------------------------------------------

/**
 * One dialog for every non-email step of the pipeline:
 *  - action.kind 'stage'      → move to action.stage with a note
 *  - action.kind 'paid'       → move to paid (records payment notes)
 *  - action.kind 'follow_up'  → log a chase without changing stage
 */
export function StageTransitionDialog({ open, onClose, invoice, action, onDone }) {
  const [note, setNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [portalReference, setPortalReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setNextFollowUpDate('');
      setPaymentNotes('');
      setPortalReference('');
    }
  }, [open]);

  if (!invoice || !action) return null;

  const isFollowUp = action.kind === 'follow_up';
  const isPaid = action.kind === 'paid';
  // Submitted on the customer's own system (Oracle Cloud, SAP Ariba…), not emailed
  const isPortal = action.kind === 'portal';
  const isManualSend = action.kind === 'stage' && action.stage === 'sent_to_customer';
  const noteRequired = isFollowUp || action.stage === 'customer_queried';

  const handleSubmit = async () => {
    if (noteRequired && !note.trim()) {
      toast.error('Please add a note.');
      return;
    }
    if (isPortal && !portalReference.trim()) {
      toast.error('Enter the reference the portal gave this invoice.');
      return;
    }
    setSaving(true);
    try {
      const updated = isFollowUp
        ? await recordBillingFollowUp(invoice.invoiceId, {
            note: note.trim(),
            ...(nextFollowUpDate ? { nextFollowUpDate } : {}),
          })
        : await transitionBillingStage(invoice.invoiceId, {
            stage: action.stage,
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(nextFollowUpDate ? { nextFollowUpDate } : {}),
            ...(isPaid && paymentNotes.trim() ? { paymentNotes: paymentNotes.trim() } : {}),
            ...(isPortal
              ? { submittedVia: 'portal', portalReference: portalReference.trim() }
              : {}),
            ...(isManualSend ? { submittedVia: 'manual' } : {}),
          });
      toast.success(
        isFollowUp ? 'Follow-up recorded' : `${invoice.invoiceNumber} → ${action.label}`
      );
      onDone?.(updated);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isFollowUp ? 'Log a follow-up' : action.label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" icon={false}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <strong>{invoice.invoiceNumber}</strong>
              <span>· {invoice.customerName}</span>
              <span>· {fCurrency(invoice.total, { currencyCode: invoice.currencyCode })}</span>
              <StageLabel stage={invoice.effectiveStage} short />
              {!isFollowUp && (
                <>
                  <span>→</span>
                  <StageLabel stage={action.stage} short />
                </>
              )}
            </Stack>
          </Alert>
          {isPortal && (
            <>
              <Alert severity="info">
                This customer takes invoices through {portalLabel(invoice.portalSystem)}, so nothing
                is emailed. Download the PDF from the invoice menu, submit it there, then record the
                reference the portal returned.
                {invoice.portalUrl && (
                  <>
                    {' '}
                    <a href={invoice.portalUrl} target="_blank" rel="noreferrer">
                      Open the portal
                    </a>
                  </>
                )}
              </Alert>
              <TextField
                label="Portal reference / document number *"
                value={portalReference}
                onChange={(e) => setPortalReference(e.target.value)}
                placeholder="The number shown after submitting"
              />
            </>
          )}
          {isPaid && (
            <Alert severity="success">
              This marks the invoice as <strong>paid</strong> in the Invoice module and closes the
              matching receivable. Only admins and super-admins can do this.
            </Alert>
          )}
          <TextField
            label={noteRequired ? 'Note *' : 'Note'}
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isFollowUp
                ? 'Who was contacted, what they said, what happens next'
                : 'Reference, who confirmed, anything the next person needs to know'
            }
          />
          {isPaid ? (
            <TextField
              label="Payment reference / notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Bank reference, receipt number"
            />
          ) : (
            <TextField
              label="Next follow-up date"
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Leave blank to use the default interval for this stage."
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <LoadingButton
          variant="contained"
          color={isPaid ? 'success' : 'primary'}
          loading={saving}
          onClick={handleSubmit}
        >
          {isFollowUp ? 'Save follow-up' : 'Confirm'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
