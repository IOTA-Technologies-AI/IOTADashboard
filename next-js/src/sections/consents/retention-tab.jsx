'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fNumber } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';

import {
  apiMessage,
  runRetention,
  useRetention,
  saveRetention,
  useRetentionDue,
} from 'src/actions/consents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const PERIODS = [
  { key: 'enquiryMonths', label: 'Website enquiries', unit: 'months after the last contact' },
  { key: 'applicantMonths', label: 'Applicants not hired', unit: 'months after the decision' },
  {
    key: 'intakeMonths',
    label: 'Candidate intake (did not join)',
    unit: 'months after submission',
  },
  { key: 'withdrawnDays', label: 'After consent is withdrawn', unit: 'days' },
  { key: 'deadLetterDays', label: 'Website submissions that were not leads', unit: 'days' },
  { key: 'proofYears', label: 'Proof of consent after deletion', unit: 'years' },
  {
    key: 'cookieChoiceMonths',
    label: 'Cookie-banner choices',
    unit: 'months (deleted by the iota-consent function)',
  },
];

const ACTION = {
  deleted: 'Deleted',
  resume_deleted: 'Résumé deleted',
  proof_deleted: 'Proof deleted',
};

function DueDialog({ rule, onClose }) {
  const { items, error, loading } = useRetentionDue(rule?.id);
  return (
    <Dialog open={!!rule} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{rule?.label}: due now</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent dividers>
        {error ? <Alert severity="error">{apiMessage(error, 'Could not list them.')}</Alert> : null}
        {!loading && !items.length ? (
          <Typography variant="body2" color="text.secondary">
            Nothing is due under this rule.
          </Typography>
        ) : null}
        {items.length ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Record</TableCell>
                  <TableCell>Person</TableCell>
                  <TableCell>Counted from</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={`${i.register}-${i.sourceId}`}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {i.register} #{String(i.sourceId).slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{i.name || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.email || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{i.since ? fDate(i.since) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Up to 100 shown. Converted leads and hired applicants are never deleted by these rules.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * How long personal data is kept, what is due for deletion, and what was
 * deleted. Nothing is deleted until a Super Admin turns retention on.
 */
export function RetentionTab() {
  const { retention, error, loading } = useRetention();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'enable' | 'disable' | 'run'
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);

  const cfg = retention?.config;
  const canEdit = !!retention?.canEdit;

  useEffect(() => {
    if (cfg) setForm(Object.fromEntries(PERIODS.map((p) => [p.key, cfg[p.key]])));
  }, [cfg]);

  const dirty = cfg && PERIODS.some((p) => Number(form[p.key]) !== cfg[p.key]);

  const savePeriods = async () => {
    setSaving(true);
    try {
      await saveRetention(Object.fromEntries(PERIODS.map((p) => [p.key, Number(form[p.key])])));
      toast.success('Retention periods saved. Update the website Privacy Notice to match.');
    } catch (err) {
      toast.error(apiMessage(err, 'The periods could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'run') {
        const res = await runRetention();
        const n = Object.values(res.deleted || {}).reduce((a, b) => a + b, 0);
        const f = Object.values(res.failed || {}).reduce((a, b) => a + b, 0);
        toast.success(
          `Retention ran: ${n} record${n === 1 ? '' : 's'} deleted${f ? `, ${f} failed` : ''}.`
        );
      } else {
        await saveRetention({ enabled: confirm === 'enable' });
        toast.success(confirm === 'enable' ? 'Retention is on.' : 'Retention is off.');
      }
      setConfirm(null);
    } catch (err) {
      toast.error(apiMessage(err, 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !retention) return <LinearProgress />;
  if (error)
    return <Alert severity="error">{apiMessage(error, 'Retention could not be loaded.')}</Alert>;
  if (!retention) return null;

  const dueNow = retention.rules.reduce((a, r) => a + r.dueNow, 0);

  return (
    <Stack spacing={3}>
      <Alert
        severity={cfg.enabled ? 'success' : 'warning'}
        action={
          canEdit ? (
            <Stack direction="row" spacing={1}>
              {cfg.enabled ? (
                <Button color="inherit" size="small" onClick={() => setConfirm('run')}>
                  Run now
                </Button>
              ) : null}
              <FormControlLabel
                control={
                  <Switch
                    checked={cfg.enabled}
                    onChange={() => setConfirm(cfg.enabled ? 'disable' : 'enable')}
                  />
                }
                label={cfg.enabled ? 'On' : 'Off'}
              />
            </Stack>
          ) : null
        }
      >
        {cfg.enabled
          ? 'Retention is on: every night at 02:45 UTC, personal data past its period is deleted. A proof of each consent is kept, without the name or email.'
          : `Retention is off: nothing is deleted. ${fNumber(dueNow) || 0} record${dueNow === 1 ? '' : 's'} would be deleted now — check them below before a Super Admin turns it on.`}
      </Alert>

      <Card>
        <CardHeader
          title="What is due"
          subheader="Converted leads and hired applicants are never deleted by these rules."
        />
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rule</TableCell>
                <TableCell>Kept for</TableCell>
                <TableCell align="right">Due now</TableCell>
                <TableCell align="right">Due within 30 days</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {retention.rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell align="right">
                    {r.dueNow ? <Label color="warning">{fNumber(r.dueNow)}</Label> : 0}
                  </TableCell>
                  <TableCell align="right">{fNumber(r.dueIn30Days) || 0}</TableCell>
                  <TableCell align="right">
                    {r.dueNow && r.id !== 'proofs_expired' && r.id !== 'dead_letters' ? (
                      <Button size="small" onClick={() => setViewing(r)}>
                        View
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ pb: 1 }} />
      </Card>

      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1">Periods</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {canEdit
            ? 'Super Admins can change these. The website Privacy Notice (section 7, Retention) states them, so change it at the same time.'
            : 'Only Super Admins can change these.'}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          {PERIODS.map((p) => (
            <TextField
              key={p.key}
              size="small"
              type="number"
              label={p.label}
              value={form[p.key] ?? ''}
              onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
              disabled={!canEdit}
              helperText={p.unit}
            />
          ))}
        </Box>
        {canEdit ? (
          <LoadingButton
            variant="contained"
            loading={saving}
            disabled={!dirty}
            onClick={savePeriods}
            sx={{ mt: 2.5 }}
          >
            Save periods
          </LoadingButton>
        ) : null}
        {cfg.changedBy ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Last changed by {cfg.changedBy}
            {cfg.changedAt ? ` on ${fDateTime(cfg.changedAt)}` : ''}
          </Typography>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Deleted"
          subheader={`${fNumber(retention.logTotal) || 0} deletions recorded. The log holds no personal data.`}
        />
        {retention.log.length ? (
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Rule</TableCell>
                  <TableCell>Record</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {retention.log.map((e, i) => (
                  <TableRow key={`${e.ranAt}-${e.sourceId}-${e.action}-${i}`}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(e.ranAt)}</TableCell>
                    <TableCell>
                      {retention.rules.find((r) => r.id === e.rule)?.label || e.rule}
                    </TableCell>
                    <TableCell>
                      {e.register} #{String(e.sourceId).slice(0, 8)}
                    </TableCell>
                    <TableCell>{ACTION[e.action] || e.action}</TableCell>
                    <TableCell>{e.actor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 3 }}>
            Nothing deleted yet.
          </Typography>
        )}
      </Card>

      <DueDialog rule={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => (busy ? null : setConfirm(null))}
        title={
          confirm === 'enable'
            ? 'Turn on retention?'
            : confirm === 'disable'
              ? 'Turn off retention?'
              : 'Run retention now?'
        }
        content={
          confirm === 'disable'
            ? 'The nightly job will stop deleting. Data past its period will be kept until it is turned on again.'
            : `${fNumber(dueNow) || 0} record${dueNow === 1 ? '' : 's'} past their period will be permanently deleted${confirm === 'enable' ? ' tonight, and more every night after' : ' now'}. Only a proof of each consent is kept. This cannot be undone.`
        }
        action={
          <LoadingButton
            variant="contained"
            color={confirm === 'disable' ? 'inherit' : 'error'}
            loading={busy}
            onClick={confirmAction}
          >
            {confirm === 'enable' ? 'Turn on' : confirm === 'disable' ? 'Turn off' : 'Delete now'}
          </LoadingButton>
        }
      />
    </Stack>
  );
}
