'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
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
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, useJournals, useFahCatalog } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { fAmount, JOURNAL_TYPE, JOURNAL_STATUS, JOURNAL_STATUS_ORDER } from '../fah-labels';

// ----------------------------------------------------------------------

export function JournalListView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('journals.title', 'Journals')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('nav.journals', 'Journals') },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.finance.accounting.journalNew}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            {t('journals.new', 'New journal')}
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{() => <JournalList />}</FahGate>
    </DashboardContent>
  );
}

function JournalList() {
  const { t, nameOf } = useFahT();
  const router = useRouter();
  const { entities } = useFahCatalog();
  const [status, setStatus] = useState('');
  const [book, setBook] = useState('');
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [pageNo, setPageNo] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const q = useDebounce(search, 350);

  const params = {
    status: status || undefined,
    legalEntityId: book || undefined,
    q: q || undefined,
    mine: mine || undefined,
    offset: pageNo * rowsPerPage,
    limit: rowsPerPage,
  };
  const { journals, total, counts, error, loading, validating } = useJournals(params);
  const countOf = (s) => counts.find((c) => c.status === s)?.count ?? 0;
  const all = counts.reduce((sum, c) => sum + c.count, 0);
  const bookCode = (id) => entities.find((e) => e.id === id)?.shortCode ?? '';

  return (
    <Card component={m.div} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <Tabs
        value={status}
        onChange={(e, v) => {
          setStatus(v);
          setPageNo(0);
        }}
        variant="scrollable"
        sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
      >
        <Tab
          value=""
          iconPosition="end"
          label={t('journals.all', 'All')}
          icon={<Label variant="filled">{all}</Label>}
        />
        {JOURNAL_STATUS_ORDER.map((s) => (
          <Tab
            key={s}
            value={s}
            iconPosition="end"
            label={t(`status.${s}`, JOURNAL_STATUS[s].label)}
            icon={
              <Label variant={s === status ? 'filled' : 'soft'} color={JOURNAL_STATUS[s].color}>
                {countOf(s)}
              </Label>
            }
          />
        ))}
      </Tabs>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        sx={{ p: 2.5 }}
      >
        <TextField
          fullWidth
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPageNo(0);
          }}
          placeholder={t('journals.search', 'Search number, description or reference…')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label={t('journals.book', 'Book')}
          value={book}
          onChange={(e) => {
            setBook(e.target.value);
            setPageNo(0);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('journals.allBooks', 'All books')}</MenuItem>
          {entities.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.shortCode} · {nameOf(e)}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          sx={{ flexShrink: 0 }}
          control={<Switch checked={mine} onChange={(e) => setMine(e.target.checked)} />}
          label={t('journals.mine', 'Mine')}
        />
      </Stack>

      <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 960 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('journals.number', 'Number')}</TableCell>
              <TableCell>{t('journals.date', 'Date')}</TableCell>
              <TableCell>{t('journals.description', 'Description')}</TableCell>
              <TableCell>{t('journals.type', 'Type')}</TableCell>
              <TableCell align="right">{t('journals.amount', 'Amount')}</TableCell>
              <TableCell>{t('journals.preparedBy', 'Prepared by')}</TableCell>
              <TableCell>{t('journals.status', 'Status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {journals.map((j, index) => {
              const st = JOURNAL_STATUS[j.status] ?? JOURNAL_STATUS.DRAFT;
              return (
                <TableRow
                  key={j.id}
                  hover
                  component={m.tr}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.02 }}
                  onClick={() => router.push(paths.dashboard.finance.accounting.journal(j.id))}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                      {j.journalNumber ?? t('journals.unnumbered', 'Not posted')}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {bookCode(j.legalEntityId)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{j.journalDate}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" noWrap>
                      {j.description}
                    </Typography>
                    {j.reference && (
                      <Typography variant="caption" color="text.secondary">
                        {j.reference}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {t(`type.${j.journalType}`, JOURNAL_TYPE[j.journalType] ?? j.journalType)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fAmount(j.totalDebit)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {j.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={st.color} startIcon={<Iconify icon={st.icon} />}>
                      {t(`status.${j.status}`, st.label)}
                    </Label>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && !journals.length && (
        <EmptyContent
          title={t('journals.empty', 'No journals here yet')}
          description={t(
            'journals.emptyHelp',
            'Manual journals, opening balances, reversals and the journals posted from the ERP appear here.'
          )}
          sx={{ py: 8 }}
        />
      )}

      <TablePagination
        component="div"
        count={total}
        page={pageNo}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(e, p) => setPageNo(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPageNo(0);
        }}
      />
    </Card>
  );
}
