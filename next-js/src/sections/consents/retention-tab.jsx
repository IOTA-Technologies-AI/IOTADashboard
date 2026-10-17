'use client';

import { useState, Fragment, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fNumber } from 'src/utils/format-number';
import { fDate, fTime, fDateTime } from 'src/utils/format-time';

import {
  apiMessage,
  runRetention,
  useRetention,
  saveRetention,
  useRetentionDue,
} from 'src/actions/consents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { RetentionQueue } from './retention-queue';

// ----------------------------------------------------------------------

const PERIODS = [
  {
    key: 'graceDays',
    label: 'Undo window before deletion',
    unit: 'days a queued record waits before it is deleted',
  },
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

// Rules whose records carry no name or email: there is nobody to preview.
const NO_PREVIEW = new Set(['dead_letters', 'proofs_expired']);

const ACTION = {
  deleted: 'Deleted',
  resume_deleted: 'Résumé deleted',
  proof_deleted: 'Proof deleted',
};

const CONFIRM_WORD = 'DELETE';

const ACTIONS = [
  { value: 'list', label: 'Only list', hint: 'Shown here; nothing happens' },
  { value: 'flag', label: 'Flag for review', hint: 'HR keeps or deletes each one' },
  { value: 'delete', label: 'Delete', hint: 'After the undo window, unless kept' },
];
const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.value, a.label]));

const CONFIRM_TITLE = {
  enable: 'Turn on retention?',
  disable: 'Turn off retention?',
  run: 'Run retention now?',
};
const CONFIRM_BUTTON = { enable: 'Turn on', disable: 'Turn off', run: 'Run now' };

/** The nightly run's next start, 02:45 UTC, in the viewer's time. */
function nextRun() {
  const now = new Date();
  const run = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 45));
  if (run <= now) run.setUTCDate(run.getUTCDate() + 1);
  return run;
}

