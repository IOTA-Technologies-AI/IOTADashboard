'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { listOfferQueries, replyToOfferQuestion } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** How often an open thread is re-read, in case the candidate writes again. */
const POLL_MS = 60 * 1000;

const when = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Questions the candidate asked on their signing page (docs.iotatechnologies.io)
 * and IOTA's replies. The thread is open while the candidate's message is the
 * last one; signing waits until someone replies. Shown while the offer awaits
 * the employee's signature, or whenever there is a thread.
 */
export function OfferQuestions({ offer }) {
  const [queries, setQueries] = useState([]);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listOfferQueries(offer.id);
      setQueries(data?.queries ?? []);
      setOpen(!!data?.open);
    } catch (err) {
      console.error('Loading offer questions failed:', err);
    }
  }, [offer.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [open, load]);

  const send = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const data = await replyToOfferQuestion(offer.id, body);
      setQueries(data?.queries ?? []);
      setOpen(!!data?.open);
      setReply('');
      toast.success('Reply sent. The candidate has been emailed.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'The reply could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (!queries.length && offer.status !== 'pending_employee_signature') return null;

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Candidate questions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Questions {offer.candidateName || 'the candidate'} asks on their signing page, and
        IOTA&apos;s replies. Replies are emailed to them.
      </Typography>

      {open ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Signing is on hold until someone replies.
        </Alert>
      ) : null}

      {queries.length ? (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {queries.map((q) => {
            const mine = q.author === 'iota';
            return (
              <Box
                key={q.id}
                sx={{
                  maxWidth: '85%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  px: 2,
                  py: 1.5,
                  borderRadius: 1.5,
                  bgcolor: mine ? 'primary.lighter' : 'background.neutral',
                }}
              >
                <Typography variant="caption" color="text.secondary" component="div">
                  <strong>{q.authorName || (mine ? 'IOTA' : 'Candidate')}</strong> ·{' '}
                  {when(q.createdAt)}
                </Typography>
                {q.clauseRef ? (
                  <Typography variant="caption" color="text.secondary" component="div">
                    About: {q.clauseRef}
                  </Typography>
                ) : null}
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {q.body}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
          No questions yet.
        </Typography>
      )}

      <Stack spacing={1}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Reply to the candidate"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton
            variant="contained"
            loading={sending}
            disabled={!reply.trim()}
            startIcon={<Iconify icon="eva:message-circle-fill" />}
            onClick={send}
          >
            Send reply
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );
}
