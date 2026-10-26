'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { fahError, postAllocation, reverseAllocation, useAllocationMonth } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { fAmount, DRIVER_BASIS, ALLOCATION_DRIVER, ALLOCATION_METHOD } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/** How a centre is spread, in words: "Step-down by headcount, this month". */
export function ruleSummary(t, c) {
  const method = ALLOCATION_METHOD[c.method]?.label ?? c.method;
  if (!c.driver) return t(`alloc.method.${c.method}`, method);
  return `${t(`alloc.method.${c.method}`, method)} · ${t(
    `alloc.driver.${c.driver}`,
    ALLOCATION_DRIVER[c.driver]?.label ?? c.driver
  ).toLowerCase()}, ${t(`alloc.basis.${c.basis}`, DRIVER_BASIS[c.basis] ?? c.basis).toLowerCase()}`;
}

/** The month's preview, and posting, re-running or reversing it (FR-CC-2, FR-CC-4). */
export function AllocationRun({ me, bookId, periodId }) {
  const { t } = useFahT();
  const { month, error, loading, validating } = useAllocationMonth(bookId, periodId);
  const [confirm, setConfirm] = useState(null); // 'post' | 'reverse'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{fahError(error)}</Alert>;
  if (!month) return null;

  const { preview, run, upToDate, canPost, period } = month;
  const moving = preview.centres.filter((c) => c.shares.length);
  const idle = preview.centres.filter((c) => !c.shares.length && !c.problem);
  const blocked = preview.problems.length > 0;

  const handlePost = async () => {
    setBusy(true);
    try {
      await postAllocation({
        legalEntityId: bookId,
        periodId,
        expectedRunId: run?.id ?? null,
        note,
      });
      toast.success(
        run
          ? t(
              'alloc.rerun.done',
              'Re-run: the previous allocation was reversed and the new one posted'
            )
          : t('alloc.post.done', 'Allocation posted')
      );
      setConfirm(null);
      setNote('');
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async () => {
    setBusy(true);
    try {
      await reverseAllocation(run.id);
      toast.success(t('alloc.reverse.done', 'Allocation reversed'));
      setConfirm(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{period.name}</Typography>
              {run ? (
                <Label variant="soft" color={upToDate ? 'success' : 'warning'}>
                  {upToDate
                    ? t('alloc.status.posted', 'Allocated')
                    : t('alloc.status.stale', 'Allocated · out of date')}
                </Label>
              ) : (
                <Label variant="soft">{t('alloc.status.none', 'Not allocated')}</Label>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {run
                ? t('alloc.postedBy', 'SAR {{total}} posted by {{who}}, {{when}}', {
                    total: fAmount(run.total),
                    who: run.postedBy,
                    when: fDateTime(run.postedAt),
                  })
                : t('alloc.previewNote', 'The preview below is what posting would do now.')}
              {run && !upToDate
                ? ` ${t('alloc.staleNote', 'Costs, drivers or rules changed since: re-run to bring it up to date.')}`
                : ''}
            </Typography>
          </Box>
          {me.canPrepare && (
            <Stack direction="row" spacing={1}>
              {run && (
                <Button
                  color="inherit"
                  variant="outlined"
                  disabled={!canPost}
                  onClick={() => setConfirm('reverse')}
                >
                  {t('alloc.reverse.action', 'Reverse')}
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<Iconify icon={run ? 'solar:restart-bold' : 'solar:share-bold'} />}
                disabled={!canPost || blocked || (!run && !moving.length) || (run && upToDate)}
                onClick={() => setConfirm('post')}
              >
                {run
                  ? t('alloc.rerun.action', 'Re-run')
                  : t('alloc.post.action', 'Post allocation')}
              </Button>
            </Stack>
          )}
        </Stack>
        {!canPost && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t(
              'alloc.closedNote',
              'This month does not take postings. Open it in Periods to allocate it.'
            )}
          </Alert>
        )}
      </Card>

      {blocked && (
        <Alert severity="warning">
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {t('alloc.blocked', 'The month cannot be allocated yet')}
          </Typography>
          {preview.problems.map((p) => (
            <Typography key={p.costCentreId} variant="body2">
              <b>{p.code}</b>: {p.message}
            </Typography>
          ))}
        </Alert>
      )}

      {preview.byPractice.length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            {t('alloc.byPractice', 'Shared cost each practice carries')}
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            {preview.byPractice.map((p) => (
              <Box key={p.practiceId}>
                <Typography variant="caption" color="text.secondary">
                  {p.code}
                </Typography>
                <Typography variant="h6" sx={num}>
                  {fAmount(p.amount)}
                </Typography>
              </Box>
            ))}
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('alloc.total', 'Total allocated')}
              </Typography>
              <Typography variant="h6" sx={num}>
                {fAmount(preview.total)}
              </Typography>
            </Box>
          </Stack>
        </Card>
      )}

      <Card
        component={m.div}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ overflow: 'hidden' }}
      >
        <Box sx={{ height: 2 }}>{validating && <LinearProgress />}</Box>
        {moving.length || preview.problems.length ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('alloc.centre', 'Cost centre')}</TableCell>
                  <TableCell>{t('alloc.rule', 'Rule')}</TableCell>
                  <TableCell align="right">{t('alloc.direct', 'Own cost')}</TableCell>
                  <TableCell align="right">{t('alloc.received', 'Received')}</TableCell>
                  <TableCell align="right">{t('alloc.pool', 'To allocate')}</TableCell>
                  <TableCell>{t('alloc.to', 'Allocated to')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.centres
                  .filter((c) => c.shares.length || c.problem)
                  .map((c) => (
                    <TableRow key={c.costCentreId} sx={{ verticalAlign: 'top' }}>
                      <TableCell>
                        <Typography variant="subtitle2">{c.code}</Typography>
                        {c.version && (
                          <Typography variant="caption" color="text.secondary">
                            {t('alloc.version', 'Rule v{{v}}', { v: c.version })}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{ruleSummary(t, c)}</Typography>
                        {c.problem && (
                          <Typography variant="caption" color="warning.main">
                            {c.problem}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={num}>
                        {fAmount(c.direct)}
                      </TableCell>
                      <TableCell align="right" sx={num}>
                        {fAmount(c.received, { blankZero: true })}
                      </TableCell>
                      <TableCell align="right" sx={num}>
                        <b>{fAmount(c.pool)}</b>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          {c.shares.map((s) => (
                            <Stack key={s.targetId} direction="row" spacing={1}>
                              <Typography variant="body2" sx={{ minWidth: 130 }}>
                                {s.kind === 'centre' ? `→ ${s.targetCode}` : s.targetCode}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ ...num, minWidth: 64 }}
                              >
                                {s.percent} %
                              </Typography>
                              <Typography variant="body2" sx={num}>
                                {fAmount(s.amount)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyContent
            title={t('alloc.nothing', 'No shared cost this month')}
            description={t(
              'alloc.nothingHelp',
              'Shared centres (HR, Finance, offices…) have no 6xxx cost posted in {{month}}.',
              { month: period.name }
            )}
            sx={{ py: 8 }}
          />
        )}
        {idle.length > 0 && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
            {t('alloc.idle', 'No cost this month: {{codes}}', {
              codes: idle.map((c) => c.code).join(', '),
            })}
          </Typography>
        )}
      </Card>

      {run && (
        <Typography variant="body2" color="text.secondary">
          {t('alloc.journalsNote', 'Posted as {{n}} allocation journals.', {
            n: run.journalIds.length,
          })}{' '}
          <Link component={RouterLink} href={paths.dashboard.finance.accounting.journals}>
            {t('alloc.openJournals', 'Open journals')}
          </Link>
        </Typography>
      )}

      <Dialog
        open={confirm === 'post'}
        onClose={() => !busy && setConfirm(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {run
            ? t('alloc.rerun.title', 'Re-run the allocation for {{month}}?', { month: period.name })
            : t('alloc.post.title', 'Post the allocation for {{month}}?', { month: period.name })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {run
              ? t(
                  'alloc.rerun.body',
                  'The allocation posted on {{when}} is reversed in {{month}}, then SAR {{total}} is allocated again as shown.',
                  {
                    when: fDateTime(run.postedAt),
                    month: period.name,
                    total: fAmount(preview.total),
                  }
                )
              : t(
                  'alloc.post.body',
                  'SAR {{total}} of shared cost is moved to practices with one allocation journal per centre (Dr 6900 / Cr 6910). Company opex is unchanged.',
                  { total: fAmount(preview.total) }
                )}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={t('alloc.note', 'Note (optional)')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirm(null)} disabled={busy}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <LoadingButton variant="contained" loading={busy} onClick={handlePost}>
            {run ? t('alloc.rerun.action', 'Re-run') : t('alloc.post.action', 'Post allocation')}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirm === 'reverse'}
        onClose={() => !busy && setConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('alloc.reverse.title', 'Reverse the allocation?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t(
              'alloc.reverse.body',
              'Its journals are reversed in {{month}} and the shared cost goes back to the centres. Nothing is posted in its place.',
              { month: period.name }
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirm(null)} disabled={busy}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <LoadingButton color="error" variant="contained" loading={busy} onClick={handleReverse}>
            {t('alloc.reverse.action', 'Reverse')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
