'use client';

import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import { apiMessage, sendLeadReply, getLeadReplyDraft } from 'src/actions/leads';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Reply to a lead by email, from IOTA's address. Opens with the standard reply
 * for that kind of form (Leads → Settings → Reply templates), filled in; edit
 * it before sending. Replies come back to the sender, who also gets a copy.
 */
export function LeadReplyDialog({ leadId, onClose, onSent }) {
  const [draft, setDraft] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!leadId) return undefined;
    let live = true;
    setDraft(null);
    setError('');
    getLeadReplyDraft(leadId)
      .then((d) => {
        if (!live) return;
        setDraft(d);
        setSubject(d.subject);
        setBody(d.body);
      })
      .catch((err) => live && setError(apiMessage(err, 'The reply could not be prepared.')));
    return () => {
      live = false;
    };
  }, [leadId]);

  const send = async () => {
    setSending(true);
    try {
      const res = await sendLeadReply(leadId, { subject, body });
      toast.success(`Reply sent to ${draft.to}.`);
      onSent?.(res);
      onClose();
    } catch (err) {
      toast.error(apiMessage(err, 'The reply could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!leadId} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reply by email</DialogTitle>
      {!draft && !error ? <LinearProgress /> : null}
      <DialogContent dividers>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {draft ? (
          <Stack spacing={2}>
            <TextField size="small" label="To" value={draft.to} disabled />
            <TextField
              size="small"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <TextField
              multiline
              minRows={9}
              label="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Sent from IOTA&apos;s email address with the IOTA header.
              {draft.quotesMessage ? ' Their original message is quoted underneath.' : ''} Replies
              come back to you, and you get a copy. A new lead moves to Contacted.
            </Typography>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={sending}
          disabled={!draft || subject.trim().length < 3 || body.trim().length < 10}
          startIcon={<Iconify icon="solar:letter-bold" />}
          onClick={send}
        >
          Send
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
