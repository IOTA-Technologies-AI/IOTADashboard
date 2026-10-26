'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
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
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import {
  fahError,
  postHeadcount,
  useFahCatalog,
  postManualDrivers,
  useAllocationMonth,
  useHeadcountPreview,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/**
 * The month's driver values (FR-CC-1): headcount on the last day of the month
 * from Dimensions → Employees, posted to 9100; hours, square metres or any
 * other statistical driver entered here. Posting again replaces the month's
 * values for that account.
 */
export function AllocationDrivers({ me, bookId, period }) {
  const { t, nameOf } = useFahT();
  const { practices, costCentres, locations, accounts } = useFahCatalog();
  const { month } = useAllocationMonth(bookId, period.id);
  const { headcount, error, loading } = useHeadcountPreview(bookId, period.id);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const canPost = ['OPEN', 'SOFT_CLOSED'].includes(period.status) && me.canPrepare;
  const snapshots = month?.snapshots ?? [];
  const live9100 = snapshots.find((s) => s.accountCode === '9100');
  const label = (list, id) => nameOf(list.find((x) => x.id === id)) || '—';

  const handleHeadcount = async () => {
    setBusy(true);
    try {
      await postHeadcount(bookId, period.id);
      toast.success(
        t('drivers.headcountPosted', 'Headcount posted for {{month}}', { month: period.name })
      );
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
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
        >
          <Box>
            <Typography variant="subtitle1">
              {t('drivers.headcount', 'Headcount (9100)')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {headcount
                ? t(
                    'drivers.headcountHelp',
                    'Employees on {{date}} by practice and location, weighted by FTE, from Dimensions → Employees.',
                    { date: headcount.asOf }
                  )
                : ''}
            </Typography>
            {live9100 ? (
              <Typography variant="caption" color="text.secondary">
                {t('drivers.lastPosted', 'Posted {{total}} by {{who}}, {{when}}', {
                  total: live9100.total,
                  who: live9100.createdBy,
                  when: fDateTime(live9100.createdAt),
                })}
              </Typography>
            ) : (
              <Label variant="soft" color="warning" sx={{ mt: 0.5 }}>
                {t('drivers.notPosted', 'Not posted for this month')}
              </Label>
            )}
          </Box>
          {canPost && (
            <LoadingButton
              variant="contained"
              loading={busy}
              disabled={!headcount || headcount.withoutLocation.length > 0}
              startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
              onClick={handleHeadcount}
            >
              {live9100
                ? t('drivers.repost', 'Post headcount again')
                : t('drivers.post', 'Post headcount')}
            </LoadingButton>
          )}
        </Stack>

        {loading && <LinearProgress sx={{ mt: 2 }} />}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {fahError(error)}
          </Alert>
        )}
        {headcount?.withoutLocation.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t(
              'drivers.noLocation',
              'Give a location to {{names}} first: it decides the book they count in.',
              { names: headcount.withoutLocation.map((a) => a.employeeName || '—').join(', ') }
            )}{' '}
            <Link component={RouterLink} href={paths.dashboard.finance.accounting.dimensions}>
              {t('drivers.openDimensions', 'Dimensions → Employees')}
            </Link>
          </Alert>
        )}
        {headcount && headcount.values.length > 0 && (
          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('drivers.practice', 'Practice')}</TableCell>
                <TableCell>{t('drivers.centre', 'Shared centre')}</TableCell>
                <TableCell>{t('drivers.location', 'Location')}</TableCell>
                <TableCell>{t('drivers.who', 'Employees')}</TableCell>
                <TableCell align="right">{t('drivers.fte', 'FTE')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {headcount.values.map((v) => (
                <TableRow key={`${v.practiceId}|${v.fahCostCentreId}|${v.locationId}`}>
                  <TableCell>{label(practices, v.practiceId)}</TableCell>
                  <TableCell>
                    {v.fahCostCentreId ? label(costCentres, v.fahCostCentreId) : ''}
                  </TableCell>
                  <TableCell>{label(locations, v.locationId)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {v.label}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {v.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {headcount && !headcount.values.length && !headcount.withoutLocation.length && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t(
              'drivers.noEmployees',
              'No employee is assigned to a practice in this book on {{date}}. Add them in Dimensions → Employees.',
              { date: headcount.asOf }
            )}
          </Alert>
        )}
      </Card>

      <Card sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1">{t('drivers.other', 'Other drivers')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                'drivers.otherHelp',
                'Billable hours (9200), square metres (9300) or another statistical account, entered for the month.'
              )}
            </Typography>
          </Box>
          {canPost && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setManualOpen(true)}
            >
              {t('drivers.enter', 'Enter values')}
            </Button>
          )}
        </Stack>
        {snapshots.filter((s) => s.accountCode !== '9100').length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('drivers.account', 'Account')}</TableCell>
                <TableCell>{t('drivers.values', 'Values')}</TableCell>
                <TableCell align="right">{t('drivers.total', 'Total')}</TableCell>
                <TableCell>{t('drivers.by', 'Posted')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots
                .filter((s) => s.accountCode !== '9100')
                .map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.accountCode}</TableCell>
                    <TableCell>
                      {s.values
                        .map(
                          (v) =>
                            `${v.practiceId ? label(practices, v.practiceId) : label(costCentres, v.fahCostCentreId)} ${v.value}`
                        )
                        .join(' · ')}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {s.total}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {s.createdBy}, {fDateTime(s.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.disabled">
            {t('drivers.noneOther', 'None for this month.')}
          </Typography>
        )}
      </Card>

      <ManualDriversDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        bookId={bookId}
        period={period}
        accounts={accounts.filter(
          (a) => a.class === 'STATISTICAL' && a.code !== '9100' && a.isActive !== false
        )}
        practices={practices.filter((p) => p.isRevenueCentre && p.isActive)}
        locations={locations}
      />
    </Stack>
  );
}

