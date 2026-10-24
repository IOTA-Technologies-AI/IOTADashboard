'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  usePeriods,
  useFahCatalog,
  setPeriodStatus,
  ensureFiscalYear,
  softCloseHistory,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { varFade, varContainer } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PERIOD_STATUS } from '../fah-labels';
import { useFahT, FahGate } from '../fah-gate';

// ----------------------------------------------------------------------

/**
 * The moves a controller can make from each status (hard close arrives with
 * the period close). A future month can be soft-closed directly: that is how
 * reviewed, backfilled history is closed without opening it.
 */
const MOVES = {
  FUTURE: [
    { to: 'OPEN', key: 'open', label: 'Open', icon: 'solar:check-circle-bold' },
    {
      to: 'SOFT_CLOSED',
      key: 'softClose',
      label: 'Soft-close',
      icon: 'solar:lock-password-outline',
    },
  ],
  OPEN: [
    {
      to: 'SOFT_CLOSED',
      key: 'softClose',
      label: 'Soft-close',
      icon: 'solar:lock-password-outline',
    },
    {
      to: 'FUTURE',
      key: 'backToFuture',
      label: 'Back to future',
      icon: 'solar:clock-circle-outline',
      onlyEmpty: true,
    },
  ],
  SOFT_CLOSED: [{ to: 'OPEN', key: 'reopen', label: 'Reopen', icon: 'solar:restart-bold' }],
  HARD_CLOSED: [],
};

const kindOf = (periodNo) => {
  if (periodNo === 0) return 'opening';
  if (periodNo === 13) return 'adjustments';
  return 'month';
};

