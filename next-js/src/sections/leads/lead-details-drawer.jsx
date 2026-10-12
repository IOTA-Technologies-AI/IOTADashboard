'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { useLead, updateLead, apiMessage, convertLead } from 'src/actions/leads';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { LeadReplyDialog } from './lead-reply-dialog';
import { LEAD_SOURCE, LEAD_STATUS, CONSENT_BASIS } from './lead-labels';

// ----------------------------------------------------------------------

const EVENT_LABEL = {
  received: 'Received',
  status_changed: 'Status changed',
  assigned: 'Assigned',
  note: 'Note',
  replied: 'Emailed',
  converted: 'Added to the sales ledger',
};

function eventText(e) {
  const d = e.detail || {};
  if (e.type === 'status_changed')
    return `${LEAD_STATUS[d.from]?.label || d.from} → ${LEAD_STATUS[d.to]?.label || d.to}`;
  if (e.type === 'assigned') return d.to ? `to ${d.to}` : 'unassigned';
  if (e.type === 'note') return d.text;
  if (e.type === 'replied') return d.subject ? `“${d.subject}”` : '';
  if (e.type === 'received') return d.form ? `form “${d.form}”` : '';
  return '';
}

function Field({ label, children }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, typography: 'body2', wordBreak: 'break-word' }}>
        {children || '—'}
      </Box>
    </Stack>
  );
}

