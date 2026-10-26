'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { fahError, useIpMatrix, useFahCatalog, usePracticeResults } from 'src/actions/fah';

import { Label } from 'src/components/label';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const COLUMNS = [
  ['externalRevenue', 'Revenue'],
  ['ipRevenue', 'Inter-practice revenue'],
  ['profitShareIn', 'Profit share in'],
  ['profitShareOut', 'Profit share out'],
  ['directCost', 'Direct cost'],
  ['ipCost', 'Inter-practice cost'],
  ['overhead', 'Own overhead'],
  ['allocated', 'Allocated shared cost'],
  ['other', 'Other'],
  ['result', 'Result'],
];

/** Each practice's result (FR-RC-2) and the inter-practice matrix (FR-IP-4). */
export function IpResults() {
  const { t, nameOf } = useFahT();
  const { entities, practices } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [book, setBook] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(new Date().getMonth() + 1);
  const params = { year, fromPeriod: from, toPeriod: to, ...(book ? { legalEntityId: book } : {}) };
  const { results, error, loading } = usePracticeResults(params);
  const { matrix } = useIpMatrix(book ? params : null);
  const code = (id) => practices.find((p) => p.id === id)?.code ?? '';

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            size="small"
            label={t('res.book', 'Book')}
            value={book}
            onChange={(e) => setBook(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">{t('res.all', 'All books (SAR)')}</MenuItem>
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={t('res.year', 'Year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 110 }}
          />
          <TextField
            select
            size="small"
            label={t('res.from', 'From')}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            sx={{ width: 110 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('res.to', 'To')}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            sx={{ width: 110 }}
          >
            {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      <Card>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1">{t('res.title', 'Practice results')}</Typography>
          {results && (
            <Label variant="soft" color={results.internalNet === 0 ? 'success' : 'error'}>
              {results.internalNet === 0
                ? t('res.internalOk', 'Internal amounts cancel')
                : t('res.internalOff', 'Internal amounts off by {{n}}', {
                    n: fAmount(results.internalNet),
                  })}
            </Label>
          )}
        </Stack>
        {loading && <LinearProgress />}
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(error)}
          </Alert>
        )}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('res.practice', 'Practice')}</TableCell>
                {COLUMNS.map(([k, label]) => (
                  <TableCell key={k} align="right">
                    {t(`res.${k}`, label)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(results?.rows ?? []).map((r) => (
                <TableRow key={r.code}>
                  <TableCell>
                    {r.practiceId
                      ? r.code
                      : t('res.unallocated', 'Shared centres, not yet allocated')}
                  </TableCell>
                  {COLUMNS.map(([k]) => (
                    <TableCell
                      key={k}
                      align="right"
                      sx={{ ...num, fontWeight: k === 'result' ? 600 : 400 }}
                    >
                      {fAmount(r[k], { blankZero: k !== 'result' })}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {results && (
                <TableRow>
                  <TableCell>
                    <b>{t('res.company', 'Company result')}</b>
                  </TableCell>
                  {COLUMNS.map(([k]) => (
                    <TableCell key={k} align="right" sx={num}>
                      {k === 'result' ? <b>{fAmount(results.companyResult)}</b> : ''}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
          {t(
            'res.note',
            'Result = revenue + inter-practice revenue + profit share in − profit share out − direct cost − inter-practice cost − own overhead − allocated − other. Inter-practice and profit-share amounts cancel between practices, so the rows add up to the company result (IFRS 8 eliminations).'
          )}
        </Typography>
      </Card>

      {book && matrix && (
        <Card>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1">{t('res.matrix', 'Inter-practice matrix')}</Typography>
            <Label variant="soft" color={matrix.balanced ? 'success' : 'error'}>
              {matrix.balanced
                ? t('res.balanced', '4900 = 5900 and 4950 = 4951')
                : t('res.unbalanced', 'Out of balance')}
            </Label>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('res.provider', 'Provider')}</TableCell>
                <TableCell>{t('res.consumer', 'Consumer')}</TableCell>
                <TableCell align="right">4900</TableCell>
                <TableCell align="right">5900</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.cells.map((c) => (
                <TableRow key={`${c.providerPracticeId}-${c.consumerPracticeId}`}>
                  <TableCell>{code(c.providerPracticeId)}</TableCell>
                  <TableCell>{code(c.consumerPracticeId)}</TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(c.revenue4900)}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(c.cost5900)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2}>
                  {t('res.psTotals', 'Profit share: 4950 {{out}} · 4951 {{in}}', {
                    out: fAmount(matrix.totals.profitShareOut4950),
                    in: fAmount(matrix.totals.profitShareIn4951),
                  })}
                </TableCell>
                <TableCell align="right" sx={num}>
                  <b>{fAmount(matrix.totals.revenue4900)}</b>
                </TableCell>
                <TableCell align="right" sx={num}>
                  <b>{fAmount(matrix.totals.cost5900)}</b>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
