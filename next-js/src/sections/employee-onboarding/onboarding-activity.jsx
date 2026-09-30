import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const FORM_STEPS = [
  'Verify Identity',
  'Personal Details',
  'Contact & Emergency',
  'Identity Documents',
  'Family & Dependants',
  'Bank & GOSI',
  'Insurance',
  'Review & Submit',
];

export const AUDIT_LABELS = {
  token_created: { label: 'Link sent', color: 'primary', by: 'hr' },
  token_viewed: { label: 'Link opened', color: 'default', by: 'person' },
  token_revoked: { label: 'Link revoked', color: 'error', by: 'hr' },
  otp_requested: { label: 'Code requested', color: 'info', by: 'person' },
  otp_verified: { label: 'Logged in (code verified)', color: 'success', by: 'person' },
  otp_failed: { label: 'Login failed', color: 'warning', by: 'person' },
  draft_saved: { label: 'Draft saved', color: 'info', by: 'person' },
  draft_restored: { label: 'Draft re-opened', color: 'secondary', by: 'person' },
  form_submitted: { label: 'Form submitted', color: 'success', by: 'person' },
  submission_viewed: { label: 'Viewed by HR', color: 'default', by: 'hr' },
  submission_applied: { label: 'Applied to employee record', color: 'success', by: 'hr' },
};

const FAIL_REASONS = {
  email_mismatch: 'email did not match the link',
  otp_expired: 'code had expired',
  wrong_code: 'wrong code',
};

const locationOf = (e) => [e.city, e.region, e.country].filter(Boolean).join(', ');
const deviceOf = (e) => [e.browser, e.os, e.deviceType].filter(Boolean).join(' · ');
const uniq = (list) => [...new Set(list.filter(Boolean))];

function detailOf(entry) {
  const m = entry.metadata || {};
  const parts = [];
  if (entry.action === 'draft_saved') {
    parts.push(m.auto ? 'automatic, on moving between steps' : 'pressed “Save draft”');
    if (m.step != null && FORM_STEPS[m.step]) parts.push(`at “${FORM_STEPS[m.step]}”`);
    if (m.answered != null) parts.push(`${m.answered} answers`);
  }
  if (entry.action === 'draft_restored' && m.step != null && FORM_STEPS[m.step]) {
    parts.push(`resumed at “${FORM_STEPS[m.step]}”`);
  }
  if (entry.action === 'otp_failed' && m.reason) parts.push(FAIL_REASONS[m.reason] || m.reason);
  if (entry.action === 'submission_applied' && m.created) parts.push('employee record created');
  if (m.client?.timezone) parts.push(m.client.timezone);
  if (m.client?.language) parts.push(m.client.language);
  if (m.client?.screen) parts.push(`screen ${m.client.screen}`);
  return parts.join(' · ');
}

function Tile({ label, value, color, hint }) {
  return (
    <Card variant="outlined" sx={{ p: 1.5, minWidth: 130, flex: '1 1 130px' }}>
      <Typography variant="h5" fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.disabled" display="block">
          {hint}
        </Typography>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

/**
 * The audit trail of one onboarding link: how many times the person logged in,
 * from which addresses, places and devices, and every save, re-open and the
 * final submission. Location is derived from the IP address and is approximate.
 */
export function OnboardingActivity({ auditLog = [], showHrEvents = true }) {
  const entries = useMemo(
    () => (showHrEvents ? auditLog : auditLog.filter((e) => AUDIT_LABELS[e.action]?.by !== 'hr')),
    [auditLog, showHrEvents]
  );

  const summary = useMemo(() => {
    const person = auditLog.filter((e) => AUDIT_LABELS[e.action]?.by === 'person');
    const of = (action) => auditLog.filter((e) => e.action === action);
    const saves = of('draft_saved');
    const firstOpen = of('token_viewed')[0];
    const submitted = of('form_submitted')[0];
    const lastSeen = person[person.length - 1];
    return {
      logins: of('otp_verified').length,
      failed: of('otp_failed').length,
      opens: of('token_viewed').length,
      saves: saves.length,
      manualSaves: saves.filter((e) => !e.metadata?.auto).length,
      reopens: of('draft_restored').length,
      ips: uniq(person.map((e) => e.ipAddress)),
      locations: uniq(person.map(locationOf)),
      devices: uniq(person.map(deviceOf)),
      firstOpen: firstOpen?.occurredAt,
      submitted: submitted?.occurredAt,
      lastSeen: lastSeen?.occurredAt,
    };
  }, [auditLog]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5 }}>
        <Tile label="Logins" value={summary.logins} color="success.main" hint="codes verified" />
        <Tile
          label="Failed logins"
          value={summary.failed}
          color={summary.failed ? 'warning.main' : 'text.primary'}
        />
        <Tile label="Link opened" value={summary.opens} hint="page loads" />
        <Tile
          label="Drafts saved"
          value={summary.saves}
          color="info.main"
          hint={`${summary.manualSaves} manual`}
        />
        <Tile
          label="Re-opened"
          value={summary.reopens}
          color="secondary.main"
          hint="draft resumed"
        />
        <Tile
          label="IP addresses"
          value={summary.ips.length}
          color={summary.ips.length > 2 ? 'warning.main' : 'text.primary'}
        />
        <Tile label="Devices" value={summary.devices.length} />
      </Stack>

      <Stack spacing={0.5}>
        {summary.firstOpen && (
          <Typography variant="body2">
            <strong>First opened:</strong> {fDateTime(summary.firstOpen)}
            {summary.lastSeen && ` · last activity: ${fDateTime(summary.lastSeen)}`}
            {summary.submitted && ` · submitted: ${fDateTime(summary.submitted)}`}
          </Typography>
        )}
        {summary.locations.length > 0 && (
          <Typography variant="body2">
            <strong>Locations (approximate, from IP):</strong> {summary.locations.join(' | ')}
          </Typography>
        )}
        {summary.ips.length > 0 && (
          <Typography variant="body2">
            <strong>IP addresses:</strong> {summary.ips.join(', ')}
          </Typography>
        )}
        {summary.devices.length > 0 && (
          <Typography variant="body2">
            <strong>Browsers / devices:</strong> {summary.devices.join(' | ')}
          </Typography>
        )}
      </Stack>

      <TableContainer sx={{ maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150 }}>When</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Event</TableCell>
              <TableCell>Who</TableCell>
              <TableCell>IP address</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Browser / device</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No activity recorded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry, idx) => {
              const meta = AUDIT_LABELS[entry.action] || { label: entry.action, color: 'default' };
              return (
                <TableRow key={entry.id || idx} hover>
                  <TableCell>{fDateTime(entry.occurredAt)}</TableCell>
                  <TableCell>
                    <Label variant="soft" color={meta.color}>
                      {meta.label}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{entry.actorEmail || '—'}</Typography>
                  </TableCell>
                  <TableCell>{entry.ipAddress || '—'}</TableCell>
                  <TableCell>{locationOf(entry) || '—'}</TableCell>
                  <TableCell>
                    <Tooltip title={entry.userAgent || ''} placement="top-start">
                      <Box component="span">{deviceOf(entry) || '—'}</Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {detailOf(entry)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
