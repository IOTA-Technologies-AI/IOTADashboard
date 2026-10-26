'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
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
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  hardClose,
  waiveCheck,
  postYearEnd,
  useCloseYear,
  approveReopen,
  requestReopen,
  useFahCatalog,
  useCloseChecks,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { fAmount, PERIOD_STATUS } from '../fah-labels';

// ----------------------------------------------------------------------

const CHECK = {
  PASS: { color: 'success', icon: 'solar:check-circle-bold' },
  WARN: { color: 'warning', icon: 'solar:danger-triangle-bold' },
  FAIL: { color: 'error', icon: 'solar:close-circle-bold' },
  WAIVED: { color: 'info', icon: 'solar:shield-check-bold' },
};
const LINK = (a) => ({
  periods: a.periods,
  close: a.close,
  postings: a.postings,
  journals: a.journals,
  recurring: a.recurring,
  interPractice: a.interPractice,
  allocations: a.allocations,
  trialBalance: a.trialBalance,
  reconciliation: a.reconciliation,
  reimbursements: a.reimbursements,
});

/**
 * Accounting → Close (Phase 5, requirements §10): each month's checklist,
 * waivers, hard close with the balances hash, reopen with a CFO's approval,
 * and the year-end closing journal.
 */
export function CloseView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('close.title', 'Close')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('close.title', 'Close') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{(me) => <Close me={me} />}</FahGate>
    </DashboardContent>
  );
}

