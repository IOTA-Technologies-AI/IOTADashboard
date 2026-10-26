'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
import LoadingButton from '@mui/lab/LoadingButton';

import { fahError, useFahCatalog, allocationWhatIf, useAllocationMonth } from 'src/actions/fah';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';
import { ruleSummary } from './allocation-run';
import { RuleDialog } from './allocation-rules';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/**
 * What-if (FR-CC-7): the month allocated with other rules for one or more
 * centres, side by side with the rules in force. Nothing is posted or saved.
 */
export function AllocationWhatIf({ bookId, periodId }) {
  const { t } = useFahT();
  const { costCentres } = useFahCatalog();
  const { month } = useAllocationMonth(bookId, periodId);
  const [alternatives, setAlternatives] = useState([]); // RuleInput[]
  const [picking, setPicking] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const shared = costCentres.filter((c) => c.kind === 'SHARED');
  const centre = shared.find((c) => c.id === picking);
  const current = month?.rules.find((r) => r.sourceCostCentreId === picking) ?? null;
  const codeOf = (id) => shared.find((c) => c.id === id)?.code ?? '';

  const compare = async (rules) => {
    setBusy(true);
    setError('');
    try {
      setResult(await allocationWhatIf({ legalEntityId: bookId, periodId, rules }));
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1">
          {t('whatIf.title', 'What if a centre were allocated differently?')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'whatIf.help',
            'Choose a centre and another rule for {{month}}. The month is recomputed with it and compared with the rules in force. Nothing is posted or saved.',
            { month: month?.period.name ?? '' }
          )}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            size="small"
            label={t('whatIf.centre', 'Cost centre')}
            value=""
            onChange={(e) => setPicking(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            {shared.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {alternatives.map((r) => (
              <Chip
                key={r.sourceCostCentreId}
                label={`${codeOf(r.sourceCostCentreId)}: ${ruleSummary(t, { ...r, basis: r.driverBasis })}`}
                onDelete={() => {
                  const next = alternatives.filter(
                    (x) => x.sourceCostCentreId !== r.sourceCostCentreId
                  );
                  setAlternatives(next);
                  if (next.length) compare(next);
                  else setResult(null);
                }}
              />
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          {alternatives.length > 0 && (
            <LoadingButton variant="outlined" loading={busy} onClick={() => compare(alternatives)}>
              {t('whatIf.refresh', 'Compare again')}
            </LoadingButton>
          )}
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('whatIf.practice', 'Practice')}</TableCell>
                <TableCell align="right">{t('whatIf.current', 'Rules in force')}</TableCell>
                <TableCell align="right">{t('whatIf.alternative', 'What-if')}</TableCell>
                <TableCell align="right">{t('whatIf.difference', 'Difference')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.practices.map((p) => (
                <TableRow key={p.practiceId}>
                  <TableCell>{p.code}</TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(p.current)}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(p.alternative)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...num,
                      color:
                        p.difference > 0
                          ? 'error.main'
                          : p.difference < 0
                            ? 'success.main'
                            : 'text.secondary',
                    }}
                  >
                    {p.difference > 0 ? '+' : ''}
                    {fAmount(p.difference)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <b>{t('whatIf.total', 'Total')}</b>
                </TableCell>
                <TableCell align="right" sx={num}>
                  <b>{fAmount(result.current.total)}</b>
                </TableCell>
                <TableCell align="right" sx={num}>
                  <b>{fAmount(result.alternative.total)}</b>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          {result.alternative.problems.length > 0 && (
            <Alert severity="warning" sx={{ m: 2 }}>
              {result.alternative.problems.map((p) => (
                <div key={p.costCentreId}>
                  <b>{p.code}</b>: {p.message}
                </div>
              ))}
            </Alert>
          )}
        </Card>
      )}

      <RuleDialog
        whatIf
        open={Boolean(centre)}
        centre={centre}
        rule={alternatives.find((r) => r.sourceCostCentreId === picking) ?? current}
        onClose={() => setPicking('')}
        onSubmit={async (input) => {
          const next = [
            ...alternatives.filter((x) => x.sourceCostCentreId !== input.sourceCostCentreId),
            input,
          ];
          setAlternatives(next);
          await compare(next);
        }}
      />
    </Stack>
  );
}
