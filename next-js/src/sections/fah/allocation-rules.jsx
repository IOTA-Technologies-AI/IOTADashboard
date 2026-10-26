'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { fahError, useFahCatalog, saveAllocationRule, useAllocationRules } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';
import { ruleSummary } from './allocation-run';
import { today, DRIVER_BASIS, ALLOCATION_DRIVER, ALLOCATION_METHOD } from './fah-labels';

// ----------------------------------------------------------------------

/** The version in force today: the highest whose dates cover today. */
const inForce = (versions, on = today()) =>
  versions
    .filter((r) => r.effectiveFrom <= on && (!r.effectiveTo || r.effectiveTo >= on))
    .sort((a, b) => b.version - a.version)[0] ?? null;

/** Shared cost centres and how each is allocated, by version (§8.2, D-8). */
export function AllocationRules({ me }) {
  const { t, nameOf } = useFahT();
  const { costCentres } = useFahCatalog();
  const { rules, error, loading } = useAllocationRules();
  const [editing, setEditing] = useState(null); // { centre, rule }
  const [openId, setOpenId] = useState(null);

  const shared = costCentres.filter((c) => c.kind === 'SHARED');
  const versionsOf = (id) => rules.filter((r) => r.sourceCostCentreId === id);

  return (
    <Card>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="subtitle1">
          {t('rules.title', 'How shared costs are allocated')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'rules.help',
            'Centres are allocated in step-down order: a step-down centre also charges shared centres later in the order, by their own driver values. A change is saved as a new version from its date; months already allocated keep the version they used until re-run.'
          )}
        </Typography>
      </Box>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={48} />
            <TableCell>{t('rules.centre', 'Cost centre')}</TableCell>
            <TableCell align="center">{t('rules.order', 'Order')}</TableCell>
            <TableCell>{t('rules.rule', 'Rule in force today')}</TableCell>
            <TableCell>{t('rules.from', 'From')}</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {[...shared]
            .sort(
              (a, b) =>
                (inForce(versionsOf(a.id))?.stepDownOrder ?? 999) -
                  (inForce(versionsOf(b.id))?.stepDownOrder ?? 999) || a.code.localeCompare(b.code)
            )
            .map((c) => {
              const versions = versionsOf(c.id);
              const current = inForce(versions);
              const later = versions.filter((v) => v.effectiveFrom > today());
              return [
                <TableRow key={c.id} hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setOpenId(openId === c.id ? null : c.id)}
                      disabled={versions.length < 2 && !later.length}
                    >
                      <Iconify
                        icon={
                          openId === c.id
                            ? 'eva:arrow-ios-upward-fill'
                            : 'eva:arrow-ios-downward-fill'
                        }
                      />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{c.code}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nameOf(c)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{current?.stepDownOrder ?? '—'}</TableCell>
                  <TableCell>
                    {current ? (
                      <>
                        <Typography variant="body2">
                          {ruleSummary(t, { ...current, basis: current.driverBasis })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          v{current.version}
                          {current.targetPracticeIds?.length
                            ? ` · ${t('rules.someTargets', '{{n}} practices only', { n: current.targetPracticeIds.length })}`
                            : ''}
                        </Typography>
                      </>
                    ) : (
                      <Label variant="soft" color="warning">
                        {t('rules.none', 'No rule: not allocated')}
                      </Label>
                    )}
                    {later.length > 0 && (
                      <Label variant="soft" color="info" sx={{ ml: 1 }}>
                        {t('rules.upcoming', 'v{{v}} from {{date}}', {
                          v: later[0].version,
                          date: later[0].effectiveFrom,
                        })}
                      </Label>
                    )}
                  </TableCell>
                  <TableCell>{current?.effectiveFrom ?? ''}</TableCell>
                  <TableCell align="right">
                    {me.canControl && (
                      <Tooltip title={t('rules.edit', 'Change (new version)')}>
                        <IconButton onClick={() => setEditing({ centre: c, rule: current })}>
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>,
                <TableRow key={`${c.id}-v`}>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 0, borderBottom: openId === c.id ? undefined : 'none' }}
                  >
                    <Collapse in={openId === c.id} unmountOnExit>
                      <Stack spacing={0.5} sx={{ py: 1.5, pl: 6 }}>
                        {versions.map((v) => (
                          <Typography key={v.id} variant="body2" color="text.secondary">
                            <b>v{v.version}</b>{' '}
                            {t('rules.fromDate', 'from {{date}}', { date: v.effectiveFrom })}
                            {v.effectiveTo
                              ? ` ${t('rules.toDate', 'to {{date}}', { date: v.effectiveTo })}`
                              : ''}
                            {' · '}
                            {ruleSummary(t, { ...v, basis: v.driverBasis })}
                            {' · '}
                            {v.createdBy}
                            {v.note ? ` · ${v.note}` : ''}
                          </Typography>
                        ))}
                      </Stack>
                    </Collapse>
                  </TableCell>
                </TableRow>,
              ];
            })}
        </TableBody>
      </Table>

      <RuleDialog
        open={Boolean(editing)}
        centre={editing?.centre}
        rule={editing?.rule}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          const saved = await saveAllocationRule(input);
          toast.success(
            t('rules.saved', '{{code}} v{{v}} saved, from {{date}}', {
              code: editing.centre.code,
              v: saved.version,
              date: saved.effectiveFrom,
            })
          );
        }}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

const firstOfMonth = () => `${today().slice(0, 8)}01`;

/**
 * Edits a rule for one centre. `onSubmit(input)` saves it (Rules) or uses it
 * for a what-if; with `whatIf` there is no effective date.
 */
