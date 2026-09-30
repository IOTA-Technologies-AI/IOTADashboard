import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fCurrency } from 'src/utils/format-number';

import { sendBillingInvoice } from 'src/actions/employee-billing';

import { toast } from 'src/components/snackbar';

import { periodLabel } from './utils/stages';
import { blobToBase64, renderInvoicePdfBlob } from './utils/build-invoice-for-pdf';

// ----------------------------------------------------------------------

/**
 * Emails the approved invoice PDF to the customer's department / employee
 * manager and moves it to "sent to customer". The PDF is the same document the
 * Invoice module renders, generated here in the browser.
 */
export function SendInvoiceDialog({ open, onClose, invoice, onDone }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState('');

  useEffect(() => {
    if (open && invoice) {
      // Worked out by the API from the contract's contacts: Do Not Disturb
      // contacts are left out and an active delegate takes the approver's place.
      const recipients = invoice.recipients || {};
      setTo((recipients.to || []).join(', ') || invoice.customerContactEmail || '');
      setCc((recipients.cc || []).join(', '));
      setMessage(
        `Please find attached invoice ${invoice.invoiceNumber} for ${periodLabel(invoice.period)} covering ${
          invoice.headcount
        } deployed resource${invoice.headcount === 1 ? '' : 's'}. Kindly review and confirm approval so your Finance team can process the payment.`
      );
      setPhase('');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const skipped = invoice.recipients?.skipped || [];
  const noRecipients = !(invoice.recipients?.to || []).length && !invoice.customerContactEmail;

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Enter the recipient email.');
      return;
    }
    setSending(true);
    try {
      setPhase('Generating PDF…');
      const { blob } = await renderInvoicePdfBlob(invoice.invoiceId);
      const pdfBase64 = await blobToBase64(blob);
      setPhase('Sending email…');
      const updated = await sendBillingInvoice(invoice.invoiceId, {
        pdfBase64,
        to: to.trim(),
        ...(cc.trim() ? { cc: cc.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      toast.success(`${invoice.invoiceNumber} sent to ${to.trim()}`);
      onDone?.(updated);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to send invoice');
    } finally {
      setSending(false);
      setPhase('');
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send {invoice.invoiceNumber} to customer</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>{invoice.customerName}</strong> · {periodLabel(invoice.period)} ·{' '}
              {fCurrency(invoice.total, { currencyCode: invoice.currencyCode })} incl. VAT
            </Typography>
          </Alert>
          {skipped.length > 0 && (
            <Alert severity="info">
              Not emailed: {skipped.map((k) => `${k.name} (${k.reason.toLowerCase()})`).join(', ')}.
            </Alert>
          )}
          {noRecipients && (
            <Alert severity="warning">
              Nobody on this contract can be emailed. Enter a recipient here, add a delegate or
              contact on the contract, or use “Mark as sent” if it went another way.
            </Alert>
          )}
          <TextField
            label="To (approver or delegate) *"
            helperText="Comma-separated for several recipients"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <TextField
            label="Cc"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            helperText="Comma-separated. The contract's default cc list is added automatically."
          />
          <TextField
            label="Message"
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {phase && (
            <Typography variant="caption" color="text.secondary">
              {phase}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={sending} onClick={handleSend}>
          Send with PDF
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
