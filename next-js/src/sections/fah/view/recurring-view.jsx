'use client';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  useFahCatalog,
  useErpCustomers,
  setRecurringStatus,
  usePendingReversals,
  runRecurringJournals,
  useRecurringJournals,
  createRecurringJournal,
  approveRecurringJournal,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { today, fAmount } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';
import { newLine, lineTotals, JournalLineEditor } from '../journal-line-editor';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const FREQ = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUALLY: 'Yearly' };
const STATUS = {
  PENDING_APPROVAL: { label: 'Awaiting approval', color: 'warning' },
  ACTIVE: { label: 'Active', color: 'success' },
  PAUSED: { label: 'Paused', color: 'default' },
  ENDED: { label: 'Ended', color: 'default' },
};

/**
 * Accounting → Recurring journals (Phase 5, FR-GL-5, FR-GL-6): templates that
 * post (or prepare) the same journal on a schedule, and accruals waiting for
 * their automatic reversal on the 1st of the next month.
 */
export function RecurringView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('rec.title', 'Recurring journals')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('rec.title', 'Recurring journals') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>
        {(me) => (
          <Stack spacing={3}>
            <Templates me={me} />
            <Reversals />
          </Stack>
        )}
      </FahGate>
    </DashboardContent>
  );
}

function Templates({ me }) {
  const { t, nameOf } = useFahT();
  const { templates, error, loading } = useRecurringJournals();
  const { entities } = useFahCatalog();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      const out = await fn();
      if (out?.waiting?.length)
        toast.warning(out.waiting.map((w) => `${w.name}: ${w.reason}`).join(' · '));
      else toast.success(typeof ok === 'function' ? ok(out) : ok);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        sx={{ p: 2.5 }}
      >
        <div>
          <Typography variant="subtitle1">{t('rec.templates', 'Templates')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'rec.help',
              'Rent, prepayment amortisation, depreciation. Approved once by a controller (the CFO from SAR 500,000); each run then posts, or prepares a draft for the usual approval. Runs daily at 02:45.'
            )}
          </Typography>
        </div>
        <Stack direction="row" spacing={1}>
          {me.canPrepare && (
            <LoadingButton
              variant="outlined"
              loading={busy === 'run'}
              startIcon={<Iconify icon="solar:play-bold" />}
              onClick={() =>
                act(
                  'run',
                  () => runRecurringJournals(),
                  (o) =>
                    t('rec.ran', '{{n}} generated, {{r}} reversed', {
                      n: o.generated,
                      r: o.reversed,
                    })
                )
              }
            >
              {t('rec.runNow', 'Run what is due')}
            </LoadingButton>
          )}
          {me.canPrepare && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setOpen(true)}
            >
              {t('rec.new', 'New template')}
            </Button>
          )}
        </Stack>
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !templates.length ? (
        <EmptyContent title={t('rec.none', 'No recurring journals')} sx={{ py: 6 }} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('rec.name', 'Name')}</TableCell>
                <TableCell>{t('rec.schedule', 'Schedule')}</TableCell>
                <TableCell align="right">{t('rec.amount', 'Amount (SAR)')}</TableCell>
                <TableCell>{t('rec.mode', 'Each run')}</TableCell>
                <TableCell>{t('rec.next', 'Next run')}</TableCell>
                <TableCell>{t('rec.last', 'Last run')}</TableCell>
                <TableCell>{t('rec.status', 'Status')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((r) => (
                <TableRow key={r.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell>
                    <Typography variant="body2">{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nameOf(entities.find((e) => e.id === r.legalEntityId))} · {r.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {FREQ[r.frequency]},{' '}
                    {r.dayOfMonth === 0
                      ? t('rec.lastDay', 'last day')
                      : t('rec.day', 'day {{d}}', { d: r.dayOfMonth })}
                    <Typography variant="caption" color="text.secondary" component="div">
                      {r.startDate} → {r.endDate ?? '…'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.total)}
                  </TableCell>
                  <TableCell>
                    {r.mode === 'POST'
                      ? t('rec.posts', 'Posts')
                      : t('rec.drafts', 'Draft for approval')}
                    {r.autoReverse ? ` · ${t('rec.reverses', 'reverses next month')}` : ''}
                  </TableCell>
                  <TableCell sx={num}>{r.nextRunDate ?? '—'}</TableCell>
                  <TableCell>
                    {r.lastJournalId ? (
                      <Link
                        component={RouterLink}
                        href={paths.dashboard.finance.accounting.journal(r.lastJournalId)}
                      >
                        {r.lastRunDate}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {r.lastError && (
                      <Typography variant="caption" color="warning.main" component="div">
                        {r.lastError}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={STATUS[r.status].color}>
                      {t(`rec.st.${r.status}`, STATUS[r.status].label)}
                    </Label>
                    {r.approvedBy && (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {r.approvedBy}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'PENDING_APPROVAL' &&
                      me.canControl &&
                      r.createdBy?.toLowerCase() !== me.email && (
                        <Button
                          size="small"
                          onClick={() =>
                            act(
                              r.id,
                              () => approveRecurringJournal(r.id),
                              t('rec.approved', 'Approved: it runs from {{d}}', {
                                d: r.nextRunDate,
                              })
                            )
                          }
                        >
                          {t('rec.approve', 'Approve')}
                        </Button>
                      )}
                    {r.status === 'ACTIVE' && me.canPrepare && (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() =>
                          act(
                            r.id,
                            () => setRecurringStatus(r.id, 'PAUSED'),
                            t('rec.paused', 'Paused')
                          )
                        }
                      >
                        {t('rec.pause', 'Pause')}
                      </Button>
                    )}
                    {r.status === 'PAUSED' && me.canPrepare && (
                      <Button
                        size="small"
                        onClick={() =>
                          act(
                            r.id,
                            () => setRecurringStatus(r.id, 'ACTIVE'),
                            t('rec.resumed', 'Resumed')
                          )
                        }
                      >
                        {t('rec.resume', 'Resume')}
                      </Button>
                    )}
                    {r.status !== 'ENDED' && me.canPrepare && (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() =>
                          act(
                            r.id,
                            () => setRecurringStatus(r.id, 'ENDED'),
                            t('rec.ended', 'Ended')
                          )
                        }
                      >
                        {t('rec.end', 'End')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TemplateDialog open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function TemplateDialog({ open, onClose }) {
  const { t, nameOf } = useFahT();
  const catalog = useFahCatalog();
  const { customers } = useErpCustomers();
  const books = catalog.entities.filter((e) => e.isActive);
  const [form, setForm] = useState({
    name: '',
    legalEntityId: '',
    description: '',
    frequency: 'MONTHLY',
    dayOfMonth: 0,
    startDate: today(),
    endDate: '',
    mode: 'DRAFT',
    autoReverse: false,
  });
  const [lines, setLines] = useState(() => [newLine(), newLine()]);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const bookId = form.legalEntityId || books[0]?.id || '';
  const accountById = useMemo(
    () => new Map(catalog.accounts.map((a) => [a.id, a])),
    [catalog.accounts]
  );
  const postable = catalog.accounts.filter(
    (a) =>
      a.type === 'POSTING' &&
      a.isActive &&
      a.class !== 'STATISTICAL' &&
      (!a.legalEntityId || a.legalEntityId === bookId)
  );
  const totals = lineTotals(lines, 'SAR');

  const save = async () => {
    setBusy(true);
    try {
      await createRecurringJournal({
        ...form,
        legalEntityId: bookId,
        dayOfMonth: Number(form.dayOfMonth),
        endDate: form.endDate || null,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) || Number(l.credit)))
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            practiceId: l.practiceId || null,
            fahCostCentreId: l.fahCostCentreId || null,
            engagementId: l.engagementId || null,
            customerId: l.customerId || null,
            memo: l.memo || null,
          })),
      });
      toast.success(t('rec.created', 'Template saved: a controller approves it before it runs'));
      setLines([newLine(), newLine()]);
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle>{t('rec.new', 'New template')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              label={t('rec.name', 'Name')}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              size="small"
              label={t('rec.book', 'Book')}
              value={bookId}
              onChange={(e) => set({ legalEntityId: e.target.value })}
              sx={{ minWidth: 220 }}
            >
              {books.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {nameOf(b)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            size="small"
            label={t('rec.description', 'Journal description')}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              size="small"
              label={t('rec.frequency', 'Every')}
              value={form.frequency}
              onChange={(e) => set({ frequency: e.target.value })}
              sx={{ minWidth: 140 }}
            >
              {Object.entries(FREQ).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`rec.freq.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('rec.onDay', 'On day')}
              value={form.dayOfMonth}
              onChange={(e) => set({ dayOfMonth: e.target.value })}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value={0}>{t('rec.lastDay', 'last day')}</MenuItem>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="date"
              label={t('rec.start', 'From')}
              value={form.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label={t('rec.endOpt', 'Until (optional)')}
              value={form.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              size="small"
              label={t('rec.mode', 'Each run')}
              value={form.mode}
              onChange={(e) => set({ mode: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="DRAFT">{t('rec.drafts', 'Draft for approval')}</MenuItem>
              <MenuItem value="POST">{t('rec.posts', 'Posts')}</MenuItem>
            </TextField>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={form.autoReverse}
                onChange={(e) => set({ autoReverse: e.target.checked })}
              />
            }
            label={t(
              'rec.autoReverse',
              'Each journal reverses on the 1st of the next month (accrual)'
            )}
          />
          <Stack spacing={1.5}>
            {lines.map((line, index) => (
              <JournalLineEditor
                key={line.key}
                index={index}
                line={line}
                accounts={postable}
                accountById={accountById}
                catalog={catalog}
                customers={customers}
                functionalCurrency="SAR"
                onChange={(next) =>
                  setLines((prev) => prev.map((l) => (l.key === line.key ? next : l)))
                }
                onRemove={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                canRemove={lines.length > 2}
                disabled={busy}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setLines((p) => [...p, newLine()])}
            >
              {t('rec.addLine', 'Add line')}
            </Button>
            <Typography
              variant="body2"
              sx={num}
              color={totals.difference ? 'error.main' : 'text.secondary'}
            >
              {t('rec.totals', 'Debit {{d}} · credit {{c}}', {
                d: fAmount(totals.debit),
                c: fAmount(totals.credit),
              })}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={
            !form.name.trim() ||
            !form.description.trim() ||
            totals.difference !== 0 ||
            !totals.debit
          }
          onClick={save}
        >
          {t('rec.save', 'Save template')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function Reversals() {
  const { t } = useFahT();
  const { journals } = usePendingReversals();
  return (
    <Card>
      <Typography variant="subtitle1" sx={{ p: 2.5, pb: 1 }}>
        {t('rec.reversals', 'Accruals waiting for their reversal')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 2 }}>
        {t(
          'rec.reversalsHelp',
          'Journals posted with "reverse on the 1st of next month". The daily run reverses each once that month takes postings.'
        )}
      </Typography>
      {!journals.length ? (
        <Typography variant="body2" color="text.disabled" sx={{ px: 2.5, pb: 2.5 }}>
          {t('rec.noReversals', 'None waiting.')}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('rec.journal', 'Journal')}</TableCell>
              <TableCell>{t('rec.description', 'Description')}</TableCell>
              <TableCell align="right">{t('rec.amount', 'Amount (SAR)')}</TableCell>
              <TableCell>{t('rec.reversesOn', 'Reverses on')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {journals.map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <Link
                    component={RouterLink}
                    href={paths.dashboard.finance.accounting.journal(j.id)}
                  >
                    {j.journalNumber}
                  </Link>
                </TableCell>
                <TableCell>{j.description}</TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(j.totalDebit)}
                </TableCell>
                <TableCell sx={num}>{j.reversesOn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
