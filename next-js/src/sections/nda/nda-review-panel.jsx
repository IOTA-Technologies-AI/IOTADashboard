'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import {
  getNdaReview,
  runNdaReview,
  decideNdaException,
  requestNdaException,
} from 'src/actions/nda-review';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const SEVERITY = {
  high: { label: 'High', color: 'error' },
  medium: { label: 'Medium', color: 'warning' },
  low: { label: 'Low', color: 'info' },
};

const RISK = {
  high: { label: 'High risk', color: 'error' },
  medium: { label: 'Medium risk', color: 'warning' },
  low: { label: 'Low risk', color: 'success' },
};

const CHECK = {
  ok: { icon: 'solar:check-circle-bold', color: 'success.main' },
  issue: { icon: 'solar:danger-triangle-bold', color: 'error.main' },
  not_addressed: { icon: 'eva:minus-circle-fill', color: 'text.disabled' },
};

const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

function Finding({ f }) {
  const [open, setOpen] = useState(f.severity !== 'low');
  return (
    <Box sx={{ py: 1.5 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: 'pointer' }}
      >
        <Label variant="soft" color={SEVERITY[f.severity]?.color || 'default'} sx={{ mt: 0.25 }}>
          {SEVERITY[f.severity]?.label || f.severity}
        </Label>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{f.clause}</Typography>
          <Typography variant="body2">{f.issue}</Typography>
        </Box>
        <Iconify icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
      </Stack>
      <Collapse in={open}>
        <Stack spacing={1.25} sx={{ pl: { sm: 8 }, pt: 1.25 }}>
          {f.excerpt ? (
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderLeft: 3,
                borderColor: 'error.main',
                bgcolor: 'background.neutral',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Typography variant="body2">&ldquo;{f.excerpt}&rdquo;</Typography>
            </Box>
          ) : null}
          {f.impact ? (
            <Typography variant="body2">
              <strong>Risk to IOTA:</strong> {f.impact}
            </Typography>
          ) : null}
          {f.recommendation ? (
            <Typography variant="body2">
              <strong>Ask for:</strong> {f.recommendation}
            </Typography>
          ) : null}
          {f.suggestedText ? (
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderLeft: 3,
                borderColor: 'success.main',
                bgcolor: 'background.neutral',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Suggested wording
                </Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="solar:copy-bold" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard
                      .writeText(f.suggestedText)
                      .then(() => toast.success('Copied.'));
                  }}
                >
                  Copy
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {f.suggestedText}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}

/**
 * Review of an NDA against the IOTA standard, and the exception workflow.
 * `onChange` is called after anything that changes whether the NDA may be
 * submitted for signing, so the page can reload it. `onEmail` opens the
 * "Email review to IOTA" dialog.
 */
export function NdaReviewPanel({ nda, onChange, onEmail }) {
  const { user } = useAuthContext();
  const roleId = Number(user?.roleId) || 0;
  const isApprover = roleId >= 3;
  const me = (user?.email || '').toLowerCase();

  const [state, setState] = useState(null);
  const [required, setRequired] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [dialog, setDialog] = useState(null); // 'request' | 'approve' | 'reject'
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNdaReview(nda.id);
      setState(data.review);
      setRequired(data.reviewRequired);
      setLoadError('');
    } catch (err) {
      setLoadError(message(err, 'The review could not be loaded.'));
    }
  }, [nda.id]);

  // Reload whenever the NDA's document or wording may have changed.
  useEffect(() => {
    load();
  }, [load, nda.updatedAt, nda.uploadedDocumentName]);

  const changed = async (next) => {
    setState(next);
    await onChange?.();
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const review = await runNdaReview(nda.id);
      await changed(review);
      toast[review.reviewStatus === 'clear' ? 'success' : 'warning'](
        review.reviewStatus === 'clear'
          ? 'Review complete: meets the IOTA standard.'
          : 'Review complete: some clauses need attention.'
      );
    } catch (err) {
      toast.error(message(err, 'The review failed.'));
    } finally {
      setRunning(false);
    }
  };

  const handleDialog = async () => {
    setSaving(true);
    try {
      const review =
        dialog === 'request'
          ? await requestNdaException(nda.id, note)
          : await decideNdaException(nda.id, dialog === 'approve', note);
      await changed(review);
      toast.success(
        dialog === 'request'
          ? 'Exception requested. Admins and Super Admins have been emailed.'
          : dialog === 'approve'
            ? 'Exception approved. The NDA can now be submitted for signing.'
            : 'Exception rejected.'
      );
      setDialog(null);
      setNote('');
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        IOTA standard review: {loadError}
      </Alert>
    );
  }
  if (!state) return <LinearProgress sx={{ mb: 3 }} />;

  const result = state.reviewResult;
  const findings = result?.findings || [];
  const blocking = findings.filter((f) => f.severity !== 'low');
  const isDraft = nda.status === 'draft';
  const canDecide =
    isApprover &&
    state.exceptionStatus === 'pending' &&
    (roleId === 4 || (state.exceptionRequestedBy || '').toLowerCase() !== me);

  let headline;
  if (!required && state.reviewStatus === 'not_reviewed') {
    headline = (
      <Alert severity="success" variant="outlined">
        IOTA&apos;s own NDA template with no added or rewritten clauses — no review needed.
      </Alert>
    );
  } else if (state.reviewStatus === 'not_reviewed') {
    headline = (
      <Alert severity="warning">
        Not reviewed yet.{' '}
        {nda.documentSource === 'external_upload'
          ? 'This uploaded NDA'
          : 'This NDA has changed wording and'}{' '}
        must be checked against the IOTA standard before it can be submitted for signing.
      </Alert>
    );
  } else if (state.reviewStatus === 'clear') {
    headline = (
      <Alert severity="success">
        Meets the IOTA standard
        {findings.length
          ? ` (${findings.length} minor note${findings.length === 1 ? '' : 's'})`
          : ''}
        . It can be submitted for signing.
      </Alert>
    );
  } else if (state.exceptionStatus === 'approved') {
    headline = (
      <Alert severity="info">
        {blocking.length} clause{blocking.length === 1 ? '' : 's'} departed from the standard; an
        exception was approved by <strong>{state.exceptionDecidedBy}</strong> on{' '}
        {fDateTime(state.exceptionDecidedAt)}: &ldquo;{state.exceptionDecisionNote}&rdquo;
      </Alert>
    );
  } else if (state.exceptionStatus === 'pending') {
    headline = (
      <Alert severity="warning">
        Waiting for an Admin / Super Admin to approve an exception, requested by{' '}
        <strong>{state.exceptionRequestedBy}</strong>: &ldquo;{state.exceptionNote}&rdquo;
      </Alert>
    );
  } else if (state.exceptionStatus === 'rejected') {
    headline = (
      <Alert severity="error">
        Exception rejected by <strong>{state.exceptionDecidedBy}</strong>: &ldquo;
        {state.exceptionDecisionNote}&rdquo;. Get the flagged clauses corrected, upload the revised
        NDA and review again.
      </Alert>
    );
  } else {
    headline = (
      <Alert severity="error">
        {blocking.length} clause{blocking.length === 1 ? '' : 's'} need attention. Get them
        corrected by the partner and upload the revised NDA, or request an exceptional approval.
      </Alert>
    );
  }

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Iconify icon="solar:shield-check-bold" width={24} sx={{ color: 'primary.main' }} />
          <Typography variant="h6">IOTA standard review</Typography>
          {result ? (
            <Label variant="soft" color={RISK[result.riskLevel]?.color || 'default'}>
              {RISK[result.riskLevel]?.label}
            </Label>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {result && onEmail ? (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:letter-bold" />}
              onClick={onEmail}
            >
              Email to IOTA
            </Button>
          ) : null}
          {state.reviewStatus === 'attention' &&
          isDraft &&
          ['none', 'rejected'].includes(state.exceptionStatus) ? (
            <Button variant="outlined" color="warning" onClick={() => setDialog('request')}>
              Request exception
            </Button>
          ) : null}
          {canDecide ? (
            <>
              <Button variant="outlined" color="error" onClick={() => setDialog('reject')}>
                Reject
              </Button>
              <Button variant="contained" color="success" onClick={() => setDialog('approve')}>
                Approve exception
              </Button>
            </>
          ) : null}
          {required || state.reviewStatus !== 'not_reviewed' ? (
            <Tooltip
              title={
                isDraft
                  ? ''
                  : 'This NDA is past the draft stage; the review is for information and future corrections.'
              }
            >
              <span>
                <LoadingButton
                  variant={state.reviewStatus === 'not_reviewed' ? 'contained' : 'outlined'}
                  loading={running}
                  startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
                  onClick={handleRun}
                >
                  {state.reviewStatus === 'not_reviewed' ? 'Run review' : 'Review again'}
                </LoadingButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>

      {running ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Reading the NDA and checking every clause against the IOTA standard. This can take up to
            a minute, longer for a scanned PDF…
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      ) : null}

      {headline}

      {result ? (
        <>
          {result.summary ? (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {result.summary}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Reviewed {fDateTime(state.reviewedAt)} by {state.reviewedBy}
            {result.scope === 'template_changes'
              ? ' · only the added or rewritten wording was reviewed'
              : ''}
            {result.truncated ? ' · the document was very long; only the first part was read' : ''}
            {result.readFrom === 'scan'
              ? ' · scanned PDF: the pages were transcribed by AI before review, so check quoted wording against the original'
              : ''}
          </Typography>

          {findings.length ? (
            <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} sx={{ mt: 1 }}>
              {findings.map((f, i) => (
                <Finding key={`${f.checkId}-${i}`} f={f} />
              ))}
            </Stack>
          ) : null}

          <Button
            size="small"
            color="inherit"
            sx={{ mt: 1 }}
            onClick={() => setShowChecklist((v) => !v)}
            endIcon={
              <Iconify
                icon={showChecklist ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
              />
            }
          >
            {showChecklist ? 'Hide' : 'Show'} checklist against the IOTA standard
          </Button>
          <Collapse in={showChecklist}>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              {(result.checklist || []).map((c) => (
                <Tooltip key={c.checkId} title={c.note || ''}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={c.title}
                    icon={
                      <Iconify
                        icon={CHECK[c.status]?.icon}
                        sx={{ color: `${CHECK[c.status]?.color} !important` }}
                      />
                    }
                  />
                </Tooltip>
              ))}
            </Stack>
          </Collapse>

          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 2 }}>
            An AI review to help, not legal advice: read the flagged clauses yourself and involve
            legal counsel for material terms.
          </Typography>
        </>
      ) : null}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog === 'request'
            ? 'Request an exceptional approval'
            : dialog === 'approve'
              ? 'Approve the exception'
              : 'Reject the exception'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialog === 'request' ? (
              <Typography variant="body2" color="text.secondary">
                The NDA keeps {blocking.length} clause{blocking.length === 1 ? '' : 's'} that depart
                from the IOTA standard. Explain why IOTA should sign it anyway (e.g. the partner
                refuses changes and the business value outweighs the risk). Admins and Super Admins
                are emailed.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Requested by {state.exceptionRequestedBy}: &ldquo;{state.exceptionNote}&rdquo;. Your
                decision and reason are recorded in the NDA&apos;s audit log.
              </Typography>
            )}
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              label={dialog === 'request' ? 'Business reason' : 'Reason for the decision'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color={dialog === 'reject' ? 'error' : dialog === 'approve' ? 'success' : 'primary'}
            loading={saving}
            disabled={note.trim().length < (dialog === 'request' ? 10 : 5)}
            onClick={handleDialog}
          >
            {dialog === 'request'
              ? 'Send for approval'
              : dialog === 'approve'
                ? 'Approve'
                : 'Reject'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
