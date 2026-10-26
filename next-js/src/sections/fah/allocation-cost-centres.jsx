'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fahError, useCostCentreReport } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/**
 * Cost-centre report: each centre's own cost, what it received and sent in
 * allocations, and what it still carries. A shared centre nets to zero once
 * its month is allocated (FR-CC-5, ±1 SAR).
 */
export function CostCentreReport({ bookId, period }) {
  const { t, nameOf } = useFahT();
  const [range, setRange] = useState('month');
  const { rows, error, loading } = useCostCentreReport({
    legalEntityId: bookId,
    year: period.year,
    fromPeriod: range === 'month' ? period.periodNo : 1,
    toPeriod: period.periodNo,
  });

  const total = (key) => rows.reduce((s, r) => s + r[key], 0);

  return (
    <Card>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
        <Typography variant="subtitle1">
          {range === 'month'
            ? period.name
            : t('centres.ytd', '{{year}} to {{month}}', { year: period.year, month: period.name })}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(e, v) => v && setRange(v)}
        >
          <ToggleButton value="month">{t('centres.month', 'Month')}</ToggleButton>
          <ToggleButton value="ytd">{t('centres.ytdShort', 'Year to date')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !rows.length ? (
        <EmptyContent
          title={t('centres.empty', 'No cost on any cost centre')}
          description={t(
            'centres.emptyHelp',
            'Costs appear here once expenses on a cost centre are posted.'
          )}
          sx={{ py: 8 }}
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('centres.centre', 'Cost centre')}</TableCell>
              <TableCell align="right">{t('centres.direct', 'Own cost')}</TableCell>
              <TableCell align="right">{t('centres.in', 'Received')}</TableCell>
              <TableCell align="right">{t('centres.out', 'Allocated out')}</TableCell>
              <TableCell align="right">{t('centres.net', 'Still carries')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const open = r.kind === 'SHARED' && Math.abs(r.net) > 1;
              return (
                <TableRow key={r.costCentreId}>
                  <TableCell>
                    <Typography variant="subtitle2">{r.code}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nameOf(r) || r.nameEn}
                      {r.kind === 'PRACTICE_OVERHEAD'
                        ? ` · ${t('centres.overhead', 'practice overhead, stays on its practice')}`
                        : ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.direct, { blankZero: true })}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.allocatedIn, { blankZero: true })}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.allocatedOut, { blankZero: true })}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {open ? (
                      <Label variant="soft" color="warning" sx={num}>
                        {fAmount(r.net)}
                      </Label>
                    ) : (
                      fAmount(r.net, { blankZero: r.kind === 'SHARED' })
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell>
                <b>{t('centres.total', 'Total')}</b>
              </TableCell>
              {['direct', 'allocatedIn', 'allocatedOut', 'net'].map((k) => (
                <TableCell key={k} align="right" sx={num}>
                  <b>{fAmount(total(k))}</b>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )}
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {t(
          'centres.note',
          'A shared centre still carrying cost after its month is allocated is flagged; hard close (Phase 5) requires it to be zero within SAR 1.'
        )}
      </Typography>
    </Card>
  );
}
