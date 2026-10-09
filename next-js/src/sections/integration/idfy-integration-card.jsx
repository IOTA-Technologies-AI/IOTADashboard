'use client';

import useSWR from 'swr';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
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
  getIdfyStatus,
  setIdfyCredits,
  setIdfyAutoRun,
  setIdfyCredentials,
  testIdfyConnection,
} from 'src/actions/idfy';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATE = {
  ok: { label: 'Healthy', color: 'success' },
  low: { label: 'Running low', color: 'warning' },
  empty: { label: 'Used up', color: 'error' },
  unknown: { label: 'Balance not recorded', color: 'default' },
};

const AUTO_CHECKS = [
  { value: 'aml', label: 'AML screening (sanctions, PEP, adverse media)' },
  { value: 'intl_passport', label: 'Passport (International)' },
];

const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

function Stat({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" color={color}>
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

function CredentialsDialog({ product, status, onClose }) {
  const cur = product === 'bgv' ? status.bgv : status.eve;
  const [form, setForm] = useState({
    apiKey: '',
    accountId: status.eve.accountId,
    companyId: status.bgv.companyId,
    packageId: status.bgv.packageId,
    baseUrl: cur.baseUrl,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await setIdfyCredentials(
        product === 'bgv'
          ? {
              product,
              apiKey: form.apiKey,
              companyId: form.companyId,
              packageId: form.packageId,
              baseUrl: form.baseUrl,
            }
          : { product, apiKey: form.apiKey, accountId: form.accountId, baseUrl: form.baseUrl }
      );
      toast.success('IDfy credentials saved.');
      onClose(true);
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product === 'bgv'
          ? 'IDfy Background Verification credentials'
          : 'IDfy EVE credentials (identity & AML)'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="API key"
            type="password"
            autoComplete="new-password"
            value={form.apiKey}
            onChange={set('apiKey')}
            helperText={
              cur.apiKeyHint
                ? `Saved key ends ${cur.apiKeyHint}. Leave empty to keep it.`
                : 'No key saved yet.'
            }
          />
          {product === 'bgv' ? (
            <>
              <TextField label="Company ID" value={form.companyId} onChange={set('companyId')} />
              <TextField
                label="Package ID (optional)"
                value={form.packageId}
                onChange={set('packageId')}
              />
            </>
          ) : (
            <TextField label="Account ID" value={form.accountId} onChange={set('accountId')} />
          )}
          <TextField label="Base URL" value={form.baseUrl} onChange={set('baseUrl')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={saving} onClick={save}>
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function BalanceDialog({ credits, onClose }) {
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setIdfyCredits({ balance: Number(balance), note });
      toast.success('Balance recorded. Checks sent from now on are deducted from it.');
      onClose(true);
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Record the IDfy balance</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Sign in to{' '}
            <Link href="https://plans.idfy.com" target="_blank" rel="noopener">
              plans.idfy.com
            </Link>{' '}
            and enter the credits it shows now, for example after a top-up. The estimate restarts
            from this figure and the low-balance alerts are re-armed.
          </Typography>
          <TextField
            autoFocus
            type="number"
            label="Credits available now"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            inputProps={{ min: 0, step: 'any' }}
          />
          <TextField
            label="Note (optional)"
            placeholder="e.g. Topped up 1,000 credits, invoice INV-123"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={saving}
          disabled={balance === '' || Number(balance) < 0}
          onClick={save}
        >
          Record balance
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function RatesDialog({ status, onClose }) {
  const c = status.credits;
  const [lowThreshold, setLowThreshold] = useState(String(c.lowThreshold));
  const [defaultCost, setDefaultCost] = useState(String(c.defaultCost));
  const [costs, setCosts] = useState(
    Object.fromEntries(Object.entries(c.costs || {}).map(([k, v]) => [k, String(v)]))
  );
  const [alertEmails, setAlertEmails] = useState(c.alertEmails || []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setIdfyCredits({
        lowThreshold: Number(lowThreshold),
        defaultCost: Number(defaultCost),
        // A blank rate falls back to the default rate.
        costs: Object.fromEntries(
          Object.entries(costs)
            .filter(([, v]) => v !== '' && Number(v) >= 0)
            .map(([k, v]) => [k, Number(v)])
        ),
        alertEmails,
      });
      toast.success('Rates and alerts saved.');
      onClose(true);
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Credit rates and alerts</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="number"
              label="Warn when credits fall to"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
            />
            <TextField
              fullWidth
              type="number"
              label="Default credits per check"
              value={defaultCost}
              onChange={(e) => setDefaultCost(e.target.value)}
            />
          </Stack>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={alertEmails}
            onChange={(_, v) => setAlertEmails(v.map((e) => String(e).trim().toLowerCase()))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Email the low-balance alert to"
                placeholder="Type an address and press Enter"
                helperText="Super Admins are emailed when this is empty."
              />
            )}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Credits per check (from your IDfy plan; blank uses the default)
            </Typography>
            <Grid container spacing={1.5}>
              {status.checkTypes.map((t) => (
                <Grid key={t.taskType} size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t.label}
                    placeholder={String(defaultCost)}
                    value={costs[t.taskType] ?? ''}
                    onChange={(e) => setCosts((cur) => ({ ...cur, [t.taskType]: e.target.value }))}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={saving} onClick={save}>
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/**
 * IDfy on the Integrations page: credit estimate, automatic vetting switch and
 * credentials. IDfy has no balance API, so the remaining credits are the
 * recorded balance minus the checks IOTA has sent since.
 */
export function IdfyIntegrationCard() {
  const {
    data: status,
    error,
    isLoading,
    mutate,
  } = useSWR('idfy/status', getIdfyStatus, {
    shouldRetryOnError: false,
  });
  const [dialog, setDialog] = useState(null); // 'eve' | 'bgv' | 'balance' | 'rates'
  const [testing, setTesting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // No access to IDfy settings: leave the card out rather than show an error.
  if (error?.response?.status === 403) return null;

  const close = (changed) => {
    setDialog(null);
    if (changed) mutate();
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const r = await testIdfyConnection();
      toast[r.ok ? 'success' : 'error'](r.message);
    } catch (err) {
      toast.error(message(err, 'The test failed.'));
    } finally {
      setTesting(false);
    }
  };

  const saveAutoRun = async (enabled, checks) => {
    setAutoSaving(true);
    try {
      await setIdfyAutoRun(enabled, checks);
      await mutate();
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setAutoSaving(false);
    }
  };

  const c = status?.credits;
  const canEdit = !!status?.canEdit;

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.lighter',
              color: 'primary.main',
            }}
          >
            <Iconify icon="solar:shield-check-bold" width={26} />
          </Box>
          <Box>
            <Typography variant="h6">IDfy — employee vetting</Typography>
            <Typography variant="body2" color="text.secondary">
              Identity, passport and AML background checks
            </Typography>
          </Box>
        </Stack>
        {status ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Label variant="soft" color={status.eve.configured ? 'success' : 'error'}>
              EVE {status.eve.configured ? 'connected' : 'not set up'}
            </Label>
            <Label variant="soft" color={status.bgv.configured ? 'success' : 'default'}>
              BGV {status.bgv.configured ? 'connected' : 'not set up'}
            </Label>
            <LoadingButton
              size="small"
              variant="outlined"
              loading={testing}
              disabled={!status.eve.configured}
              onClick={runTest}
            >
              Test
            </LoadingButton>
          </Stack>
        ) : null}
      </Stack>

      {isLoading ? <LinearProgress /> : null}
      {error && error?.response?.status !== 403 ? (
        <Alert severity="error">{message(error, 'The IDfy settings could not be loaded.')}</Alert>
      ) : null}

      {status ? (
        <Stack spacing={3}>
          {/* Credits */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1">Credits</Typography>
                <Label variant="soft" color={STATE[c.state]?.color}>
                  {STATE[c.state]?.label}
                </Label>
              </Stack>
              {canEdit ? (
                <Stack direction="row" spacing={1}>
                  <Button size="small" color="inherit" onClick={() => setDialog('rates')}>
                    Rates & alerts
                  </Button>
                  <Button size="small" variant="contained" onClick={() => setDialog('balance')}>
                    Record balance
                  </Button>
                </Stack>
              ) : null}
            </Stack>

            {c.state === 'unknown' ? (
              <Alert severity="info">
                IDfy has no API for the remaining balance. Record the balance shown on{' '}
                <Link href="https://plans.idfy.com" target="_blank" rel="noopener">
                  plans.idfy.com
                </Link>{' '}
                and every check sent from the dashboard is deducted from it, with an email when it
                runs low.
              </Alert>
            ) : (
              <>
                {['low', 'empty'].includes(c.state) ? (
                  <Alert severity={c.state === 'empty' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {c.state === 'empty'
                      ? 'Credits are estimated to be used up. Top up now — vettings will stop completing.'
                      : `Credits are running low. Top up at plans.idfy.com, then record the new balance.`}
                  </Alert>
                ) : null}
                <Stack direction="row" flexWrap="wrap" gap={4}>
                  <Stat
                    label="Estimated remaining"
                    value={c.estimatedRemaining}
                    color={c.state === 'ok' ? 'success.main' : `${STATE[c.state]?.color}.main`}
                  />
                  <Stat label="Recorded balance" value={c.balance} />
                  <Stat label={`Used since (${c.checksSinceRecorded} checks)`} value={c.used} />
                  <Stat label="Used in the last 30 days" value={c.last30Days} />
                  <Stat
                    label="Lasts about"
                    value={c.daysLeft === null ? '—' : `${c.daysLeft} days`}
                  />
                  <Stat label="Warn at" value={c.lowThreshold} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Balance recorded {fDateTime(c.recordedAt)} by {c.recordedBy}
                  {c.note ? ` — ${c.note}` : ''}. An estimate: checks run outside the dashboard are
                  not counted, so record the portal balance after each top-up.
                </Typography>
                {c.usage?.length ? (
                  <Table size="small" sx={{ mt: 1.5 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Check</TableCell>
                        <TableCell align="right">Checks sent</TableCell>
                        <TableCell align="right">Credits</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {c.usage.map((u) => (
                        <TableRow key={u.taskType}>
                          <TableCell>{u.label}</TableCell>
                          <TableCell align="right">{u.checks}</TableCell>
                          <TableCell align="right">{u.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </>
            )}
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* Automatic vetting */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1">Automatic vetting on onboarding</Typography>
                <Typography variant="body2" color="text.secondary">
                  Runs these paid checks as soon as an employee submits the onboarding form. When
                  off, they are prepared as drafts for HR to run.
                </Typography>
              </Box>
              <Switch
                checked={status.autoRun.enabled}
                disabled={!canEdit || autoSaving}
                onChange={(e) => saveAutoRun(e.target.checked, status.autoRun.checks)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              {AUTO_CHECKS.map((a) => (
                <FormControlLabel
                  key={a.value}
                  label={a.label}
                  control={
                    <Checkbox
                      checked={status.autoRun.checks.includes(a.value)}
                      disabled={!canEdit || autoSaving || !status.autoRun.enabled}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...status.autoRun.checks, a.value]
                          : status.autoRun.checks.filter((x) => x !== a.value);
                        saveAutoRun(true, next);
                      }}
                    />
                  }
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* Credentials */}
          <Grid container spacing={2}>
            {[
              {
                key: 'eve',
                title: 'EVE — identity & AML',
                lines: [
                  ['Account ID', status.eve.accountId || '—'],
                  ['API key', status.eve.apiKeyHint || '—'],
                  ['Base URL', status.eve.baseUrl],
                ],
              },
              {
                key: 'bgv',
                title: 'BGV — employment, education, address',
                lines: [
                  ['Company ID', status.bgv.companyId || '—'],
                  ['API key', status.bgv.apiKeyHint || '—'],
                  ['Base URL', status.bgv.baseUrl],
                ],
              },
            ].map((p) => (
              <Grid key={p.key} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">{p.title}</Typography>
                    {canEdit ? (
                      <Button
                        size="small"
                        startIcon={<Iconify icon="solar:pen-bold" />}
                        onClick={() => setDialog(p.key)}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </Stack>
                  {p.lines.map(([k, v]) => (
                    <Stack key={k} direction="row" spacing={1}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
                        {k}
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {v}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Grid>
            ))}
          </Grid>

          {!canEdit ? (
            <Typography variant="caption" color="text.secondary">
              Only a Super Admin can change the IDfy settings.
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {status && (dialog === 'eve' || dialog === 'bgv') ? (
        <CredentialsDialog product={dialog} status={status} onClose={close} />
      ) : null}
      {status && dialog === 'balance' ? <BalanceDialog credits={c} onClose={close} /> : null}
      {status && dialog === 'rates' ? <RatesDialog status={status} onClose={close} /> : null}
    </Card>
  );
}