export function LeadDetailsDrawer({ id, onClose }) {
  const { lead, error, loading } = useLead(id);
  const [busy, setBusy] = useState(null); // 'status' | 'note' | 'convert'
  const [note, setNote] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [converting, setConverting] = useState(null); // { company, prospectName }
  const [replying, setReplying] = useState(false);

  const run = async (what, fn, success) => {
    setBusy(what);
    try {
      await fn();
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error(apiMessage(err, 'That did not work.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const consent = lead?.consent;
  const basis = consent ? CONSENT_BASIS[consent.basis] : null;
  const isCareers = lead?.source === 'webflow_careers';

  return (
    <Drawer
      anchor="right"
      open={!!id}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 480 } } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {lead?.fullName || lead?.email || 'Lead'}
          </Typography>
          {lead ? (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Label variant="soft" color={LEAD_SOURCE[lead.source]?.color}>
                {LEAD_SOURCE[lead.source]?.label || lead.source}
              </Label>
              <Label variant="soft" color={LEAD_STATUS[lead.status]?.color}>
                {LEAD_STATUS[lead.status]?.label || lead.status}
              </Label>
            </Stack>
          ) : null}
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {apiMessage(error, 'The lead could not be loaded.')}
        </Alert>
      ) : null}

      {lead ? (
        <Scrollbar sx={{ flexGrow: 1 }}>
          <Stack spacing={3} sx={{ p: 2.5 }}>
            <Box>
              <Field label="Email">
                <Link href={`mailto:${lead.email}`}>{lead.email}</Link>
              </Field>
              <Field label="Phone">{lead.phone}</Field>
              <Field label="Company">{lead.company}</Field>
              <Field label="Received">{fDateTime(lead.receivedAt)}</Field>
              <Field label="Form">{lead.formName}</Field>
              <Field label="Page">{lead.pageUrl}</Field>
            </Box>

            {lead.message ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Message
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'background.neutral',
                  }}
                >
                  {lead.message}
                </Typography>
              </Box>
            ) : null}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Consent (PDPL)
              </Typography>
              {consent ? (
                <Alert
                  severity={consent.withdrawnAt ? 'warning' : 'info'}
                  icon={<Iconify icon="solar:shield-check-bold" />}
                >
                  <Typography variant="subtitle2">
                    {basis?.label || consent.basis}
                    {consent.withdrawnAt ? ` — withdrawn ${fDateTime(consent.withdrawnAt)}` : ''}
                  </Typography>
                  <Typography variant="body2">{basis?.hint}</Typography>
                  <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                    Given {fDateTime(consent.capturedAt)} · privacy notice {consent.noticeVersion}
                  </Typography>
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No consent record.
                </Typography>
              )}
            </Box>

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Follow-up</Typography>
              <Button
                fullWidth
                variant={lead.status === 'new' ? 'contained' : 'outlined'}
                color={lead.status === 'new' ? 'warning' : 'inherit'}
                startIcon={<Iconify icon="solar:letter-bold" />}
                onClick={() => setReplying(true)}
              >
                {lead.status === 'new' ? 'Reply by email' : 'Email again'}
              </Button>
              <TextField
                select
                size="small"
                label="Status"
                value={lead.status}
                disabled={busy === 'status' || lead.status === 'converted'}
                onChange={(e) =>
                  run(
                    'status',
                    () => updateLead(lead.id, { status: e.target.value }),
                    'Status updated.'
                  )
                }
              >
                {Object.entries(LEAD_STATUS)
                  .filter(([value]) => value !== 'converted' || lead.status === 'converted')
                  .map(([value, s]) => (
                    <MenuItem key={value} value={value}>
                      {s.label}
                    </MenuItem>
                  ))}
              </TextField>

              {lead.ledgerEntryId ? (
                <Alert severity="success">
                  In the sales ledger.{' '}
                  <Link component={RouterLink} href={paths.dashboard.sales.activityLedger}>
                    Open the Activity Ledger
                  </Link>
                </Alert>
              ) : (
                <Tooltip
                  title={
                    isCareers
                      ? 'A careers lead is a job applicant — HR handles it under job applications.'
                      : ''
                  }
                >
                  <span>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={isCareers}
                      startIcon={<Iconify icon="solar:user-plus-bold" />}
                      onClick={() =>
                        setConverting({
                          company: lead.company || '',
                          prospectName: lead.fullName || '',
                        })
                      }
                    >
                      Convert to sales lead
                    </Button>
                  </span>
                </Tooltip>
              )}

              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={4}
                  placeholder="Add a note — e.g. replied by email"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <LoadingButton
                  variant="outlined"
                  loading={busy === 'note'}
                  disabled={!note.trim()}
                  onClick={async () => {
                    if (await run('note', () => updateLead(lead.id, { note }))) setNote('');
                  }}
                >
                  Add
                </LoadingButton>
              </Stack>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                History
              </Typography>
              <Stack spacing={1.25}>
                {lead.events.map((e) => (
                  <Box key={e.id}>
                    <Typography variant="body2">
                      <strong>{EVENT_LABEL[e.type] || e.type}</strong> {eventText(e)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fDateTime(e.createdAt)} · {e.actor}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Divider />
            <Box>
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowRaw((v) => !v)}
                endIcon={
                  <Iconify
                    icon={showRaw ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                  />
                }
              >
                Submission as received
              </Button>
              <Collapse in={showRaw}>
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'background.neutral',
                    typography: 'caption',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(lead.rawPayload, null, 2)}
                </Box>
              </Collapse>
            </Box>
          </Stack>
        </Scrollbar>
      ) : null}

      <Dialog open={!!converting} onClose={() => setConverting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Convert to a sales lead</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Adds this person to the Sales Activity Ledger as a new website lead, with their enquiry
            in the notes.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={converting?.prospectName || ''}
              onChange={(e) => setConverting((c) => ({ ...c, prospectName: e.target.value }))}
            />
            <TextField
              required
              label="Company"
              value={converting?.company || ''}
              helperText={lead?.company ? '' : 'The website form did not ask for it.'}
              onChange={(e) => setConverting((c) => ({ ...c, company: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConverting(null)}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={busy === 'convert'}
            disabled={!converting?.company?.trim()}
            onClick={async () => {
              const ok = await run(
                'convert',
                () => convertLead(lead.id, converting),
                'Added to the sales ledger.'
              );
              if (ok) setConverting(null);
            }}
          >
            Convert
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <LeadReplyDialog leadId={replying ? lead?.id : null} onClose={() => setReplying(false)} />
    </Drawer>
  );
}
