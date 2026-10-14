'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';

import { fDate, fDateTime } from 'src/utils/format-time';

import {
  apiMessage,
  textOfVersion,
  withdrawConsent,
  useConsentTexts,
  useConsentRecord,
} from 'src/actions/consents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useAuthContext } from 'src/auth/hooks';

import { CONSENT_STATUS, CONSENT_METHOD, CONSENT_PURPOSE } from './consent-labels';

// ----------------------------------------------------------------------

/**
 * A person's consent on their own page — a lead, an application, a candidate
 * intake or an onboarding form: what they agreed to, how and when, the exact
 * wording, and (admins) withdraw it.
 *
 * kind: 'leads' | 'applicants' | 'candidates' | 'newHires'; subjectId: that record's id.
 * Pass `card={false}` to render without its own Card (e.g. inside a drawer).
 */
export function ConsentPanel({ kind, subjectId, card = true, sx }) {
  const { user } = useAuthContext();
  const isAdmin = Number(user?.roleId) >= 3;
  const { record, error, loading } = useConsentRecord(kind, subjectId);
  const { wording } = useConsentTexts(!!record?.textVersion);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const text = record?.textVersion ? textOfVersion(wording, record.textVersion) : null;
  const purpose = record ? CONSENT_PURPOSE[record.purpose] : null;
  const status = record ? CONSENT_STATUS[record.status] : null;

  const withdraw = async () => {
    setSaving(true);
    try {
      await withdrawConsent(kind, record.id, note);
      toast.success('Consent marked as withdrawn.');
      setOpen(false);
      setNote('');
    } catch (err) {
      toast.error(apiMessage(err, 'The consent could not be withdrawn.'));
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:shield-check-bold" sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle2">Consent (PDPL)</Typography>
        </Stack>
        {status ? (
          <Label color={status.color}>
            {record.status === 'withdrawn' && record.withdrawnAt
              ? `Withdrawn ${fDate(record.withdrawnAt)}`
              : status.label}
          </Label>
        ) : null}
      </Stack>

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Typography variant="body2" color="error">
          {apiMessage(error, 'The consent could not be loaded.')}
        </Typography>
      ) : null}
      {!loading && !error && !record ? (
        <Typography variant="body2" color="text.secondary">
          No consent record.
        </Typography>
      ) : null}

      {record ? (
        <>
          <Box>
            <Tooltip title={purpose?.hint || ''}>
              <Typography variant="body2" fontWeight={600} component="span">
                {purpose?.label || record.purpose}
              </Typography>
            </Tooltip>
            {record.method ? (
              <Typography variant="body2" color="text.secondary" component="span">
                {' · '}
                {CONSENT_METHOD[record.method] || record.method}
              </Typography>
            ) : null}
          </Box>

          {record.status === 'missing' ? (
            <Typography variant="body2" color="warning.main">
              No consent was recorded — this arrived before consent was captured, or from a form
              that does not ask for it yet.
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Given {record.capturedAt ? fDateTime(record.capturedAt) : '—'}
              {record.noticeVersion ? ` · privacy notice ${record.noticeVersion}` : ''}
            </Typography>
          )}

          {text ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                typography: 'body2',
                color: 'text.secondary',
                fontStyle: 'italic',
              }}
            >
              “{text.text}”
              <Typography variant="caption" component="div" sx={{ mt: 0.5, fontStyle: 'normal' }}>
                Wording {record.textVersion}
              </Typography>
            </Box>
          ) : null}

          {record.notes?.map((n) => (
            <Typography key={n} variant="caption" color="text.secondary">
              {n}
            </Typography>
          ))}

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Link
              href={paths.dashboard.integration.consents}
              variant="caption"
              color="text.secondary"
            >
              All consents
            </Link>
            {isAdmin && record.status !== 'withdrawn' ? (
              <Button size="small" color="error" onClick={() => setOpen(true)}>
                Withdraw consent
              </Button>
            ) : null}
          </Stack>
        </>
      ) : null}

      <ConfirmDialog
        open={open}
        onClose={() => (saving ? null : setOpen(false))}
        title="Mark consent as withdrawn?"
        content={
          <Stack spacing={2}>
            <Typography variant="body2">
              Record that <strong>{record?.email}</strong> withdrew their consent. Their data is
              then deleted under the retention rules. This cannot be undone here.
            </Typography>
            <TextField
              size="small"
              label="Note (optional)"
              placeholder="e.g. Asked by email on 14 Oct to be removed"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        }
        action={
          <LoadingButton variant="contained" color="error" loading={saving} onClick={withdraw}>
            Withdraw
          </LoadingButton>
        }
      />
    </Stack>
  );

  return card ? <Card sx={{ p: 2.5, ...sx }}>{body}</Card> : <Box sx={sx}>{body}</Box>;
}
