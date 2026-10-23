'use client';

import { m } from 'framer-motion';
import { Suspense, useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
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
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, useLedger, useFahCatalog } from 'src/actions/fah';

import { Iconify } from 'src/components/iconify';
import { varFade } from 'src/components/animate';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { fAmount } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function LedgerView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('ledger.title', 'General ledger')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('ledger.title', 'General ledger') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={1}>
        {() => (
          <Suspense fallback={<LinearProgress />}>
            <Ledger />
          </Suspense>
        )}
      </FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function Ledger() {
  const { t, nameOf } = useFahT();
  const search = useSearchParams();
  const { entities, accounts, practices, costCentres, engagements } = useFahCatalog();

  const initial = (key) => search?.get(key) ?? '';
  const [filters, setFilters] = useState(() => ({
    legalEntityId: initial('legalEntityId'),
    accountId: initial('accountId'),
    fromDate: initial('fromDate'),
    toDate: initial('toDate'),
    practiceId: initial('practiceId'),
    costCentreId: initial('costCentreId'),
    engagementId: initial('engagementId'),
  }));
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const q = useDebounce(query.trim(), 400);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value ?? '' }));
    setPageNo(0);
  };

  const params = Object.fromEntries(
    Object.entries({ ...filters, q, offset: pageNo * rowsPerPage, limit: rowsPerPage }).filter(
      ([, v]) => v !== '' && v !== undefined
    )
  );
  const { lines, total, error, loading, validating } = useLedger(params);

  const postingAccounts = accounts.filter((a) => a.type === 'POSTING');
  const account = accounts.find((a) => a.id === filters.accountId) ?? null;
  const hasFilters = Object.values(filters).some(Boolean) || query;

  const pageDebit = lines.reduce((s, l) => s + Number(l.debitFunc ?? 0), 0);
  const pageCredit = lines.reduce((s, l) => s + Number(l.creditFunc ?? 0), 0);

  const select = (key, label, options, render) => (
    <TextField
      select
      size="small"
      label={label}
      value={filters[key]}
      onChange={(e) => setFilter(key, e.target.value)}
      sx={{ minWidth: 170 }}
    >
      <MenuItem value="">{t('ledger.any', 'Any')}</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {render(o)}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Card
      component={m.div}
      initial="initial"
      animate="animate"
      variants={varFade('inUp', { distance: 24 }).inUp}
    >
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          {select(
            'legalEntityId',
            t('ledger.book', 'Book'),
            entities,
            (e) => `${e.shortCode} · ${nameOf(e)}`
          )}
          <Autocomplete
            size="small"
            value={account}
            options={postingAccounts}
            getOptionLabel={(a) => `${a.code} ${nameOf(a)}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(e, v) => setFilter('accountId', v?.id)}
            sx={{ minWidth: 280, flexGrow: 1 }}
            renderInput={(p) => <TextField {...p} label={t('ledger.account', 'Account')} />}
          />
          <TextField
            size="small"
            type="date"
            label={t('ledger.from', 'From')}
            value={filters.fromDate}
            onChange={(e) => setFilter('fromDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label={t('ledger.to', 'To')}
            value={filters.toDate}
            onChange={(e) => setFilter('toDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          {select(
            'practiceId',
            t('ledger.practice', 'Practice'),
            practices,
            (p) => `${p.code} · ${nameOf(p)}`
          )}
          {select(
            'costCentreId',
            t('ledger.costCentre', 'Cost centre'),
            costCentres,
            (c) => `${c.code} · ${nameOf(c)}`
          )}
          {select(
            'engagementId',
            t('ledger.engagement', 'Engagement'),
            engagements,
            (e) => `${e.code} · ${e.name}`
          )}
          <TextField
            size="small"
            fullWidth
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPageNo(0);
            }}
            placeholder={t('ledger.search', 'Journal number, description or memo…')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          {hasFilters && (
            <Button
              color="inherit"
              sx={{ flexShrink: 0 }}
              onClick={() => {
                setFilters({
                  legalEntityId: '',
                  accountId: '',
                  fromDate: '',
                  toDate: '',
                  practiceId: '',
                  costCentreId: '',
                  engagementId: '',
                });
                setQuery('');
                setPageNo(0);
              }}
            >
              {t('ledger.clear', 'Clear')}
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
              <TableCell width={110}>{t('ledger.date', 'Date')}</TableCell>
              <TableCell width={190}>{t('ledger.journal', 'Journal')}</TableCell>
              <TableCell>{t('ledger.account', 'Account')}</TableCell>
              <TableCell>{t('ledger.description', 'Description')}</TableCell>
              <TableCell>{t('ledger.dimensions', 'Dimensions')}</TableCell>
              <TableCell sx={num}>{t('ledger.debit', 'Debit')}</TableCell>
              <TableCell sx={num}>{t('ledger.credit', 'Credit')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.journalDate}</TableCell>
                <TableCell>
                  <Link
                    component={RouterLink}
                    href={paths.dashboard.finance.accounting.journal(l.journalId)}
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {l.journalNumber}
                  </Link>
                  {l.journalStatus === 'REVERSED' && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('ledger.reversed', 'Reversed')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>
                      {l.accountCode}
                    </Box>
                    {l.accountNameEn}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.legalEntityShortCode}
                    {l.periodName ? ` · ${l.periodName}` : ''}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" noWrap title={l.journalDescription}>
                    {l.journalDescription}
                  </Typography>
                  {l.memo && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                      title={l.memo}
                    >
                      {l.memo}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {[
                      l.practiceCode,
                      l.costCentreCode,
                      l.engagementCode,
                      l.ipCounterpartyCode && `↔ ${l.ipCounterpartyCode}`,
                    ]
                      .filter(Boolean)
                      .map((code) => (
                        <Chip
                          key={code}
                          size="small"
                          label={code}
                          sx={{ fontFamily: 'monospace' }}
                        />
                      ))}
                  </Stack>
                </TableCell>
                <TableCell sx={num}>
                  {fAmount(l.debitFunc, { blankZero: true })}
                  {l.txnCurrency !== 'SAR' && Number(l.debitTxn) > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {l.txnCurrency} {fAmount(l.debitTxn)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={num}>
                  {fAmount(l.creditFunc, { blankZero: true })}
                  {l.txnCurrency !== 'SAR' && Number(l.creditTxn) > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {l.txnCurrency} {fAmount(l.creditTxn)}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {lines.length > 0 && (
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell colSpan={5}>
                  <Typography variant="subtitle2">
                    {t('ledger.pageTotal', 'Total on this page')}
                  </Typography>
                </TableCell>
                <TableCell sx={{ ...num, fontWeight: 600 }}>{fAmount(pageDebit)}</TableCell>
                <TableCell sx={{ ...num, fontWeight: 600 }}>{fAmount(pageCredit)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && !lines.length && !error && (
        <EmptyContent
          title={t('ledger.empty', 'No posted lines match')}
          description={t('ledger.emptyHelp', 'Only posted journals appear in the ledger.')}
          sx={{ py: 8 }}
        />
      )}

      <TablePagination
        component="div"
        count={total}
        page={pageNo}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100, 200]}
        onPageChange={(e, p) => setPageNo(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPageNo(0);
        }}
        labelRowsPerPage={t('ledger.rowsPerPage', 'Lines per page')}
      />
    </Card>
  );
}
