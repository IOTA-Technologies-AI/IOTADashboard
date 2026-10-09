'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import {
  getNdaReview,
  emailNdaReview,
  getNdaReviewRecipients,
  saveNdaReviewRecipients,
} from 'src/actions/nda-review';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const SEVERITY = {
  high: { label: 'High', color: 'error' },
  medium: { label: 'Medium', color: 'warning' },
  low: { label: 'Low', color: 'info' },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

/**
 * Recipients picked from the Microsoft 365 directory. Addresses saved earlier
 * that are not in the directory still show (flagged) so they can be removed.
 */
function PeopleField({ label, value, onChange, users, loading, helperText }) {
  const byEmail = new Map(users.map((u) => [String(u.email || '').toLowerCase(), u]));
  const selected = value.map((e) => byEmail.get(e) || { email: e, name: e, external: true });
  // Without the directory (Microsoft session expired), typed addresses are
  // accepted, and committed on blur as well as Enter.
  const typed = !loading && users.length === 0;

  return (
    <Autocomplete
      multiple
      freeSolo={typed}
      autoSelect={typed}
      loading={loading}
      options={users}
      value={selected}
      filterSelectedOptions
      onChange={(_, next) =>
        onChange([
          ...new Set(
            next
              .map((u) =>
                String(typeof u === 'string' ? u : u.email || '')
                  .trim()
                  .toLowerCase()
              )
              .filter(Boolean)
          ),
        ])
      }
      isOptionEqualToValue={(a, b) =>
        String(a.email || '').toLowerCase() === String(b.email || '').toLowerCase()
      }
      getOptionLabel={(u) =>
        typeof u === 'string'
          ? u
          : u.name && u.name !== u.email
            ? `${u.name} <${u.email}>`
            : u.email
      }
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.trim().toLowerCase();
        const hits = q
          ? opts.filter((u) =>
              [u.name, u.email, u.role].some((v) =>
                String(v || '')
                  .toLowerCase()
                  .includes(q)
              )
            )
          : opts;
        return hits.slice(0, 50);
      }}
      renderOption={(props, u) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {u.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {[u.email, u.role].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderTags={(items, getTagProps) =>
        items.map((u, i) => {
          const { key, ...rest } = getTagProps({ index: i });
          return (
            <Chip
              key={key}
              {...rest}
              size="small"
              variant="soft"
              label={u.external ? u.email : u.name}
              title={u.email}
              color={
                !EMAIL.test(u.email) ? 'error' : u.external && users.length ? 'warning' : 'default'
              }
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={
            value.length ? '' : typed ? 'Type an address' : 'Search people by name or email'
          }
          helperText={
            helperText ||
            (typed
              ? 'The Microsoft directory could not be loaded; type addresses instead.'
              : undefined)
          }
        />
      )}
    />
  );
}

/**
 * Emails an NDA's saved IOTA standard review to the IOTA team: each flagged
 * clause as a review comment with the wording, the risk and what IOTA asks
 * for, with the NDA attached.
 *
 * `buildAttachment` returns `{ base64, name }` for IOTA-generated NDAs (the PDF
 * is built in the browser); uploaded NDAs attach the stored original server-side.
 */
export function NdaReviewEmailDialog({
  open,
  onClose,
  nda,
  buildAttachment,
  users = [],
  usersLoading = false,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [defaults, setDefaults] = useState({ to: [], cc: [], canEdit: false });
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState([]);
  const [saveDefaults, setSaveDefaults] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const isUploaded = nda?.documentSource === 'external_upload';

  useEffect(() => {
    if (!open || !nda?.id) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setPreview(null);
    setNote('');
    setSaveDefaults(false);
    Promise.all([getNdaReview(nda.id), getNdaReviewRecipients().catch(() => null)])
      .then(([data, recipients]) => {
        if (cancelled) return;
        const findings = data.review?.reviewResult?.findings || [];
        setResult(data.review?.reviewResult || null);
        setHistory(data.emailHistory || []);
        // Clauses needing attention are pre-selected; minor notes are optional.
        const flagged = findings
          .map((f, i) => (f.severity !== 'low' ? i : -1))
          .filter((i) => i >= 0);
        setSelected(flagged.length ? flagged : findings.map((_, i) => i));
        const r = recipients || { to: [], cc: [], canEdit: false };
        setDefaults(r);
        setTo(r.to || []);
        setCc(r.cc || []);
      })
      .catch((err) => !cancelled && setError(message(err, 'The review could not be loaded.')))
      .finally(() => !cancelled && setLoading(false));
    // eslint-disable-next-line consistent-return
    return () => {
      cancelled = true;
    };
  }, [open, nda?.id]);

  const findings = result?.findings || [];
  const invalid = [...to, ...cc].filter((e) => !EMAIL.test(e));
  const canSend = !!result && selected.length > 0 && to.length > 0 && invalid.length === 0;
  // Said out loud next to the button, so a disabled Send explains itself.
  const sendBlocked = !result
    ? 'Run the review first.'
    : !to.length
      ? 'Add at least one person in To.'
      : invalid.length
        ? 'Remove the invalid addresses.'
        : !selected.length
          ? 'Choose at least one clause.'
          : '';

  const toggle = (i) =>
    setSelected((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b)
    );

  const body = (extra) => ({
    to,
    cc,
    message: note,
    findings: selected,
    attachmentName: isUploaded ? undefined : `${nda.ndaNumber || 'NDA'}.pdf`,
    ...extra,
  });

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      setPreview(await emailNdaReview(nda.id, body({ preview: true })));
    } catch (err) {
      toast.error(message(err, 'The preview could not be built.'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      let attachment = null;
      if (!isUploaded && buildAttachment) {
        try {
          attachment = await buildAttachment();
        } catch (err) {
          console.error('Could not build the NDA PDF:', err);
          throw new Error('The NDA PDF could not be built for the attachment.');
        }
      }
      if (saveDefaults && defaults.canEdit) {
        try {
          const saved = await saveNdaReviewRecipients(to, cc);
          setDefaults((d) => ({ ...d, ...saved }));
        } catch (err) {
          toast.warning(message(err, 'The default recipients could not be saved.'));
        }
      }
      await emailNdaReview(
        nda.id,
        body(
          attachment ? { attachmentBase64: attachment.base64, attachmentName: attachment.name } : {}
        )
      );
      toast.success(`Review emailed to ${to.length + cc.length} recipient(s).`);
      onClose(true);
    } catch (err) {
      toast.error(message(err, 'The email could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Iconify icon="solar:letter-bold" width={24} sx={{ color: 'primary.main' }} />
          <span>{preview ? 'Email preview' : 'Email review to IOTA'}</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? <LinearProgress /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && !result ? (
          <Alert severity="info">
            Run the IOTA standard review first; the email is built from its findings.
          </Alert>
        ) : null}

        {!loading && result && preview ? (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              <strong>Subject:</strong> {preview.subject}
            </Typography>
            <Typography variant="body2">
              <strong>Attachment:</strong>{' '}
              {preview.attachmentName || 'none (the NDA document is not available)'}
            </Typography>
            <Box
              component="iframe"
              title="Email preview"
              srcDoc={preview.html}
              sandbox=""
              sx={{
                width: 1,
                height: '62vh',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'common.white',
              }}
            />
          </Stack>
        ) : null}

        {!loading && result && !preview ? (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Each chosen clause goes out as a review comment: the wording as written (highlighted),
              why it matters to IOTA, and the amendment IOTA asks for.{' '}
              {isUploaded
                ? `The uploaded NDA (${nda.uploadedDocumentName || 'original document'}) is attached.`
                : 'The NDA is attached as a PDF.'}
            </Typography>

            <PeopleField
              label="To"
              users={users}
              loading={usersLoading}
              value={to}
              onChange={setTo}
              helperText={
                !defaults.to?.length
                  ? 'No default recipients are set up yet.'
                  : invalid.length
                    ? `Not a valid address: ${invalid.join(', ')}`
                    : ''
              }
            />
            <PeopleField
              label="Cc"
              value={cc}
              onChange={setCc}
              users={users}
              loading={usersLoading}
            />

            {defaults.canEdit ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={saveDefaults}
                    disabled={!to.length}
                    onChange={(e) => setSaveDefaults(e.target.checked)}
                  />
                }
                label="Save these To / Cc as the default for every NDA review email"
              />
            ) : null}

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Cover note (optional)"
              placeholder="Hello team, please review the clauses below in the attached NDA…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">
                  Clauses to include ({selected.length} of {findings.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setSelected(findings.map((_, i) => i))}>
                    All
                  </Button>
                  <Button size="small" color="inherit" onClick={() => setSelected([])}>
                    None
                  </Button>
                </Stack>
              </Stack>
              {!findings.length ? (
                <Alert severity="success" sx={{ mt: 1 }}>
                  The review found nothing to raise.
                </Alert>
              ) : (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {findings.map((f, i) => (
                    <Stack
                      key={`${f.checkId}-${i}`}
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      onClick={() => toggle(i)}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: 1,
                        borderColor: selected.includes(i) ? 'primary.main' : 'divider',
                      }}
                    >
                      <Checkbox size="small" checked={selected.includes(i)} sx={{ p: 0.25 }} />
                      <Label variant="soft" color={SEVERITY[f.severity]?.color} sx={{ mt: 0.25 }}>
                        {SEVERITY[f.severity]?.label || f.severity}
                      </Label>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2">{f.clause}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {f.issue}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            {history.length ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Sent before
                </Typography>
                {history.slice(0, 5).map((h) => (
                  <Typography
                    key={`${h.at}-${h.by}`}
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {fDateTime(h.at)} by {h.by} — {h.notes}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions>
        {preview ? (
          <Button
            color="inherit"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            onClick={() => setPreview(null)}
          >
            Back to edit
          </Button>
        ) : (
          <Button color="inherit" onClick={() => onClose(false)}>
            Cancel
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {sendBlocked && !loading ? (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {sendBlocked}
          </Typography>
        ) : null}
        {!preview ? (
          <LoadingButton
            variant="outlined"
            loading={previewing}
            disabled={!result || !selected.length}
            startIcon={<Iconify icon="solar:eye-bold" />}
            onClick={handlePreview}
          >
            Preview
          </LoadingButton>
        ) : null}
        <LoadingButton
          variant="contained"
          loading={sending}
          disabled={!canSend}
          startIcon={<Iconify icon="custom:send-fill" />}
          onClick={handleSend}
        >
          Send email
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
