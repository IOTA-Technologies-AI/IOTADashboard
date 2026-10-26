'use client';

import { m } from 'framer-motion';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  useFahCatalog,
  useReimbursements,
  recordReimbursement,
  useReimbursementsOwed,
  repostCompanyPaidExpenses,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { today, fAmount } from '../fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function ReimbursementsView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('reimb.title', 'Reimbursements')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('reimb.title', 'Reimbursements') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{(me) => <Reimbursements me={me} />}</FahGate>
    </DashboardContent>
  );
}

function Reimbursements({ me }) {
  const { t } = useFahT();
  const { entities } = useFahCatalog();
  const owed = useReimbursementsOwed();
  const history = useReimbursements();
  const [dialog, setDialog] = useState(null); // { employee } | {}
  const bookCode = (id) => entities.find((e) => e.id === id)?.shortCode ?? '';
  const nameOfEmployee = (id) =>
    owed.employees.find((o) => o.employeeId === id)?.employeeName || id;

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        {t(
          'reimb.info',
          'IOTA pays expenses directly: an approved expense credits payments clearing (1025) until its bank payment matches. This page is for the rare expense an employee paid themselves (2105): cash reimbursements credit cash on hand (1010), bank transfers 1025.'
        )}
      </Alert>

      {me.canControl && owed.employees.some((o) => o.owed > 0) && <CompanyPaidCard />}

      <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 2.5 }}
        >
          <Typography variant="h6">{t('reimb.owed', 'Owed to employees')}</Typography>
          {me.canPrepare && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setDialog({})}
            >
              {t('reimb.record', 'Record reimbursement')}
            </Button>
          )}
        </Stack>
        <Box sx={{ height: 2 }}>{owed.loading && <LinearProgress />}</Box>
        {owed.error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(owed.error)}
          </Alert>
        )}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('reimb.employee', 'Employee')}</TableCell>
                <TableCell>{t('reimb.book', 'Book')}</TableCell>
                <TableCell align="right">{t('reimb.amountOwed', 'Owed (SAR)')}</TableCell>
                <TableCell width={200} />
              </TableRow>
            </TableHead>
            <TableBody>
              {owed.employees.map((o, i) => (
                <TableRow
                  key={`${o.legalEntityId}-${o.employeeId}`}
                  component={m.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                >
                  <TableCell>
                    <Typography variant="body2">{o.employeeName || o.employeeId}</Typography>
                    {o.employeeName && (
                      <Typography variant="caption" color="text.disabled">
                        {o.employeeId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{bookCode(o.legalEntityId)}</TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(o.owed)}
                  </TableCell>
                  <TableCell align="right">
                    {me.canPrepare && o.owed > 0 && (
                      <Button size="small" onClick={() => setDialog({ employee: o })}>
                        {t('reimb.reimburse', 'Reimburse')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!owed.loading && !owed.employees.length && (
          <EmptyContent
            title={t('reimb.nothingOwed', 'Nothing is owed to employees')}
            sx={{ py: 6 }}
          />
        )}
      </Card>

      <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h6" sx={{ p: 2.5 }}>
          {t('reimb.history', 'Recorded reimbursements')}
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('reimb.date', 'Date')}</TableCell>
                <TableCell>{t('reimb.employee', 'Employee')}</TableCell>
                <TableCell>{t('reimb.method', 'Method')}</TableCell>
                <TableCell align="right">{t('reimb.amount', 'Amount')}</TableCell>
                <TableCell>{t('reimb.reference', 'Reference')}</TableCell>
                <TableCell>{t('reimb.recordedBy', 'Recorded by')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.reimbursements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.reimbursedOn}</TableCell>
                  <TableCell>{r.employeeName || nameOfEmployee(r.employeeId)}</TableCell>
                  <TableCell>
                    <Label variant="soft" color={r.method === 'CASH' ? 'warning' : 'info'}>
                      {r.method === 'CASH'
                        ? t('reimb.cash', 'Cash')
                        : t('reimb.bank', 'Bank transfer')}
                    </Label>
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.amount)}
                  </TableCell>
                  <TableCell>{r.reference || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                      {r.recordedBy}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!history.loading && !history.reimbursements.length && (
          <EmptyContent
            title={t('reimb.noHistory', 'No reimbursements recorded yet')}
            sx={{ py: 6 }}
          />
        )}
      </Card>

      <RecordDialog
        open={!!dialog}
        initial={dialog?.employee}
        owed={owed.employees}
        entities={entities.filter((e) => e.isActive)}
        onClose={() => setDialog(null)}
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------

/**
 * Expenses posted before "paid by the company" still show as owed to the
 * employee. Review them, then re-post them as paid by the company.
 */
function CompanyPaidCard() {
  const { t } = useFahT();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleReview = async () => {
    setBusy(true);
    try {
      setPreview(await repostCompanyPaidExpenses(true));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRepost = async () => {
    setBusy(true);
    try {
      const done = await repostCompanyPaidExpenses(false);
      const failed = (done.engine?.failed ?? 0) + (done.engine?.waiting ?? 0);
      if (failed) {
        toast.warning(
          t(
            'reimb.cp.partial',
            '{{n}} expenses could not be re-posted yet: see ERP Postings → Events → Problems.',
            {
              n: failed,
            }
          )
        );
      } else {
        toast.success(
          t('reimb.cp.done', '{{n}} expenses re-posted as paid by the company', {
            n: done.expenses,
          })
        );
      }
      setPreview(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const todo = preview?.employees.filter((e) => !e.skipped) ?? [];
  const skipped = preview?.employees.filter((e) => e.skipped) ?? [];

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="subtitle1">
            {t('reimb.cp.title', 'Expenses paid by the company')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'reimb.cp.help',
              'Expenses posted before this rule show as owed to the employee although IOTA paid them (GOSI, iqama…). Re-posting moves each one to payments clearing (1025); nothing is paid to anyone.'
            )}
          </Typography>
        </Box>
        <LoadingButton variant="outlined" loading={busy && !preview} onClick={handleReview}>
          {t('reimb.cp.review', 'Review')}
        </LoadingButton>
      </Stack>

      <Dialog
        open={Boolean(preview)}
        onClose={() => !busy && setPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('reimb.cp.title', 'Expenses paid by the company')}</DialogTitle>
        <DialogContent>
          {preview && !preview.expenses ? (
            <Typography variant="body2">
              {t('reimb.cp.none', 'Nothing to re-post: no expense is still owed to an employee.')}
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              <Typography variant="body2">
                {t(
                  'reimb.cp.body',
                  '{{n}} expenses, SAR {{total}}, are reversed and posted again as paid by the company. The employees drop off the owed list.',
                  { n: preview?.expenses, total: fAmount(preview?.total) }
                )}
              </Typography>
              {todo.map((e) => (
                <Box key={e.employeeId}>
                  <Typography variant="subtitle2">
                    {e.employeeName || e.employeeId} · SAR {fAmount(e.total)}
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {e.expenses.map((x) => (
                        <TableRow key={x.expenseId}>
                          <TableCell sx={num}>{x.journalDate}</TableCell>
                          <TableCell>{x.reference}</TableCell>
                          <TableCell>{x.description.replace(/^Expense · /, '')}</TableCell>
                          <TableCell align="right" sx={num}>
                            {fAmount(x.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}
              {skipped.length > 0 && (
                <Alert severity="warning">
                  {t(
                    'reimb.cp.skipped',
                    'Left as they are, because a reimbursement is already recorded for them: {{names}}. Review these by hand.',
                    { names: skipped.map((e) => e.employeeName || e.employeeId).join(', ') }
                  )}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPreview(null)} disabled={busy}>
            {t('common.cancel', 'Cancel')}
          </Button>
          {preview?.expenses > 0 && (
            <LoadingButton variant="contained" loading={busy} onClick={handleRepost}>
              {t('reimb.cp.confirm', 'Re-post as paid by the company')}
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function RecordDialog({ open, initial, owed, entities, onClose }) {
  const { t, nameOf } = useFahT();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        legalEntityId: initial?.legalEntityId ?? entities[0]?.id ?? '',
        employee: initial ?? null,
        method: 'BANK',
        reimbursedOn: today(),
        amount: initial?.owed ? String(initial.owed) : '',
        reference: '',
        note: '',
      });
      setProblems([]);
      setError('');
    }
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const candidates = owed.filter(
    (o) => !form.legalEntityId || o.legalEntityId === form.legalEntityId
  );

  const handleSave = async () => {
    setBusy(true);
    setError('');
    setProblems([]);
    try {
      const res = await recordReimbursement({
        legalEntityId: form.legalEntityId,
        employeeId: form.employee.employeeId,
        employeeName: form.employee.employeeName ?? null,
        method: form.method,
        reimbursedOn: form.reimbursedOn,
        amount: Number(form.amount),
        reference: form.reference || null,
        note: form.note || null,
      });
      if (res.problems?.length) {
        setProblems(res.problems);
      } else {
        toast.success(t('reimb.saved', 'Reimbursement recorded and posted'));
        onClose();
      }
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const valid = form.legalEntityId && form.employee && Number(form.amount) > 0 && form.reimbursedOn;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('reimb.record', 'Record reimbursement')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            select
            label={t('reimb.book', 'Book')}
            value={form.legalEntityId ?? ''}
            onChange={(e) => set({ legalEntityId: e.target.value })}
            disabled={busy}
          >
            {entities.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.shortCode} · {nameOf(e)}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={candidates}
            value={form.employee ?? null}
            onChange={(e, v) =>
              set({ employee: v, amount: v?.owed ? String(v.owed) : form.amount })
            }
            getOptionLabel={(o) =>
              o ? `${o.employeeName || o.employeeId} · ${fAmount(o.owed)}` : ''
            }
            isOptionEqualToValue={(a, b) =>
              a.employeeId === b.employeeId && a.legalEntityId === b.legalEntityId
            }
            disabled={busy}
            renderInput={(params) => (
              <TextField {...params} label={t('reimb.employee', 'Employee')} />
            )}
          />
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={form.method ?? 'BANK'}
            onChange={(e, v) => v && set({ method: v })}
            disabled={busy}
          >
            <ToggleButton value="BANK">{t('reimb.bank', 'Bank transfer')}</ToggleButton>
            <ToggleButton value="CASH">{t('reimb.cash', 'Cash')}</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label={t('reimb.date', 'Date')}
              value={form.reimbursedOn ?? ''}
              onChange={(e) => set({ reimbursedOn: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={busy}
            />
            <TextField
              fullWidth
              label={t('reimb.amountSar', 'Amount (SAR)')}
              value={form.amount ?? ''}
              onChange={(e) => set({ amount: e.target.value.replace(/[^0-9.]/g, '') })}
              inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
              disabled={busy}
            />
          </Stack>
          <TextField
            label={t('reimb.reference', 'Reference')}
            placeholder={t('reimb.referenceHint', 'Transfer or voucher number')}
            value={form.reference ?? ''}
            onChange={(e) => set({ reference: e.target.value })}
            disabled={busy}
          />
          <TextField
            label={t('reimb.note', 'Note')}
            value={form.note ?? ''}
            onChange={(e) => set({ note: e.target.value })}
            multiline
            minRows={2}
            disabled={busy}
          />
          {problems.length > 0 && (
            <Alert severity="warning">
              {t('reimb.problems', 'Recorded, but not yet posted:')}{' '}
              {problems.map((p) => p.message).join(' ')}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} disabled={!valid} onClick={handleSave}>
          {t('reimb.save', 'Record')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