export function RuleDialog({ open, centre, rule, onClose, onSubmit, whatIf = false }) {
  const { t, nameOf } = useFahT();
  const { practices, accounts } = useFahCatalog();
  const targets = practices.filter((p) => p.isRevenueCentre && p.isActive);
  const statistical = accounts.filter((a) => a.class === 'STATISTICAL');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      method: rule?.method ?? 'STEP_DOWN',
      driver: rule?.driver ?? 'HEADCOUNT',
      driverAccountId: rule?.driverAccountId ?? '',
      driverBasis: rule?.driverBasis ?? 'CURRENT',
      targetPracticeIds: rule?.targetPracticeIds ?? [],
      fixed: Object.fromEntries(
        (rule?.fixedPercentages ?? []).map((f) => [f.practiceId, f.percent])
      ),
      stepDownOrder: rule?.stepDownOrder ?? 99,
      effectiveFrom: firstOfMonth(),
      note: '',
    });
  }, [open, rule]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const usesDriver = ['DRIVER', 'STEP_DOWN'].includes(form.method);
  const fixedTotal = Object.values(form.fixed).reduce((a, b) => a + (Number(b) || 0), 0);

  const handleSubmit = async () => {
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        sourceCostCentreId: centre.id,
        method: form.method,
        driver: usesDriver ? form.driver : null,
        driverAccountId: usesDriver && form.driver === 'CUSTOM' ? form.driverAccountId : null,
        driverBasis: form.driverBasis,
        targetPracticeIds:
          usesDriver && form.targetPracticeIds.length ? form.targetPracticeIds : null,
        fixedPercentages:
          form.method === 'FIXED_PERCENT'
            ? Object.entries(form.fixed)
                .filter(([, v]) => Number(v) > 0)
                .map(([practiceId, percent]) => ({ practiceId, percent: Number(percent) }))
            : null,
        stepDownOrder: Number(form.stepDownOrder),
        effectiveFrom: whatIf ? '' : form.effectiveFrom,
        note: form.note,
      });
      onClose();
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        {whatIf
          ? t('rules.whatIfTitle', 'Try another rule for {{code}}', { code: centre?.code })
          : t('rules.editTitle', 'New version of {{code}}', { code: centre?.code })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label={t('rules.method', 'Method')}
            value={form.method}
            onChange={(e) => set({ method: e.target.value })}
            helperText={ALLOCATION_METHOD[form.method]?.help}
          >
            {Object.entries(ALLOCATION_METHOD).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {t(`alloc.method.${k}`, v.label)}
              </MenuItem>
            ))}
          </TextField>

          {usesDriver && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('rules.driver', 'Driver')}
                value={form.driver}
                onChange={(e) => set({ driver: e.target.value })}
              >
                {Object.entries(ALLOCATION_DRIVER).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {t(`alloc.driver.${k}`, v.label)}
                    {v.account ? ` (${v.account})` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label={t('rules.basis', 'Measured over')}
                value={form.driverBasis}
                onChange={(e) => set({ driverBasis: e.target.value })}
              >
                {Object.entries(DRIVER_BASIS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {t(`alloc.basis.${k}`, v)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {usesDriver && form.driver === 'CUSTOM' && (
            <TextField
              select
              size="small"
              label={t('rules.driverAccount', 'Statistical account')}
              value={form.driverAccountId}
              onChange={(e) => set({ driverAccountId: e.target.value })}
            >
              {statistical.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.code} {nameOf(a)}
                </MenuItem>
              ))}
            </TextField>
          )}

          {usesDriver && (
            <TextField
              select
              size="small"
              label={t('rules.targets', 'Charge these practices')}
              value={form.targetPracticeIds}
              onChange={(e) => set({ targetPracticeIds: e.target.value })}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (ids) =>
                  ids.length
                    ? ids.map((id) => targets.find((p) => p.id === id)?.code).join(', ')
                    : t('rules.allPractices', 'Every practice'),
              }}
              InputLabelProps={{ shrink: true }}
            >
              {targets.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
            </TextField>
          )}

          {form.method === 'FIXED_PERCENT' && (
            <Stack spacing={1.5}>
              {targets.map((p) => (
                <TextField
                  key={p.id}
                  size="small"
                  type="number"
                  label={`${nameOf(p)} %`}
                  value={form.fixed[p.id] ?? ''}
                  onChange={(e) => set({ fixed: { ...form.fixed, [p.id]: e.target.value } })}
                  inputProps={{ min: 0, max: 100, step: 'any' }}
                />
              ))}
              <Typography
                variant="caption"
                color={Math.abs(fixedTotal - 100) > 0.01 ? 'error.main' : 'text.secondary'}
              >
                {t('rules.fixedTotal', 'Total {{n}} % (must be 100 %)', {
                  n: Math.round(fixedTotal * 100) / 100,
                })}
              </Typography>
            </Stack>
          )}

          {form.method !== 'DIRECT' && (
            <TextField
              size="small"
              type="number"
              label={t('rules.order', 'Step-down order')}
              value={form.stepDownOrder}
              onChange={(e) => set({ stepDownOrder: e.target.value })}
              helperText={t(
                'rules.orderHelp',
                'Lower goes first. Offices 1, IT 2, HR 3, Finance 4, Legal 5, Management 6, Sales 7.'
              )}
            />
          )}

          {!whatIf && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small"
                type="date"
                label={t('rules.effectiveFrom', 'Applies from')}
                value={form.effectiveFrom}
                onChange={(e) => set({ effectiveFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
              />
              <TextField
                fullWidth
                size="small"
                label={t('rules.why', 'Why')}
                value={form.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} onClick={handleSubmit}>
          {whatIf ? t('rules.try', 'Compare') : t('rules.save', 'Save new version')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