/** Who a rule would delete now — shown under the rule, before anything is turned on. */
function DuePreview({ rule }) {
  const { items, error, loading } = useRetentionDue(rule.id);
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity="error">{apiMessage(error, 'Could not list them.')}</Alert> : null}
      {items.length ? (
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Person</TableCell>
                <TableCell>Record</TableCell>
                <TableCell>Counted from</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((i) => (
                <TableRow key={`${i.register}-${i.sourceId}`}>
                  <TableCell>
                    <Typography variant="body2">{i.name || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {i.email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {i.register} #{String(i.sourceId).slice(0, 8)}
                  </TableCell>
                  <TableCell>{i.since ? fDate(i.since) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {items.length >= 100 ? 'The first 100 shown. ' : ''}Not yet queued. With retention on, the
        next run queues them according to this rule&apos;s action.
      </Typography>
    </Box>
  );
}

/**
 * How long personal data is kept, what is due for deletion, and what was
 * deleted. Nothing is deleted until a Super Admin turns retention on — after
 * checking, rule by rule, exactly who would go.
 */
export function RetentionTab() {
  const { retention, error, loading } = useRetention();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'enable' | 'disable' | 'run'
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null); // rule id whose preview is expanded

  const cfg = retention?.config;
  const canEdit = !!retention?.canEdit;

  useEffect(() => {
    if (cfg) setForm(Object.fromEntries(PERIODS.map((p) => [p.key, cfg[p.key]])));
  }, [cfg]);

  const dirty = cfg && PERIODS.some((p) => Number(form[p.key]) !== cfg[p.key]);

  const ask = (what) => {
    setTyped('');
    setConfirm(what);
  };

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

  const [savingRule, setSavingRule] = useState(null);
  const setAction = async (rule, action) => {
    setSavingRule(rule);
    try {
      await saveRetention({ actions: { [rule]: action } });
      toast.success(
        `${retention.rules.find((r) => r.id === rule)?.label}: ${ACTION_LABEL[action]}.`
      );
    } catch (err) {
      toast.error(apiMessage(err, 'The action could not be saved.'));
    } finally {
      setSavingRule(null);
    }
  };

  const confirmAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'run') {
        const res = await runRetention();
        const sum = (m) => Object.values(m || {}).reduce((a, b) => a + b, 0);
        const [q, n, f] = [sum(res.queued), sum(res.deleted), sum(res.failed)];
        toast.success(
          `Retention ran: ${q} queued, ${n} deleted${res.cancelled ? `, ${res.cancelled} no longer due` : ''}${f ? `, ${f} failed` : ''}.`
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
  if (error) {
    return <Alert severity="error">{apiMessage(error, 'Retention could not be loaded.')}</Alert>;
  }
  if (!retention) return null;

  const dueNow = retention.rules.reduce((a, r) => a + r.dueNow, 0);
  const acting = retention.rules.filter((r) => r.action !== 'list');
  const toQueue = acting.reduce((a, r) => a + r.dueNow, 0);
  const toDelete = acting.filter((r) => r.action === 'delete').reduce((a, r) => a + r.dueNow, 0);
  const { queue } = retention;
  const firstDeletion = new Date(nextRun().getTime() + cfg.graceDays * 86400000);
  const ruleLabel = (id) => retention.rules.find((r) => r.id === id)?.label || id;
  const destructive = confirm === 'enable' || confirm === 'run';
  const confirmed = !destructive || typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Stack spacing={3}>
      <Alert
        severity={cfg.enabled ? 'success' : 'warning'}
        action={
          canEdit ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {cfg.enabled ? (
                <LoadingButton color="inherit" size="small" onClick={() => ask('run')}>
                  Run now
                </LoadingButton>
              ) : null}
              <FormControlLabel
                control={
                  <Switch
                    checked={cfg.enabled}
                    onChange={() => ask(cfg.enabled ? 'disable' : 'enable')}
                  />
                }
                label={cfg.enabled ? 'On' : 'Off'}
              />
            </Stack>
          ) : null
        }
      >
        {cfg.enabled
          ? `Retention is on: every night at ${fTime(nextRun())}, records past their period are queued, and queued records whose ${cfg.graceDays}-day undo window has ended are deleted. ${queue.nextDeletionAt ? `Next deletion: ${fDateTime(queue.nextDeletionAt)}.` : 'Nothing is waiting to be deleted.'}`
          : `Retention is off: nothing is queued or deleted. ${fNumber(dueNow) || 0} record${dueNow === 1 ? ' is' : 's are'} past their period now — open a rule below to see who, and choose each rule's action before a Super Admin turns it on.`}
      </Alert>

      <Card>
        <CardHeader
          title="Rules"
          subheader="Open a rule to see exactly who it would delete. Converted leads and hired applicants are never deleted by these rules."
        />
        <TableContainer sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Rule</TableCell>
                <TableCell>Kept for</TableCell>
                <TableCell>Action</TableCell>
                <TableCell align="right">Due now</TableCell>
                <TableCell align="right">Due within 30 days</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {retention.rules.map((r) => {
                const canPreview = r.dueNow > 0 && !NO_PREVIEW.has(r.id);
                const expanded = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <TableRow
                      hover={canPreview}
                      onClick={canPreview ? () => setOpen(expanded ? null : r.id) : undefined}
                      sx={{
                        cursor: canPreview ? 'pointer' : 'default',
                        '& > td': { borderBottom: expanded ? 'none' : undefined },
                      }}
                    >
                      <TableCell padding="checkbox">
                        {canPreview ? (
                          <IconButton
                            size="small"
                            aria-label={
                              expanded
                                ? `Hide who ${r.label} would delete`
                                : `Show who ${r.label} would delete`
                            }
                            aria-expanded={expanded}
                          >
                            <Iconify
                              icon={
                                expanded
                                  ? 'eva:arrow-ios-downward-fill'
                                  : 'eva:arrow-ios-forward-fill'
                              }
                            />
                          </IconButton>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.label}</TableCell>
                      <TableCell>{r.period}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ minWidth: 170 }}>
                        {canEdit ? (
                          <TextField
                            select
                            size="small"
                            value={r.action}
                            disabled={savingRule === r.id}
                            onChange={(e) => setAction(r.id, e.target.value)}
                            sx={{ minWidth: 160 }}
                            slotProps={{ select: { renderValue: (v) => ACTION_LABEL[v] } }}
                          >
                            {ACTIONS.map((a) => (
                              <MenuItem key={a.value} value={a.value}>
                                <Stack>
                                  <Typography variant="body2">{a.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {a.hint}
                                  </Typography>
                                </Stack>
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <Label
                            color={
                              r.action === 'delete'
                                ? 'error'
                                : r.action === 'flag'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {ACTION_LABEL[r.action]}
                          </Label>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {r.dueNow ? <Label color="warning">{fNumber(r.dueNow)}</Label> : 0}
                      </TableCell>
                      <TableCell align="right">{fNumber(r.dueIn30Days) || 0}</TableCell>
                    </TableRow>
                    {canPreview ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0 }}>
                          <Collapse in={expanded} unmountOnExit>
                            <DuePreview rule={r} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ pb: 1 }} />
      </Card>

      <RetentionQueue counts={queue} ruleLabel={ruleLabel} />

      {canEdit ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="subtitle1">Periods</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            The website Privacy Notice (section 7, Retention) states these, so change it at the same
            time.
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
                helperText={p.unit}
              />
            ))}
          </Box>
          <LoadingButton
            variant="contained"
            loading={saving}
            disabled={!dirty}
            onClick={savePeriods}
            sx={{ mt: 2.5 }}
          >
            Save periods
          </LoadingButton>
          {cfg.changedBy ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Last changed by {cfg.changedBy}
              {cfg.changedAt ? ` on ${fDateTime(cfg.changedAt)}` : ''}
            </Typography>
          ) : null}
        </Card>
      ) : (
        <Card sx={{ p: 3 }}>
          <Typography variant="subtitle1">How long is personal data kept?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The same periods the website Privacy Notice states. Only Super Admins can change them.
          </Typography>
          <Stack spacing={1.5} sx={{ pl: 2, borderLeft: 3, borderColor: 'divider' }}>
            {PERIODS.map((p) => (
              <Box key={p.key}>
                <Typography variant="subtitle2">{p.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {cfg[p.key]} {p.unit}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>
      )}

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

      <ConfirmDialog
        open={!!confirm}
        onClose={() => (busy ? null : setConfirm(null))}
        title={CONFIRM_TITLE[confirm]}
        content={
          confirm === 'disable' ? (
            'The nightly job stops: nothing more is queued or deleted, including records already waiting for deletion. They stay in the queue until it is turned on again.'
          ) : (
            <Stack spacing={2}>
              <Alert severity="warning" icon={<Iconify icon="solar:danger-triangle-bold" />}>
                {confirm === 'enable' ? (
                  <>
                    At the first run, <strong>{fDateTime(nextRun())}</strong>,{' '}
                    <strong>{fNumber(toQueue) || 0}</strong> record{toQueue === 1 ? '' : 's'} will
                    be queued
                    {toDelete ? (
                      <>
                        {' '}
                        — <strong>{fNumber(toDelete)}</strong> of them for deletion on{' '}
                        <strong>{fDate(firstDeletion)}</strong> unless someone keeps them first
                      </>
                    ) : null}
                    . From then on this runs every night.
                  </>
                ) : (
                  <>
                    Records past their period are queued now, and the{' '}
                    <strong>{fNumber(queue.pending) || 0}</strong> waiting for deletion are deleted
                    if their undo window has ended.
                  </>
                )}{' '}
                Deletion is permanent; only a proof of each consent is kept, without the name or
                email.
              </Alert>
              <TextField
                size="small"
                autoFocus
                label={`Type ${CONFIRM_WORD} to confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </Stack>
          )
        }
        action={
          <LoadingButton
            variant="contained"
            color={destructive ? 'error' : 'inherit'}
            loading={busy}
            disabled={!confirmed}
            onClick={confirmAction}
          >
            {CONFIRM_BUTTON[confirm]}
          </LoadingButton>
        }
      />
    </Stack>
  );
}