export function PeriodListView() {
  const { t } = useFahT();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('periods.title', 'Periods')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('periods.title', 'Periods') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={1}>{(me) => <PeriodBoard me={me} />}</FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function PeriodBoard({ me }) {
  const { t, nameOf } = useFahT();
  const { entities, maxOpenPeriods, loading: catalogLoading } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);

  const [bookId, setBookId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [pending, setPending] = useState(null); // { period, move }
  const [busy, setBusy] = useState(false);
  const [addingYear, setAddingYear] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUpTo, setHistoryUpTo] = useState('');

  useEffect(() => {
    if (!bookId && books.length) setBookId(books[0].id);
  }, [books, bookId]);

  const { periods, years, loading, error } = usePeriods(bookId, year);

  useEffect(() => {
    if (years.length && !years.includes(year)) {
      const current = new Date().getFullYear();
      setYear(years.includes(current) ? current : years[years.length - 1]);
    }
  }, [years, year]);

  const openMonthly = periods.filter(
    (p) => p.status === 'OPEN' && p.periodNo >= 1 && p.periodNo <= 12
  ).length;

  const handleConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await setPeriodStatus(pending.period.id, pending.move.to);
      toast.success(
        t('periods.changed', '{{name}} is now {{status}}', {
          name: pending.period.name,
          status: t(`periodStatus.${pending.move.to}`, PERIOD_STATUS[pending.move.to].label),
        })
      );
      setPending(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSoftCloseHistory = async () => {
    setBusy(true);
    try {
      const { closed } = await softCloseHistory(bookId, historyUpTo);
      toast.success(t('periods.historyClosed', '{{n}} months soft-closed', { n: closed }));
      setHistoryOpen(false);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAddYear = async () => {
    const next = (years.length ? Math.max(...years) : new Date().getFullYear()) + 1;
    setAddingYear(true);
    try {
      await ensureFiscalYear(bookId, next);
      toast.success(t('periods.yearAdded', 'Fiscal year {{year}} added', { year: next }));
      setYear(next);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setAddingYear(false);
    }
  };

  return (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t(
          'periods.note',
          'At most {{max}} monthly periods of a book may be open at once. Period 0 holds the opening balances; period 13 is for year-end adjustments, posted by a controller.',
          { max: maxOpenPeriods }
        )}
      </Alert>

      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            size="small"
            label={t('periods.book', 'Book')}
            value={books.some((b) => b.id === bookId) ? bookId : ''}
            onChange={(e) => setBookId(e.target.value)}
            disabled={catalogLoading}
            sx={{ minWidth: { sm: 280 } }}
          >
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.shortCode} · {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={t('periods.year', 'Fiscal year')}
            value={years.includes(year) ? year : ''}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ minWidth: { sm: 160 } }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                FY{y}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          <Typography variant="body2" color="text.secondary">
            {t('periods.openCount', '{{open}} of {{max}} monthly periods open', {
              open: openMonthly,
              max: maxOpenPeriods,
            })}
          </Typography>

          {me.canControl && (
            <Button
              variant="outlined"
              color="inherit"
              disabled={!bookId}
              startIcon={<Iconify icon="solar:lock-password-outline" />}
              onClick={() => {
                const d = new Date();
                d.setDate(0);
                setHistoryUpTo(d.toISOString().slice(0, 10));
                setHistoryOpen(true);
              }}
            >
              {t('periods.closeHistory', 'Soft-close history')}
            </Button>
          )}

          {me.canControl && (
            <LoadingButton
              variant="outlined"
              color="inherit"
              loading={addingYear}
              disabled={!bookId}
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleAddYear}
            >
              {t('periods.addYear', 'Add fiscal year')}
            </LoadingButton>
          )}
        </Stack>
      </Card>

      <Box sx={{ height: 2, mb: 1 }}>{loading && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}

      <Box
        component={m.div}
        key={`${bookId}-${year}`}
        initial="initial"
        animate="animate"
        variants={varContainer({ transitionIn: { staggerChildren: 0.03 } })}
        sx={{
          gap: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        {periods.map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            canControl={me.canControl}
            onMove={(move) => setPending({ period, move })}
          />
        ))}
      </Box>

      <ConfirmDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('periods.closeHistoryTitle', 'Soft-close reviewed history')}
        content={
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                'periods.closeHistoryHelp',
                'Every future or open month of this book that ends on or before the date becomes soft-closed. The posting engine and accountants can still post to soft-closed months; nothing else changes. Use it once the backfilled months are reviewed.'
              )}
            </Typography>
            <TextField
              size="small"
              type="date"
              label={t('periods.upTo', 'Up to')}
              value={historyUpTo}
              onChange={(e) => setHistoryUpTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            loading={busy}
            disabled={!historyUpTo}
            onClick={handleSoftCloseHistory}
          >
            {t('periods.closeHistory', 'Soft-close history')}
          </LoadingButton>
        }
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        title={
          pending
            ? t('periods.confirmTitle', '{{action}} {{name}}?', {
                action: t(`periods.move.${pending.move.key}`, pending.move.label),
                name: pending.period.name,
              })
            : ''
        }
        content={
          pending &&
          t(
            'periods.confirmContent',
            'The period will become {{status}}. This is recorded in the audit log.',
            {
              status: t(`periodStatus.${pending.move.to}`, PERIOD_STATUS[pending.move.to].label),
            }
          )
        }
        action={
          <LoadingButton variant="contained" loading={busy} onClick={handleConfirm}>
            {pending ? t(`periods.move.${pending.move.key}`, pending.move.label) : ''}
          </LoadingButton>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function PeriodCard({ period, canControl, onMove }) {
  const { t } = useFahT();
  const status = PERIOD_STATUS[period.status] ?? PERIOD_STATUS.FUTURE;
  const kind = kindOf(period.periodNo);
  const moves = (MOVES[period.status] ?? []).filter((mv) => !mv.onlyEmpty || !period.journalCount);

  return (
    <m.div variants={varFade('inUp', { distance: 16 }).inUp} layout>
      <Card
        sx={{
          p: 2.5,
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          borderTop: (theme) =>
            `3px solid ${
              status.color === 'default'
                ? theme.vars.palette.divider
                : theme.vars.palette[status.color].main
            }`,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="subtitle1">{period.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {kind === 'month'
                ? `${period.startDate} – ${period.endDate}`
                : kind === 'opening'
                  ? t('periods.openingHelp', 'Opening balances')
                  : t('periods.adjustmentsHelp', 'Year-end adjustments')}
            </Typography>
          </Box>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={period.status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Label variant="soft" color={status.color} startIcon={<Iconify icon={status.icon} />}>
                {t(`periodStatus.${period.status}`, status.label)}
              </Label>
            </m.div>
          </AnimatePresence>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {t('periods.journalCount', '{{count}} posted journals', { count: period.journalCount })}
        </Typography>

        {canControl && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 'auto' }}>
            {moves.map((mv) => (
              <Button
                key={mv.key}
                size="small"
                variant={mv.to === 'FUTURE' ? 'text' : 'outlined'}
                color={mv.to === 'SOFT_CLOSED' ? 'warning' : 'inherit'}
                startIcon={<Iconify icon={mv.icon} width={16} />}
                onClick={() => onMove(mv)}
              >
                {t(`periods.move.${mv.key}`, mv.label)}
              </Button>
            ))}
            {period.status === 'SOFT_CLOSED' && (
              <Tooltip
                title={t(
                  'periods.hardCloseLater',
                  'Hard close arrives with the period close in a later phase.'
                )}
              >
                <span>
                  <Button
                    size="small"
                    disabled
                    startIcon={<Iconify icon="solar:shield-check-bold" width={16} />}
                  >
                    {t('periods.move.hardClose', 'Hard-close')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        )}
      </Card>
    </m.div>
  );
}