function Close({ me }) {
  const { t, nameOf } = useFahT();
  const { entities } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [book, setBook] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodId, setPeriodId] = useState('');
  const bookId = book || books[0]?.id || '';
  const { data, error, loading } = useCloseYear(bookId, year);

  useEffect(() => setPeriodId(''), [bookId, year]);

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            size="small"
            label={t('close.book', 'Book')}
            value={bookId}
            onChange={(e) => setBook(e.target.value)}
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
            label={t('close.year', 'Year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 120 }}
          />
        </Stack>
      </Card>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{fahError(error)}</Alert>}
      {data && (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
          <Card sx={{ width: { xs: 1, lg: 420 }, flexShrink: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('close.month', 'Month')}</TableCell>
                  <TableCell>{t('close.status', 'Status')}</TableCell>
                  <TableCell>{t('close.closed', 'Closed')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.months.map(({ period, close }) => (
                  <TableRow
                    key={period.id}
                    hover
                    selected={period.id === periodId}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setPeriodId(period.id)}
                  >
                    <TableCell>{period.name}</TableCell>
                    <TableCell>
                      <Label variant="soft" color={PERIOD_STATUS[period.status]?.color}>
                        {t(`periodStatus.${period.status}`, PERIOD_STATUS[period.status]?.label)}
                      </Label>
                    </TableCell>
                    <TableCell>
                      {close && period.status === 'HARD_CLOSED' ? (
                        <Typography variant="caption">
                          {close.closedBy}
                          {close.lastVerifiedOk === false && (
                            <Typography component="span" variant="caption" color="error.main">
                              {' '}
                              · {t('close.hashBad', 'hash mismatch')}
                            </Typography>
                          )}
                        </Typography>
                      ) : (
                        ''
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Box sx={{ flexGrow: 1, width: 1 }}>
            {periodId ? (
              <Month me={me} periodId={periodId} />
            ) : (
              <Card sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    'close.pick',
                    'Choose a month to see its checklist. Months are closed in order: soft-close, clear the checklist, then hard-close.'
                  )}
                </Typography>
              </Card>
            )}
            <YearEndCard me={me} bookId={bookId} year={year} yearEnd={data.yearEnd} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}

function Month({ me, periodId }) {
  const { t } = useFahT();
  const { data, error, loading, validating } = useCloseChecks(periodId);
  const [waiving, setWaiving] = useState(null);
  const [reopening, setReopening] = useState(null);
  const [busy, setBusy] = useState('');
  const links = LINK(paths.dashboard.finance.accounting);

  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy('');
    }
  };

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{fahError(error)}</Alert>;
  if (!data) return null;
  const { period, checks, canHardClose, closes } = data;
  const current = closes[0];
  const hard = period.status === 'HARD_CLOSED';

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        sx={{ p: 2.5 }}
      >
        <Box>
          <Typography variant="h6">{period.name}</Typography>
          {hard && current && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ wordBreak: 'break-all' }}
            >
              {t('close.closedBy', 'Hard-closed by {{who}}, {{when}} · SHA-256 {{hash}}', {
                who: current.closedBy,
                when: fDateTime(current.closedAt),
                hash: current.tbHash,
              })}
              {current.lastVerifiedAt &&
                ` · ${current.lastVerifiedOk ? t('close.verified', 'verified') : t('close.notVerified', 'MISMATCH')} ${fDateTime(current.lastVerifiedAt)}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {!hard && me.canControl && (
            <LoadingButton
              variant="contained"
              color="error"
              disabled={!canHardClose}
              loading={busy === 'close'}
              startIcon={<Iconify icon="solar:lock-keyhole-bold" />}
              onClick={() =>
                act(
                  'close',
                  () => hardClose(period.id),
                  t('close.done', '{{m}} hard-closed', { m: period.name })
                )
              }
            >
              {t('close.hardClose', 'Hard close')}
            </LoadingButton>
          )}
          {hard && current?.status === 'HARD_CLOSED' && me.canControl && (
            <Button variant="outlined" onClick={() => setReopening(current)}>
              {t('close.requestReopen', 'Request reopening')}
            </Button>
          )}
          {hard &&
            current?.status === 'REOPEN_REQUESTED' &&
            me.isCfo &&
            current.reopenRequestedBy?.toLowerCase() !== me.email && (
              <LoadingButton
                variant="contained"
                loading={busy === 'reopen'}
                onClick={() =>
                  act(
                    'reopen',
                    () => approveReopen(current.id),
                    t('close.reopened', '{{m}} reopened (soft-closed)', { m: period.name })
                  )
                }
              >
                {t('close.approveReopen', 'Approve reopening')}
              </LoadingButton>
            )}
        </Stack>
      </Stack>
      {current?.status === 'REOPEN_REQUESTED' && (
        <Alert severity="warning" sx={{ mx: 2.5, mb: 2 }}>
          {t(
            'close.reopenPending',
            '{{who}} asked to reopen: {{why}}. A CFO (another person) approves it.',
            { who: current.reopenRequestedBy, why: current.reopenReason }
          )}
        </Alert>
      )}
      {validating && <LinearProgress />}
      <Table size="small">
        <TableBody>
          {checks.map((c) => (
            <TableRow key={c.key} sx={{ verticalAlign: 'top' }}>
              <TableCell width={40}>
                <Iconify
                  icon={CHECK[c.status]?.icon}
                  sx={{ color: `${CHECK[c.status]?.color}.main` }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">{c.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.detail}
                </Typography>
                {c.status === 'WAIVED' && (
                  <Typography variant="caption" color="info.main">
                    {t('close.waivedBy', 'Accepted by {{who}}: {{why}}', {
                      who: c.waivedBy,
                      why: c.waiverComment,
                    })}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {c.link && c.status !== 'PASS' && links[c.link] && (
                  <Link
                    component={RouterLink}
                    href={links[c.link]}
                    variant="body2"
                    sx={{ mr: 1.5 }}
                  >
                    {t('close.fix', 'Open')}
                  </Link>
                )}
                {!hard &&
                  me.canControl &&
                  ['FAIL', 'WARN'].includes(c.status) &&
                  !['status', 'balanced', 'earlier'].includes(c.key) && (
                    <Button size="small" color="inherit" onClick={() => setWaiving(c)}>
                      {t('close.waive', 'Accept')}
                    </Button>
                  )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {t(
          'close.rule',
          'A red item stops the hard close until it is fixed or a controller accepts it with a comment; amber items are recorded with the close. A hard-closed month takes no postings: anything dated in it posts to the next open month, marked late. Reopening needs a controller’s request and a CFO’s approval.'
        )}
      </Typography>

      <TextDialog
        open={Boolean(waiving)}
        title={t('close.waiveTitle', 'Accept "{{label}}"?', { label: waiving?.label })}
        label={t('close.why', 'Why it can stay as it is')}
        action={t('close.waive', 'Accept')}
        onClose={() => setWaiving(null)}
        onSubmit={(comment) =>
          act(
            'waive',
            () => waiveCheck(period.id, waiving.key, comment),
            t('close.waived', 'Accepted')
          ).then(() => setWaiving(null))
        }
      />
      <TextDialog
        open={Boolean(reopening)}
        title={t('close.reopenTitle', 'Request reopening {{m}}?', { m: period.name })}
        label={t('close.reason', 'Reason (kept with the close)')}
        action={t('close.request', 'Request')}
        onClose={() => setReopening(null)}
        onSubmit={(reason) =>
          act(
            'request',
            () => requestReopen(reopening.id, reason),
            t('close.requested', 'Requested: a CFO approves it')
          ).then(() => setReopening(null))
        }
      />
    </Card>
  );
}

function YearEndCard({ me, bookId, year, yearEnd }) {
  const { t } = useFahT();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const out = await postYearEnd(bookId, year);
      toast.success(
        t('close.yearDone', '{{y}} closed: {{r}} to retained earnings', {
          y: year,
          r: fAmount(out.result),
        })
      );
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card sx={{ p: 2.5, mt: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
      >
        <Box>
          <Typography variant="subtitle1">
            {t('close.yearEnd', 'Year-end close {{y}}', { y: year })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {yearEnd.closingJournalId ? (
              <>
                {t('close.yearClosed', 'Closed by journal')}{' '}
                <Link
                  component={RouterLink}
                  href={paths.dashboard.finance.accounting.journal(yearEnd.closingJournalId)}
                >
                  {yearEnd.closingJournalNumber}
                </Link>
              </>
            ) : (
              t(
                'close.yearHelp',
                'A CLOSING journal in period 13 reverses every income and expense balance of the year ({{n}} lines) and puts the result, {{r}}, into retained earnings (3200).',
                { n: yearEnd.lines, r: fAmount(yearEnd.result) }
              )
            )}
          </Typography>
          {yearEnd.blocked && !yearEnd.closingJournalId && (
            <Typography variant="caption" color="warning.main">
              {yearEnd.blocked}
            </Typography>
          )}
        </Box>
        {me.isCfo && !yearEnd.closingJournalId && (
          <LoadingButton
            variant="contained"
            disabled={!!yearEnd.blocked}
            loading={busy}
            onClick={go}
          >
            {t('close.closeYear', 'Close the year')}
          </LoadingButton>
        )}
      </Stack>
    </Card>
  );
}

function TextDialog({ open, title, label, action, onClose, onSubmit }) {
  const { t } = useFahT();
  const [text, setText] = useState('');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!text.trim()}
          onClick={() => {
            onSubmit(text.trim());
            setText('');
          }}
        >
          {action}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