function ManualDriversDialog({ open, onClose, bookId, period, accounts, practices, locations }) {
  const { t, nameOf } = useFahT();
  const [accountCode, setAccountCode] = useState('9200');
  const [locationId, setLocationId] = useState('');
  const [values, setValues] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await postManualDrivers({
        legalEntityId: bookId,
        periodId: period.id,
        accountCode,
        values: practices
          .filter((p) => Number(values[p.id]) > 0)
          .map((p) => ({
            practiceId: p.id,
            locationId: locationId || null,
            value: Number(values[p.id]),
          })),
        note,
      });
      toast.success(
        t('drivers.saved', '{{code}} values posted for {{month}}', {
          code: accountCode,
          month: period.name,
        })
      );
      setValues({});
      setNote('');
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('drivers.enterTitle', 'Driver values for {{month}}', { month: period.name })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('drivers.account', 'Account')}
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.code}>
                  {a.code} {nameOf(a)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label={t('drivers.location', 'Location')}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              helperText={t('drivers.locationHelp', 'For square metres of one office')}
            >
              <MenuItem value="">{t('drivers.anyLocation', 'None')}</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {nameOf(l)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {practices.map((p) => (
            <TextField
              key={p.id}
              size="small"
              type="number"
              label={nameOf(p)}
              value={values[p.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              inputProps={{ min: 0, step: 'any' }}
            />
          ))}
          <TextField
            size="small"
            label={t('drivers.note', 'Source or note')}
            placeholder={t('drivers.notePlaceholder', 'e.g. timesheet export 2026-09')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Alert severity="info">
            {t(
              'drivers.replaceNote',
              'Posting replaces any values already posted for this account and month.'
            )}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!practices.some((p) => Number(values[p.id]) > 0)}
          onClick={handleSave}
        >
          {t('drivers.postValues', 'Post values')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
