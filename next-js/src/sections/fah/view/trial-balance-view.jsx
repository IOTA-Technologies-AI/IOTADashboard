'use client';

import { m } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  downloadText,
  useFahCatalog,
  verifyBalances,
  trialBalanceCsv,
  useTrialBalance,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { varFade } from 'src/components/animate';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { fAmount, ACCOUNT_CLASS, ACCOUNT_CLASS_ORDER } from '../fah-labels';

// ----------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AMOUNT_KEYS = [
  'openingDebit',
  'openingCredit',
  'periodDebit',
  'periodCredit',
  'closingDebit',
  'closingCredit',
];

const pad = (n) => String(n).padStart(2, '0');

/** First and last date covered by periods from..to of a year (0 opening, 13 adjustments). */
export function periodDates(year, from, to) {
  const start =
    from <= 1 ? `${year}-01-01` : from >= 13 ? `${year}-12-31` : `${year}-${pad(from)}-01`;
  let end;
  if (to >= 12) end = `${year}-12-31`;
  else if (to <= 0) end = `${year}-01-01`;
  else end = new Date(Date.UTC(year, to, 0)).toISOString().slice(0, 10);
  return { fromDate: start, toDate: end };
}

const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function TrialBalanceView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('tb.title', 'Trial balance')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('tb.title', 'Trial balance') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={1}>{(me) => <TrialBalance me={me} />}</FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function TrialBalance({ me }) {
  const { t, nameOf } = useFahT();
  const router = useRouter();
  const { entities } = useFahCatalog();
  const thisYear = new Date().getFullYear();

  const [entity, setEntity] = useState(null); // null until the catalogue loads; '' = all books
  const [year, setYear] = useState(thisYear);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(13);
  const [by, setBy] = useState('account');
  const [verifying, setVerifying] = useState(false);
  const [drift, setDrift] = useState(0);
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    if (entity === null && entities.length) {
      setEntity((entities.find((e) => e.isActive) ?? entities[0]).id);
    }
  }, [entity, entities]);

  const params = { legalEntityId: entity || undefined, year, fromPeriod: from, toPeriod: to, by };
  const { rows, totals, balanced, error, loading, validating } = useTrialBalance(
    params,
    entity !== null
  );

  const years = Array.from({ length: thisYear + 1 - 2025 + 1 }, (_, i) => 2025 + i);
  const periodLabel = (p) =>
    p === 0
      ? t('tb.opening', 'Opening')
      : p === 13
        ? t('tb.adjustments', 'Adjustments')
        : t(`month.${p}`, MONTHS[p - 1]);

  const groups = useMemo(
    () =>
      ACCOUNT_CLASS_ORDER.map((cls) => {
        const list = rows.filter((r) => r.class === cls);
        const sub = Object.fromEntries(
          AMOUNT_KEYS.map((k) => [k, list.reduce((s, r) => s + Number(r[k] ?? 0), 0)])
        );
        return { cls, rows: list, sub };
      }).filter((g) => g.rows.length),
    [rows]
  );

  const openLedger = (row) => {
    const { fromDate, toDate } = periodDates(year, from, to);
    const q = new URLSearchParams({ accountId: row.accountId, fromDate, toDate });
    if (entity) q.set('legalEntityId', entity);
    if (row.dimensionId && by === 'practice') q.set('practiceId', row.dimensionId);
    if (row.dimensionId && by === 'costCentre') q.set('costCentreId', row.dimensionId);
    router.push(`${paths.dashboard.finance.accounting.ledger}?${q.toString()}`);
  };

  const handleExport = async () => {
    try {
      const csv = await trialBalanceCsv(params);
      const book = entities.find((e) => e.id === entity)?.shortCode ?? 'ALL';
      downloadText(csv, `trial-balance-${book}-${year}-p${from}-p${to}.csv`);
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyBalances(false);
      setDrift(result.driftRows);
      if (result.driftRows) {
        toast.warning(
          t('tb.drift', 'The balances differ from the posted lines in {{n}} place(s).', {
            n: result.driftRows,
          })
        );
      } else {
        toast.success(t('tb.noDrift', 'Balances agree with the posted lines.'));
      }
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await verifyBalances(true);
      setDrift(0);
      setRebuildOpen(false);
      toast.success(t('tb.rebuilt', 'Balances rebuilt from the posted lines.'));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setRebuilding(false);
    }
  };

  const showDim = by !== 'account';

  const amountCells = (r, bold) =>
    AMOUNT_KEYS.map((k) => (
      <TableCell key={k} sx={{ ...num, fontWeight: bold ? 600 : 400 }}>
        {fAmount(r[k], { blankZero: !bold })}
      </TableCell>
    ));

  return (
    <>
      <Card
        component={m.div}
        initial="initial"
        animate="animate"
        variants={varFade('inUp', { distance: 24 }).inUp}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ p: 2.5 }}
          alignItems={{ md: 'center' }}
        >
          <TextField
            select
            size="small"
            label={t('tb.book', 'Book')}
            value={entity ?? ''}
            onChange={(e) => setEntity(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {entities.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.shortCode} · {nameOf(e)}
              </MenuItem>
            ))}
            <MenuItem value="">{t('tb.allBooks', 'All books (consolidated, SAR)')}</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label={t('tb.year', 'Year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('tb.from', 'From')}
            value={from}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFrom(v);
              if (to < v) setTo(v);
            }}
            sx={{ minWidth: 130 }}
          >
            {Array.from({ length: 14 }, (_, p) => (
              <MenuItem key={p} value={p}>
                {periodLabel(p)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('tb.to', 'To')}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            sx={{ minWidth: 130 }}
          >
            {Array.from({ length: 14 }, (_, p) => (
              <MenuItem key={p} value={p} disabled={p < from}>
                {periodLabel(p)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('tb.by', 'Rows by')}
            value={by}
            onChange={(e) => setBy(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="account">{t('tb.byAccount', 'Account')}</MenuItem>
            <MenuItem value="practice">{t('tb.byPractice', 'Account and practice')}</MenuItem>
            <MenuItem value="costCentre">
              {t('tb.byCostCentre', 'Account and cost centre')}
            </MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {totals && (
              <Label
                variant="soft"
                color={balanced ? 'success' : 'error'}
                startIcon={
                  <Iconify
                    icon={balanced ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'}
                  />
                }
              >
                {balanced ? t('tb.balanced', 'Balanced') : t('tb.unbalanced', 'Out of balance')}
              </Label>
            )}
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:export-bold" />}
              onClick={handleExport}
              disabled={!rows.length}
            >
              {t('tb.export', 'Export CSV')}
            </Button>
            {me.canControl && (
              <LoadingButton
                size="small"
                variant="outlined"
                color="inherit"
                loading={verifying}
                startIcon={<Iconify icon="solar:shield-check-bold" />}
                onClick={handleVerify}
              >
                {t('tb.verify', 'Verify balances')}
              </LoadingButton>
            )}
            {me.isCfo && drift > 0 && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<Iconify icon="solar:restart-bold" />}
                onClick={() => setRebuildOpen(true)}
              >
                {t('tb.rebuild', 'Rebuild from lines')}
              </Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, my: 2 }}>
            {fahError(error)}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>{t('tb.account', 'Account')}</TableCell>
                <TableCell rowSpan={2}>{t('tb.name', 'Name')}</TableCell>
                {showDim && (
                  <TableCell rowSpan={2}>
                    {by === 'practice'
                      ? t('tb.practice', 'Practice')
                      : t('tb.costCentre', 'Cost centre')}
                  </TableCell>
                )}
                <TableCell colSpan={2} align="center">
                  {t('tb.openingBalance', 'Opening')}
                </TableCell>
                <TableCell colSpan={2} align="center">
                  {t('tb.movement', 'Movement')}
                </TableCell>
                <TableCell colSpan={2} align="center">
                  {t('tb.closing', 'Closing')}
                </TableCell>
              </TableRow>
              <TableRow>
                {[0, 1, 2].map((i) => [
                  <TableCell key={`d${i}`} sx={num}>
                    {t('tb.debit', 'Debit')}
                  </TableCell>,
                  <TableCell key={`c${i}`} sx={num}>
                    {t('tb.credit', 'Credit')}
                  </TableCell>,
                ])}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => [
                ...g.rows.map((r) => (
                  <TableRow
                    key={`${r.accountId}-${r.dimensionId ?? ''}`}
                    hover
                    onClick={() => openLedger(r)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.code}</TableCell>
                    <TableCell>{nameOf(r)}</TableCell>
                    {showDim && (
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {r.dimensionCode ?? '—'}
                      </TableCell>
                    )}
                    {amountCells(r, false)}
                  </TableRow>
                )),
                <TableRow key={`s-${g.cls}`} sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={showDim ? 3 : 2}>
                    <Typography variant="subtitle2">
                      {t('tb.totalFor', 'Total {{cls}}', {
                        cls: t(`class.${g.cls}`, ACCOUNT_CLASS[g.cls].label),
                      })}
                    </Typography>
                  </TableCell>
                  {amountCells(g.sub, true)}
                </TableRow>,
              ])}
              {totals && rows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={showDim ? 3 : 2}>
                    <Typography variant="subtitle1">{t('tb.grandTotal', 'Total')}</Typography>
                  </TableCell>
                  {AMOUNT_KEYS.map((k) => (
                    <TableCell
                      key={k}
                      sx={{ ...num, fontWeight: 700, borderTop: 2, borderColor: 'divider' }}
                    >
                      {fAmount(totals[k])}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && !rows.length && !error && (
          <EmptyContent
            title={t('tb.empty', 'Nothing posted in these periods')}
            description={t('tb.emptyHelp', 'Posted journals appear here.')}
            sx={{ py: 8 }}
          />
        )}
      </Card>

      <ConfirmDialog
        open={rebuildOpen}
        onClose={() => setRebuildOpen(false)}
        title={t('tb.rebuildTitle', 'Rebuild balances?')}
        content={t(
          'tb.rebuildHelp',
          'The balances cache is recomputed from every posted journal line. Posted journals do not change. This is recorded in the audit log.'
        )}
        action={
          <LoadingButton
            variant="contained"
            color="warning"
            loading={rebuilding}
            onClick={handleRebuild}
          >
            {t('tb.rebuild', 'Rebuild from lines')}
          </LoadingButton>
        }
      />
    </>
  );
}
