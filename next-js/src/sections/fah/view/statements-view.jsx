'use client';

import { useState, Fragment } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, downloadText, useStatements, useFahCatalog } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { fAmount } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/**
 * Accounting → Statements (Phase 5, requirements §11): Balance Sheet, Income
 * Statement, Changes in Equity and Cash Flows, for a book or all books, a
 * period range and, optionally, the same range a year earlier.
 */
export function StatementsView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('st.title', 'Financial statements')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('st.title', 'Financial statements') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{() => <Statements />}</FahGate>
    </DashboardContent>
  );
}

function Statements() {
  const { t, nameOf } = useFahT();
  const { entities } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [tab, setTab] = useState('bs');
  const [book, setBook] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(new Date().getMonth() + 1);
  const [compare, setCompare] = useState(true);
  const params = {
    year,
    fromPeriod: from,
    toPeriod: to,
    compare,
    ...(book ? { legalEntityId: book } : {}),
  };
  const { data, error, loading } = useStatements(params);
  const cur = data?.current;
  const cmp = data?.comparative;
  const ledgerHref = (accountId, set) => {
    const q = new URLSearchParams({
      accountId,
      fromDate: tab === 'bs' ? `${set.year - 30}-01-01` : set.fromDate,
      toDate: set.toDate,
    });
    if (book) q.set('legalEntityId', book);
    return `${paths.dashboard.finance.accounting.ledger}?${q.toString()}`;
  };
  const bookCode = entities.find((e) => e.id === book)?.shortCode ?? 'ALL';

  const exportCsv = () => {
    if (!cur) return;
    const rowsOf = (s) =>
      tab === 'bs'
        ? s.balanceSheet.lines
        : tab === 'is'
          ? s.incomeStatement.lines
          : tab === 'cf'
            ? s.cashFlow.lines
            : null;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let csv;
    if (tab === 'ce') {
      csv = [
        'Equity,Opening,Result,Movements,Closing',
        ...[...cur.changesInEquity.columns, cur.changesInEquity.total].map((c) =>
          [esc(c.label), c.opening, c.result, c.movements, c.closing].join(',')
        ),
      ].join('\n');
    } else {
      const head = [
        'Line',
        'Account',
        `${cur.year} P${cur.fromPeriod}-P${cur.toPeriod}`,
        ...(cmp ? [`${cmp.year} P${cmp.fromPeriod}-P${cmp.toPeriod}`] : []),
      ].join(',');
      const out = [head];
      rowsOf(cur).forEach((l) => {
        const c = cmp ? rowsOf(cmp).find((x) => x.key === l.key) : null;
        out.push(
          [
            esc(l.label),
            '',
            l.kind === 'heading' ? '' : l.amount,
            ...(cmp ? [l.kind === 'heading' ? '' : (c?.amount ?? 0)] : []),
          ].join(',')
        );
        l.accounts.forEach((a) =>
          out.push(
            [
              esc(''),
              esc(`${a.code} ${a.name}`),
              a.amount,
              ...(cmp ? [c?.accounts.find((x) => x.accountId === a.accountId)?.amount ?? 0] : []),
            ].join(',')
          )
        );
      });
      csv = out.join('\n');
    }
    downloadText(
      csv,
      `${{ bs: 'balance-sheet', is: 'income-statement', ce: 'changes-in-equity', cf: 'cash-flow' }[tab]}-${bookCode}-${year}-p${from}-p${to}.csv`
    );
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            select
            size="small"
            label={t('st.book', 'Book')}
            value={book}
            onChange={(e) => setBook(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">{t('st.all', 'All books (SAR, not consolidated)')}</MenuItem>
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={t('st.year', 'Year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 110 }}
          />
          <TextField
            select
            size="small"
            label={t('st.from', 'From period')}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            sx={{ width: 130 }}
          >
            {Array.from({ length: 14 }, (_, i) => i).map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('st.to', 'To period')}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            sx={{ width: 130 }}
          >
            {Array.from({ length: 14 }, (_, i) => i).map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={compare} onChange={(e) => setCompare(e.target.checked)} />}
            label={t('st.compare', 'Compare with a year earlier')}
          />
          <Button
            color="inherit"
            startIcon={<Iconify icon="solar:export-bold" />}
            onClick={exportCsv}
            disabled={!cur}
          >
            {t('st.export', 'Export CSV')}
          </Button>
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable">
        <Tab value="bs" label={t('st.bs', 'Balance sheet')} />
        <Tab value="is" label={t('st.is', 'Income statement')} />
        <Tab value="ce" label={t('st.ce', 'Changes in equity')} />
        <Tab value="cf" label={t('st.cf', 'Cash flows')} />
      </Tabs>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{fahError(error)}</Alert>}

      {cur && tab === 'bs' && (
        <Statement
          title={t('st.bsAt', 'Balance sheet as at {{date}}', { date: cur.toDate })}
          check={
            cur.balanceSheet.difference === 0
              ? t('st.balances', 'Assets = equity + liabilities')
              : t('st.bsOff', 'Out of balance by {{n}}', {
                  n: fAmount(cur.balanceSheet.difference),
                })
          }
          ok={cur.balanceSheet.difference === 0}
          lines={cur.balanceSheet.lines}
          compareLines={cmp?.balanceSheet.lines}
          cur={cur}
          cmp={cmp}
          ledgerHref={ledgerHref}
          note={t(
            'st.bsNote',
            'Results of earlier years stay as a separate equity line until the year-end closing journal moves them into retained earnings. Combining books does not eliminate inter-entity balances (1300/2400).'
          )}
        />
      )}
      {cur && tab === 'is' && (
        <Statement
          title={t('st.isFor', 'Income statement, {{from}} to {{to}}', {
            from: cur.fromDate,
            to: cur.toDate,
          })}
          lines={cur.incomeStatement.lines}
          compareLines={cmp?.incomeStatement.lines}
          cur={cur}
          cmp={cmp}
          ledgerHref={ledgerHref}
          note={t(
            'st.isNote',
            'Inter-practice charges, profit share and allocations cancel at company level and are left out. Practice results are under Inter-practice → Practice results.'
          )}
        />
      )}
      {cur && tab === 'cf' && (
        <Statement
          title={t('st.cfFor', 'Cash flows (indirect), {{from}} to {{to}}', {
            from: cur.fromDate,
            to: cur.toDate,
          })}
          check={
            cur.cashFlow.difference === 0
              ? t('st.cfTies', 'Ties to the change in cash')
              : t('st.cfOff', 'Differs from the change in cash by {{n}}', {
                  n: fAmount(cur.cashFlow.difference),
                })
          }
          ok={cur.cashFlow.difference === 0}
          lines={cur.cashFlow.lines}
          compareLines={cmp?.cashFlow.lines}
          cur={cur}
          cmp={cmp}
          ledgerHref={ledgerHref}
          note={t(
            'st.cfNote',
            'From each account’s cash-flow category. Cash includes bank, cash on hand and receipts and payments clearing (1025). A movement shows its cash effect: an increase in an asset uses cash.'
          )}
        />
      )}
      {cur && tab === 'ce' && <Equity cur={cur} />}
    </Stack>
  );
}

function Statement({ title, check, ok, lines, compareLines, cur, cmp, ledgerHref, note }) {
  const { t } = useFahT();
  const [open, setOpen] = useState({});
  return (
    <Card>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
        <Typography variant="subtitle1">{title}</Typography>
        {check && (
          <Label variant="soft" color={ok ? 'success' : 'error'}>
            {check}
          </Label>
        )}
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">{`${cur.year} · P${cur.fromPeriod}–P${cur.toPeriod}`}</TableCell>
              {cmp && (
                <TableCell align="right">{`${cmp.year} · P${cmp.fromPeriod}–P${cmp.toPeriod}`}</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l) => {
              const c = compareLines?.find((x) => x.key === l.key);
              if (l.kind === 'heading') {
                return (
                  <TableRow key={l.key}>
                    <TableCell
                      colSpan={cmp ? 3 : 2}
                      sx={{
                        pt: 2.5,
                        fontWeight: 700,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        fontSize: 12,
                        letterSpacing: 0.5,
                      }}
                    >
                      {l.label}
                    </TableCell>
                  </TableRow>
                );
              }
              const total = l.kind === 'total';
              return (
                <Fragment key={l.key}>
                  <TableRow sx={total ? { bgcolor: 'background.neutral' } : undefined}>
                    <TableCell sx={{ fontWeight: total ? 700 : 400 }}>
                      {l.accounts.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => setOpen((o) => ({ ...o, [l.key]: !o[l.key] }))}
                          sx={{ mr: 0.5 }}
                        >
                          <Iconify
                            icon={
                              open[l.key]
                                ? 'eva:arrow-ios-downward-fill'
                                : 'eva:arrow-ios-forward-fill'
                            }
                            width={16}
                          />
                        </IconButton>
                      )}
                      {l.label}
                    </TableCell>
                    <TableCell align="right" sx={{ ...num, fontWeight: total ? 700 : 400 }}>
                      {fAmount(l.amount)}
                    </TableCell>
                    {cmp && (
                      <TableCell
                        align="right"
                        sx={{ ...num, fontWeight: total ? 700 : 400, color: 'text.secondary' }}
                      >
                        {fAmount(c?.amount ?? 0)}
                      </TableCell>
                    )}
                  </TableRow>
                  {open[l.key] &&
                    l.accounts.map((a) => (
                      <TableRow key={`${l.key}-${a.accountId}`}>
                        <TableCell sx={{ pl: 7 }}>
                          <Link
                            component={RouterLink}
                            href={ledgerHref(a.accountId, cur)}
                            variant="body2"
                          >
                            {a.code} {a.name}
                          </Link>
                        </TableCell>
                        <TableCell align="right" sx={num}>
                          {fAmount(a.amount)}
                        </TableCell>
                        {cmp && (
                          <TableCell align="right" sx={{ ...num, color: 'text.secondary' }}>
                            {fAmount(
                              c?.accounts.find((x) => x.accountId === a.accountId)?.amount ?? 0
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {note} {t('st.drill', 'Open a line to see its accounts; an account opens its ledger.')}
      </Typography>
    </Card>
  );
}

function Equity({ cur }) {
  const { t } = useFahT();
  const { columns, total } = cur.changesInEquity;
  const rowsOut = [...columns, total];
  return (
    <Card>
      <Typography variant="subtitle1" sx={{ p: 2.5 }}>
        {t('st.ceFor', 'Changes in equity, {{from}} to {{to}}', {
          from: cur.fromDate,
          to: cur.toDate,
        })}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('st.equity', 'Equity')}</TableCell>
              <TableCell align="right">{t('st.opening', 'Opening')}</TableCell>
              <TableCell align="right">{t('st.result', 'Result for the period')}</TableCell>
              <TableCell align="right">{t('st.movements', 'Other movements')}</TableCell>
              <TableCell align="right">{t('st.closing', 'Closing')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsOut.map((c) => (
              <TableRow
                key={c.key}
                sx={c.key === 'total' ? { bgcolor: 'background.neutral' } : undefined}
              >
                <TableCell sx={{ fontWeight: c.key === 'total' ? 700 : 400 }}>{c.label}</TableCell>
                {['opening', 'result', 'movements', 'closing'].map((k) => (
                  <TableCell
                    key={k}
                    align="right"
                    sx={{ ...num, fontWeight: c.key === 'total' ? 700 : 400 }}
                  >
                    {fAmount(c[k], { blankZero: c.key !== 'total' })}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {t(
          'st.ceNote',
          'Opening is everything before the first period of the range. Results accumulate in "Results not yet closed" until the year-end closing journal.'
        )}
      </Typography>
    </Card>
  );
}
