'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { fahError, backfill, runEngine } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useFahT } from './fah-gate';
import { EVENT_LABEL, engineSummary } from './postings-events';

// ----------------------------------------------------------------------

export function PostingsBackfill({ me }) {
  const { t } = useFahT();
  const [from, setFrom] = useState('2025-01-01');
  const [result, setResult] = useState(null);
  const [engine, setEngine] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);

  const run = async (kind, fn) => {
    setBusy(kind);
    try {
      return await fn();
    } catch (err) {
      toast.error(fahError(err));
      return null;
    } finally {
      setBusy('');
    }
  };

  const handleCount = () =>
    run('count', async () => {
      setResult(await backfill(from, true));
      setEngine(null);
    });

  const handleLoad = () =>
    run('load', async () => {
      setConfirm(false);
      const r = await backfill(from, false);
      setResult(r);
      setEngine(r.engine);
      toast.success(engineSummary(r.engine, t));
    });

  const handleRunAll = () =>
    run('engine', async () => {
      const r = await runEngine(true);
      setEngine(r);
      toast.success(engineSummary(r, t));
    });

  const counts = Object.entries(result?.counts ?? {}).sort((a, b) => b[1] - a[1]);
  const total = counts.reduce((s, [, n]) => s + n, 0);

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Typography variant="h6">{t('postings.backfill.title', 'Load ERP history')}</Typography>
        <Stack
          component="ul"
          spacing={0.75}
          sx={{ pl: 2.5, mt: 1.5, mb: 2.5, color: 'text.secondary', typography: 'body2' }}
        >
          <li>
            {t(
              'postings.backfill.what',
              'Creates an event for every approved invoice, receipt, approved expense, AP payment, wallet movement, payroll run, bank line, posted VAT and commission since the cut-over date.'
            )}
          </li>
          <li>
            {t(
              'postings.backfill.months',
              'History posts into its own month even if that month was never opened. Live activity only posts into open months.'
            )}
          </li>
          <li>
            {t(
              'postings.backfill.twice',
              'Running it again adds nothing: rows that already have an event of that kind are left out.'
            )}
          </li>
          <li>
            {t(
              'postings.backfill.after',
              'Afterwards fix the exceptions and the tagging queue, compare Reconciliation, then soft-close the reviewed months under Periods.'
            )}
          </li>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            type="date"
            label={t('postings.backfill.from', 'From')}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          />
          {me.canControl && (
            <LoadingButton
              variant="outlined"
              loading={busy === 'count'}
              disabled={!!busy || !from}
              onClick={handleCount}
              startIcon={<Iconify icon="solar:list-bold" />}
            >
              {t('postings.backfill.count', 'Count')}
            </LoadingButton>
          )}
          {me.isCfo && (
            <LoadingButton
              variant="contained"
              loading={busy === 'load'}
              disabled={!!busy || !from}
              onClick={() => setConfirm(true)}
              startIcon={<Iconify icon="solar:import-bold" />}
            >
              {t('postings.backfill.load', 'Load and post')}
            </LoadingButton>
          )}
          {me.canControl && (
            <LoadingButton
              color="inherit"
              loading={busy === 'engine'}
              disabled={!!busy}
              onClick={handleRunAll}
              startIcon={<Iconify icon="solar:play-circle-bold" />}
            >
              {t('postings.backfill.runAll', 'Run engine until done')}
            </LoadingButton>
          )}
        </Stack>
        {!me.canControl && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t(
              'postings.backfill.needsRole',
              'Counting needs a controller; loading needs the CFO.'
            )}
          </Alert>
        )}
      </Card>

      <AnimatePresence initial={false}>
        {result && (
          <Card
            component={m.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Box sx={{ p: 2.5, pb: 1 }}>
              <Typography variant="subtitle1">
                {result.dryRun
                  ? t('postings.backfill.wouldLoad', 'Would load {{n}} events from {{from}}', {
                      n: total,
                      from: result.from,
                    })
                  : t('postings.backfill.loaded', 'Loaded {{n}} events from {{from}}', {
                      n: total,
                      from: result.from,
                    })}
              </Typography>
              {engine && (
                <Typography variant="body2" color="text.secondary">
                  {engineSummary(engine, t)}
                </Typography>
              )}
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('postings.backfill.event', 'Event')}</TableCell>
                  <TableCell align="right">{t('postings.backfill.number', 'Number')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {counts.map(([type, n]) => (
                  <TableRow key={type}>
                    <TableCell>{t(`postings.event.${type}`, EVENT_LABEL[type] ?? type)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {n}
                    </TableCell>
                  </TableRow>
                ))}
                {!counts.length && (
                  <TableRow>
                    <TableCell colSpan={2} sx={{ color: 'text.secondary' }}>
                      {t('postings.backfill.none', 'Nothing new to load.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('postings.backfill.confirmTitle', 'Load and post ERP history?')}
        content={t(
          'postings.backfill.confirmContent',
          'Every ERP record since {{from}} becomes a journal in its own month. Posted journals can only be corrected by reversal.',
          { from }
        )}
        action={
          <LoadingButton variant="contained" loading={busy === 'load'} onClick={handleLoad}>
            {t('postings.backfill.load', 'Load and post')}
          </LoadingButton>
        }
      />
    </Stack>
  );
}
