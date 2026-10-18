'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { inspectSignatureImage } from 'src/utils/signature-ink';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const VERDICT_LABEL = {
  blank: 'Looks blank',
  'too-small': 'Looks incomplete',
};

const REASONS = [
  'The signature is blank.',
  'The signature is incomplete or cut off.',
  'The signature is illegible.',
  'The signature does not match your usual signature.',
];

/** 'ok' | 'blank' | 'too-small' | null (not yet known / unreadable) for a stored signature. */
export function useSignatureVerdict(dataUrl) {
  const [verdict, setVerdict] = useState(null);
  useEffect(() => {
    let live = true;
    setVerdict(null);
    if (dataUrl) inspectSignatureImage(dataUrl).then((v) => live && setVerdict(v));
    return () => {
      live = false;
    };
  }, [dataUrl]);
  return verdict;
}

// ----------------------------------------------------------------------

/**
 * The signature an IOTA signatory gave, as a thumbnail, flagged when it looks
 * blank or incomplete. A super admin gets a "Send back" action next to it.
 *
 * Props:
 *  - signatory          : { name, email, signedAt, signatureData }
 *  - canSendBack        : show the action
 *  - sendBackBlocked    : reason the action is unavailable (shown as tooltip), or ''
 *  - onSendBack()       : open the request dialog
 */
export function SignatoryThumbnail({ signatory, canSendBack, sendBackBlocked, onSendBack }) {
  const verdict = useSignatureVerdict(signatory?.signedAt ? signatory?.signatureData : null);
  if (!signatory?.signedAt) return null;
  const flagged = verdict === 'blank' || verdict === 'too-small';

  return (
    <Stack spacing={0.5} alignItems="flex-end" sx={{ ml: 'auto', flexShrink: 0 }}>
      {signatory.signatureData ? (
        <Box
          component="img"
          src={signatory.signatureData}
          alt={`Signature of ${signatory.name || signatory.email}`}
          sx={{
            height: 40,
            maxWidth: 140,
            objectFit: 'contain',
            bgcolor: 'common.white',
            border: (theme) =>
              `1px solid ${flagged ? theme.vars.palette.error.main : theme.vars.palette.divider}`,
            borderRadius: 0.75,
            px: 0.5,
          }}
        />
      ) : null}
      {flagged && (
        <Chip
          size="small"
          color="error"
          variant="soft"
          icon={<Iconify icon="solar:danger-triangle-bold" width={14} />}
          label={VERDICT_LABEL[verdict]}
        />
      )}
      {canSendBack && (
        <Tooltip title={sendBackBlocked || 'Ask this signatory to sign again'}>
          <span>
            <Button
              size="small"
              color={flagged ? 'error' : 'inherit'}
              variant={flagged ? 'soft' : 'text'}
              disabled={!!sendBackBlocked}
              onClick={onSendBack}
              startIcon={<Iconify icon="solar:restart-bold" width={16} />}
            >
              Send back
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

/**
 * Super admin: send an IOTA signature back for re-signing, with a reason the
 * signatory will see.
 *
 * Props:
 *  - open, onClose
 *  - signatory       : { name, email, signedAt, signatureData }
 *  - documentLabel   : "NDA" | "offer letter"
 *  - downstreamNote  : extra warning, e.g. that the partner's link is withdrawn, or ''
 *  - onSubmit(reason): returns a promise; the dialog shows its progress
 */
export function ResignRequestDialog({
  open,
  onClose,
  signatory,
  documentLabel,
  downstreamNote,
  onSubmit,
}) {
  const verdict = useSignatureVerdict(open ? signatory?.signatureData : null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason(verdict === 'blank' ? REASONS[0] : verdict === 'too-small' ? REASONS[1] : '');
  }, [open, verdict]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const name = signatory?.name || signatory?.email || 'this signatory';

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send signature back to {name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box
            sx={{
              p: 2,
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'common.white',
              border: (theme) => `1px solid ${theme.vars.palette.divider}`,
              borderRadius: 1,
            }}
          >
            {signatory?.signatureData ? (
              <Box
                component="img"
                src={signatory.signatureData}
                alt={`Signature of ${name}`}
                sx={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }}
              />
            ) : (
              <Typography variant="body2" color="text.disabled">
                No signature image on file
              </Typography>
            )}
          </Box>

          {(verdict === 'blank' || verdict === 'too-small') && (
            <Alert severity="error">
              {verdict === 'blank'
                ? 'No ink was found in this signature — it is an empty box.'
                : 'Very little ink was found — this is unlikely to be a full signature.'}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            {name}&apos;s signature will be cleared and they will be emailed to sign this{' '}
            {documentLabel} again. The reason below is included in the email and kept in the audit
            log.
          </Typography>
          {downstreamNote && <Alert severity="warning">{downstreamNote}</Alert>}

          <Stack direction="row" flexWrap="wrap" gap={1}>
            {REASONS.map((r) => (
              <Chip
                key={r}
                size="small"
                label={r}
                variant={reason === r ? 'filled' : 'outlined'}
                color={reason === r ? 'primary' : 'default'}
                onClick={() => setReason(r)}
              />
            ))}
          </Stack>
          <TextField
            label="Reason"
            multiline
            minRows={2}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          color="warning"
          loading={submitting}
          disabled={reason.trim().length < 3}
          onClick={handleSubmit}
          startIcon={<Iconify icon="solar:restart-bold" />}
        >
          Send back for re-signing
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
