'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  usePeriods,
  useFxPreview,
  useFahCatalog,
  postFxRevaluation,
  useDeferredRevenue,
  postRevenueRelease,
  createRevenueSchedule,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { fAmount } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/**
 * Accounting → Month-end (Phase 5d): deferred revenue released over each
 * invoice's service period (D-5), and FX revaluation of open foreign-currency
 * balances (FR-FX-3).
 */
export function MonthEndView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('me.title', 'Month-end')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('me.title', 'Month-end') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{(me) => <MonthEnd me={me} />}</FahGate>
    </DashboardContent>
  );
}

function MonthEnd({ me }) {
  const { t, nameOf } = useFahT();
  const { entities } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [tab, setTab] = useState('deferred');
  const [book, setBook] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodId, setPeriodId] = useState('');
  const bookId = book || books[0]?.id || '';
  const { periods } = usePeriods(bookId, year);
  const months = periods.filter((p) => p.periodNo >= 1 && p.periodNo <= 12);

  useEffect(() => {
    if (!months.length || months.some((p) => p.id === periodId)) return;
    const open = months.filter((p) => ['OPEN', 'SOFT_CLOSED'].includes(p.status));
    setPeriodId((open[open.length - 1] ?? months[new Date().getMonth()] ?? months[0]).id);
  }, [months, periodId]);

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            size="small"
            label={t('me.book', 'Book')}
            value={bookId}
            onChange={(e) => {
              setBook(e.target.value);
              setPeriodId('');
            }}
            sx={{ minWidth: 260 }}
          >
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={t('me.year', 'Year')}
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPeriodId('');
            }}
            sx={{ width: 110 }}
          />
          <TextField
            select
            size="small"
            label={t('me.month', 'Month')}
            value={months.some((m) => m.id === periodId) ? periodId : ''}
            onChange={(e) => setPeriodId(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {months.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name} · {m.status.toLowerCase().replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab value="deferred" label={t('me.deferred', 'Deferred revenue')} />
        <Tab value="fx" label={t('me.fx', 'FX revaluation')} />
      </Tabs>
      {tab === 'deferred' && bookId && <Deferred me={me} bookId={bookId} periodId={periodId} />}
      {tab === 'fx' && bookId && periodId && <Fx me={me} bookId={bookId} periodId={periodId} />}
    </Stack>
  );
}

function Deferred({ me, bookId, periodId }) {
  const { t } = useFahT();
  const { practices } = useFahCatalog();
  const { data, error, loading } = useDeferredRevenue(bookId, periodId);
  const [scheduling, setScheduling] = useState(null);
  const [busy, setBusy] = useState(false);
  const code = (id) => practices.find((p) => p.id === id)?.code ?? '';

  const release = async () => {
    setBusy(true);
    try {
      const out = await postRevenueRelease(bookId, periodId);
      toast.success(
        out.journalId
          ? t('me.released', '{{n}} released to revenue', { n: fAmount(out.total) })
          : t('me.nothing', 'Nothing to release')
      );
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{fahError(error)}</Alert>;
  if (!data) return null;
  return (
    <Stack spacing={3}>
      <Alert severity="info">
        {t(
          'me.deferredHelp',
          'Retainer, Recurring / Subscription and Per-User / Per-Device invoices post their revenue to 2300 Deferred revenue. Give each its service period; every month, Release moves the share earned so far to its revenue account (straight-line by month).'
        )}
      </Alert>
      {data.unscheduled.length > 0 && (
        <Card>
          <Typography variant="subtitle1" sx={{ p: 2.5, pb: 1 }}>
            {t('me.unscheduled', 'Deferred invoices without a service period')}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('me.invoice', 'Invoice')}</TableCell>
                <TableCell>{t('me.date', 'Date')}</TableCell>
                <TableCell>{t('me.practice', 'Practice')}</TableCell>
                <TableCell align="right">{t('me.deferredAmt', 'Deferred (SAR)')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.unscheduled.map((i) => (
                <TableRow key={i.invoiceSourceId}>
                  <TableCell>{i.description}</TableCell>
                  <TableCell sx={num}>{i.journalDate}</TableCell>
                  <TableCell>{code(i.practiceId)}</TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(i.deferred)}
                  </TableCell>
                  <TableCell align="right">
                    {me.canPrepare && (
                      <Button size="small" onClick={() => setScheduling(i)}>
                        {t('me.schedule', 'Set service period')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Card>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1">
            {t('me.schedules', 'Schedules')}
            {data.period ? ` · ${t('me.asAt', 'as at {{d}}', { d: data.period.endDate })}` : ''}
          </Typography>
          {me.canPrepare && data.period && (
            <LoadingButton
              variant="contained"
              loading={busy}
              disabled={!data.total}
              onClick={release}
            >
              {t('me.release', 'Release {{n}}', { n: fAmount(data.total) })}
            </LoadingButton>
          )}
        </Stack>
        {!data.schedules.length ? (
          <EmptyContent title={t('me.noSchedules', 'No deferred revenue')} sx={{ py: 6 }} />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('me.invoice', 'Invoice')}</TableCell>
                  <TableCell>{t('me.service', 'Service')}</TableCell>
                  <TableCell>{t('me.account', 'Revenue account')}</TableCell>
                  <TableCell align="right">{t('me.deferredAmt', 'Deferred (SAR)')}</TableCell>
                  <TableCell align="right">{t('me.earned', 'Earned to date')}</TableCell>
                  <TableCell align="right">{t('me.releasedAmt', 'Released')}</TableCell>
                  <TableCell align="right">{t('me.toRelease', 'To release')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.invoiceNumber}
                      <Typography variant="caption" color="text.secondary" component="div">
                        {s.customerName} · {code(s.practiceId)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={num}>
                      {s.startMonth.slice(0, 7)} · {s.elapsed}/{s.months}{' '}
                      {t('me.monthsShort', 'months')}
                    </TableCell>
                    <TableCell>{s.revenueAccountCode}</TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(s.deferred)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(s.due)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(s.released)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      <b>{fAmount(s.delta, { blankZero: true })}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      <ScheduleDialog invoice={scheduling} bookId={bookId} onClose={() => setScheduling(null)} />
    </Stack>
  );
}

function ScheduleDialog({ invoice, bookId, onClose }) {
  const { t } = useFahT();
  const [startMonth, setStartMonth] = useState('');
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (invoice) setStartMonth(invoice.journalDate.slice(0, 7));
  }, [invoice]);
  const save = async () => {
    setBusy(true);
    try {
      await createRevenueSchedule({
        legalEntityId: bookId,
        invoiceSourceId: invoice.invoiceSourceId,
        startMonth: `${startMonth}-01`,
        months: Number(months),
      });
      toast.success(t('me.scheduled', 'Service period saved'));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={Boolean(invoice)} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{t('me.scheduleTitle', 'Service period')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {invoice?.description} · {fAmount(invoice?.deferred)} SAR
            {invoice?.revenueAccountCode ? ` → ${invoice.revenueAccountCode}` : ''}
          </Typography>
          <TextField
            size="small"
            type="month"
            label={t('me.firstMonth', 'First month of service')}
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="number"
            label={t('me.months', 'Months of service')}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            inputProps={{ min: 1, max: 120 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!startMonth || !(Number(months) >= 1)}
          onClick={save}
        >
          {t('me.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function Fx({ me, bookId, periodId }) {
  const { t } = useFahT();
  const { preview, error, loading } = useFxPreview(bookId, periodId);
  const [busy, setBusy] = useState(false);
  const post = async () => {
    setBusy(true);
    try {
      const out = await postFxRevaluation(bookId, periodId);
      toast.success(
        out.journalId
          ? t('me.revalued', 'Revaluation posted: {{n}} to unrealised FX', {
              n: fAmount(out.total),
            })
          : t('me.noRevaluation', 'Nothing to revalue')
      );
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{fahError(error)}</Alert>;
  if (!preview) return null;
  const canPost = ['OPEN', 'SOFT_CLOSED'].includes(preview.period.status);
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
          <Typography variant="subtitle1">
            {t('me.fxTitle', 'Open foreign-currency balances at {{d}}', {
              d: preview.period.endDate,
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {preview.run
              ? t('me.fxPosted', 'Posted by {{who}}, {{when}}: {{n}}', {
                  who: preview.run.postedBy,
                  when: fDateTime(preview.run.postedAt),
                  n: fAmount(preview.run.total),
                })
              : t('me.fxNone', 'Not revalued this month.')}{' '}
            {preview.run && (
              <Label variant="soft" color={preview.upToDate ? 'success' : 'warning'}>
                {preview.upToDate
                  ? t('me.upToDate', 'up to date')
                  : t('me.stale', 'out of date: re-run')}
              </Label>
            )}
            {preview.run?.journalId && (
              <>
                {' '}
                <Link
                  component={RouterLink}
                  href={paths.dashboard.finance.accounting.journal(preview.run.journalId)}
                >
                  {t('me.journal', 'journal')}
                </Link>
              </>
            )}
          </Typography>
        </div>
        {me.canPrepare && canPost && (
          <LoadingButton
            variant="contained"
            loading={busy}
            disabled={preview.missingRates.length > 0 || (preview.upToDate && !!preview.run)}
            onClick={post}
          >
            {preview.run
              ? t('me.rerun', 'Re-run revaluation')
              : t('me.revalue', 'Post revaluation')}
          </LoadingButton>
        )}
      </Stack>
      {preview.missingRates.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2.5, mb: 2 }}>
          {t(
            'me.missingRates',
            'No rate on or before {{d}} for {{c}}. Add it under Exchange rates.',
            { d: preview.period.endDate, c: preview.missingRates.join(', ') }
          )}
        </Alert>
      )}
      {!preview.lines.length ? (
        <EmptyContent
          title={t('me.fxNothing', 'Nothing to revalue')}
          description={t(
            'me.fxNothingHelp',
            'Every foreign-currency balance is already at its month-end rate (USD and AED are pegged).'
          )}
          sx={{ py: 6 }}
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('me.account', 'Account')}</TableCell>
              <TableCell align="right">{t('me.txn', 'Balance')}</TableCell>
              <TableCell align="right">{t('me.booked', 'Booked (SAR)')}</TableCell>
              <TableCell align="right">{t('me.rate', 'Rate')}</TableCell>
              <TableCell align="right">{t('me.revaluedAmt', 'At month end (SAR)')}</TableCell>
              <TableCell align="right">{t('me.difference', 'Difference')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.lines.map((l) => (
              <TableRow key={`${l.accountId}-${l.currency}-${l.customerId}-${l.practiceId}`}>
                <TableCell>
                  {l.accountCode} {l.accountName}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {l.currency} {fAmount(l.txn)}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(l.func)}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {l.rate}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(l.revalued)}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(l.difference)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {t(
          'me.fxRule',
          'Monetary accounts only (cash, receivables, payables, inter-entity, loans). The difference goes to 7310 Unrealised FX in a REVALUATION journal that reverses on the 1st of the next month.'
        )}
      </Typography>
    </Card>
  );
}
