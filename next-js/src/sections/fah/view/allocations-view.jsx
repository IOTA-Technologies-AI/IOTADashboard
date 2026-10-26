'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { usePeriods, useFahCatalog } from 'src/actions/fah';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { AllocationRun } from '../allocation-run';
import { AllocationRules } from '../allocation-rules';
import { AllocationWhatIf } from '../allocation-what-if';
import { AllocationHistory } from '../allocation-history';
import { AllocationDrivers } from '../allocation-drivers';
import { CostCentreReport } from '../allocation-cost-centres';

// ----------------------------------------------------------------------

/**
 * Accounting → Allocations (Phase 3, requirements §8.2): a month's driver
 * values, its shared-cost allocation (preview, post, re-run), the rules by
 * version, what-if, the cost-centre report and the run history (audit).
 */
export function AllocationsView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('alloc.title', 'Allocations')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('alloc.title', 'Allocations') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{(me) => <Allocations me={me} />}</FahGate>
    </DashboardContent>
  );
}

function Allocations({ me }) {
  const { t, nameOf } = useFahT();
  const { entities, loading: catalogLoading } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [tab, setTab] = useState('run');
  const [bookId, setBookId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodId, setPeriodId] = useState('');

  useEffect(() => {
    if (!bookId && books.length) setBookId(books[0].id);
  }, [books, bookId]);

  const { periods, years } = usePeriods(bookId, year);
  const months = periods.filter((p) => p.periodNo >= 1 && p.periodNo <= 12);

  useEffect(() => {
    if (years.length && !years.includes(year)) {
      const current = new Date().getFullYear();
      setYear(years.includes(current) ? current : years[years.length - 1]);
    }
  }, [years, year]);

  // Default to the latest month that takes postings, else the current month.
  useEffect(() => {
    if (!months.length || months.some((p) => p.id === periodId)) return;
    const open = months.filter((p) => ['OPEN', 'SOFT_CLOSED'].includes(p.status));
    const now = new Date().getMonth() + 1;
    const pick = open[open.length - 1] ?? months.find((p) => p.periodNo === now) ?? months[0];
    setPeriodId(pick.id);
  }, [months, periodId]);

  const period = months.find((p) => p.id === periodId) ?? null;
  const needsMonth = !['rules', 'history'].includes(tab);

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            size="small"
            label={t('alloc.book', 'Book')}
            value={books.some((b) => b.id === bookId) ? bookId : ''}
            onChange={(e) => {
              setBookId(e.target.value);
              setPeriodId('');
            }}
            disabled={catalogLoading}
            sx={{ minWidth: { sm: 260 } }}
          >
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('alloc.year', 'Year')}
            value={years.includes(year) ? year : ''}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPeriodId('');
            }}
            sx={{ minWidth: 120 }}
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
            label={t('alloc.month', 'Month')}
            value={period ? periodId : ''}
            onChange={(e) => setPeriodId(e.target.value)}
            disabled={!needsMonth}
            sx={{ minWidth: 200 }}
          >
            {months.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} · {t(`periodStatus.${p.status}`, p.status.replace('_', ' ').toLowerCase())}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable">
        <Tab value="run" label={t('alloc.tabRun', 'Allocation')} />
        <Tab value="drivers" label={t('alloc.tabDrivers', 'Drivers')} />
        <Tab value="rules" label={t('alloc.tabRules', 'Rules')} />
        <Tab value="whatif" label={t('alloc.tabWhatIf', 'What-if')} />
        <Tab value="centres" label={t('alloc.tabCentres', 'Cost centres')} />
        <Tab value="history" label={t('alloc.tabHistory', 'History')} />
      </Tabs>

      {tab === 'run' && period && <AllocationRun me={me} bookId={bookId} periodId={periodId} />}
      {tab === 'drivers' && period && <AllocationDrivers me={me} bookId={bookId} period={period} />}
      {tab === 'rules' && <AllocationRules me={me} />}
      {tab === 'whatif' && period && <AllocationWhatIf bookId={bookId} periodId={periodId} />}
      {tab === 'centres' && period && <CostCentreReport bookId={bookId} period={period} />}
      {tab === 'history' && bookId && <AllocationHistory bookId={bookId} />}
    </Stack>
  );
}
