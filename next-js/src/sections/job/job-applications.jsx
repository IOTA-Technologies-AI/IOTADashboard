import useSWR from 'swr';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate, fDateTime } from 'src/utils/format-time';

import { apiMessage, withdrawConsent } from 'src/actions/consents';
import {
  getJobApplications,
  getApplicationResumeLink,
  updateJobApplicationStatus,
} from 'src/actions/jobs';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useAuthContext } from 'src/auth/hooks';

import { CONSENT_METHOD } from '../consents/consent-labels';

// ----------------------------------------------------------------------

const STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];

const STATUS_COLOR = {
  new: 'info',
  reviewed: 'default',
  shortlisted: 'success',
  rejected: 'error',
  hired: 'primary',
};

const SOURCE_LABEL = {
  website_form: 'Website form',
  api: 'Careers API',
  dashboard: 'Dashboard',
};

/** What the résumé checks concluded; drives whether HR should open it with care. */
const SCAN = {
  clean: {
    label: 'Scanned clean',
    color: 'success',
    hint: 'Passed the file checks and the antivirus engine.',
  },
  unscanned: {
    label: 'Not virus-scanned',
    color: 'warning',
    hint: 'Passed the file checks, but no antivirus engine is configured. Open with care.',
  },
  error: {
    label: 'Scan failed',
    color: 'warning',
    hint: 'The antivirus engine could not be reached. Open with care.',
  },
  rejected: {
    label: 'File refused',
    color: 'error',
    hint: 'The file failed our checks and was not stored.',
  },
  infected: {
    label: 'Malware detected',
    color: 'error',
    hint: 'The antivirus engine flagged this file. It was not stored.',
  },
  suspicious: {
    label: 'Suspicious file',
    color: 'error',
    hint: 'The antivirus engine flagged this file. It was not stored.',
  },
  none: { label: 'No résumé', color: 'default', hint: 'The candidate did not attach a file.' },
};

function scanMeta(application) {
  const status = application.scanStatus || (application.resumeUrl ? 'unscanned' : 'none');
  return { status, ...(SCAN[status] || SCAN.unscanned) };
}

// ----------------------------------------------------------------------

export function JobApplications({ jobId }) {
  const { user } = useAuthContext();
  const [busy, setBusy] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const isAdmin = Number(user?.roleId) >= 3;

  const confirmWithdraw = async () => {
    setBusy(withdrawing.id);
    try {
      await withdrawConsent('applicants', withdrawing.id);
      toast.success(
        'Consent withdrawn. The application will be deleted under the retention rules.'
      );
      setWithdrawing(null);
    } catch (e) {
      toast.error(apiMessage(e, 'The consent could not be withdrawn.'));
    } finally {
      setBusy(null);
    }
  };

  const { data, isLoading, error, mutate } = useSWR(
    jobId ? ['job-applications', jobId] : null,
    () => getJobApplications(jobId)
  );
  const applications = data || [];

  const handleStatus = async (application, status) => {
    setBusy(application.id);
    try {
      await updateJobApplicationStatus(application.id, status, undefined, user?.email);
      toast.success(`Marked as ${status}`);
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not update status');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (application) => {
    setBusy(application.id);
    try {
      const res = await getApplicationResumeLink(application.id);
      if (!res?.url) {
        toast.error('No résumé is stored for this application.');
        return;
      }
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not get the download link');
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) {
    return <Alert severity="error">{error?.message || 'Could not load applications.'}</Alert>;
  }
  if (!applications.length) {
    return (
      <Alert severity="info">
        No applications yet. Submissions from the careers page appear here as they arrive.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
      }}
    >
      {applications.map((a) => {
        const scan = scanMeta(a);
        const hasFile = !!(a.resumeStoragePath || a.resumeUrl);
        const dangerous = ['infected', 'suspicious', 'rejected'].includes(scan.status);
        return (
          <Card key={a.id} sx={{ p: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>
                  {a.candidateName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  <Link href={`mailto:${a.candidateEmail}`}>{a.candidateEmail}</Link>
                  {a.candidatePhone ? ` · ${a.candidatePhone}` : ''}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Applied {fDateTime(a.appliedAt)} ·{' '}
                  {SOURCE_LABEL[a.source] || a.source || 'Careers API'}
                  {a.formName ? ` (${a.formName})` : ''}
                </Typography>
              </Box>
              <Label variant="soft" color={STATUS_COLOR[a.status] || 'default'}>
                {a.status}
              </Label>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
              <Iconify icon="solar:shield-check-bold" width={16} sx={{ color: 'text.disabled' }} />
              {a.consentWithdrawnAt ? (
                <Label color="error">Consent withdrawn {fDate(a.consentWithdrawnAt)}</Label>
              ) : a.consentAt ? (
                <Typography variant="caption" color="text.secondary">
                  Consent: {CONSENT_METHOD[a.consentMethod] || a.consentMethod} ·{' '}
                  {fDate(a.consentAt)}
                  {a.consentRecordedBy ? ` · by ${a.consentRecordedBy}` : ''}
                </Typography>
              ) : (
                <Label color="warning">No consent recorded</Label>
              )}
              {isAdmin && !a.consentWithdrawnAt ? (
                <Button size="small" color="error" onClick={() => setWithdrawing(a)}>
                  Withdraw consent
                </Button>
              ) : null}
            </Stack>

            {(a.candidateLinkedIn || a.candidatePortfolio) && (
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap">
                {a.candidateLinkedIn && (
                  <Link
                    href={a.candidateLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                  >
                    LinkedIn
                  </Link>
                )}
                {a.candidatePortfolio && (
                  <Link
                    href={a.candidatePortfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                  >
                    Portfolio
                  </Link>
                )}
              </Stack>
            )}

            {a.coverLetter && (
              <Typography
                variant="body2"
                sx={{
                  mt: 1.5,
                  whiteSpace: 'pre-wrap',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {a.coverLetter}
              </Typography>
            )}

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap">
              <Tooltip title={scan.hint}>
                <Label variant="soft" color={scan.color}>
                  {scan.label}
                </Label>
              </Tooltip>
              {a.resumeFileName && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {a.resumeFileName}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center" flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="eva:download-fill" />}
                disabled={!hasFile || dangerous || busy === a.id}
                onClick={() => handleDownload(a)}
              >
                {dangerous ? 'Résumé withheld' : 'Download résumé'}
              </Button>
              <TextField
                select
                size="small"
                label="Status"
                value={a.status || 'new'}
                onChange={(e) => handleStatus(a, e.target.value)}
                disabled={busy === a.id}
                sx={{ minWidth: 150 }}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => (busy ? null : setWithdrawing(null))}
        title="Mark consent as withdrawn?"
        content={`Record that ${withdrawing?.candidateEmail} withdrew their consent. Their application and résumé are then deleted under the retention rules.`}
        action={
          <Button variant="contained" color="error" disabled={!!busy} onClick={confirmWithdraw}>
            Withdraw
          </Button>
        }
      />
    </Box>
  );
}
