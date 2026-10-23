'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

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
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { useRates, fahError, createRate, useFahCatalog } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { today } from '../fah-labels';
import { useFahT, FahGate } from '../fah-gate';

// ----------------------------------------------------------------------

const RATE_TYPES = { SPOT: 'Spot', PERIOD_END: 'Period end', AVERAGE: 'Average' };
const SOURCE_COLOR = { PEG: 'info', SAMA: 'success', ECB: 'success', MANUAL: 'default' };

/** Up to 8 decimals, trailing zeros dropped. */
const fRate = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(8).replace(/\.?0+$/, '');
};

export function RatesView() {
  const { t } = useFahT();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('rates.title', 'Exchange rates')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('rates.title', 'Exchange rates') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={1}>{(me) => <RatesBoard me={me} />}</FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function RatesBoard({ me }) {
  const { t } = useFahT();
  const { currencies } = useFahCatalog();
  const [currency, setCurrency] = useState('');
  const [open, setOpen] = useState(false);
  const { rates, loading, error } = useRates(currency || undefined);

  return (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t(
          'rates.note',
          'USD and AED are pegged to the riyal (PEG rows). A journal line in another currency uses the latest SPOT rate on or before the journal date, unless a rate is entered on the line.'
        )}
      </Alert>

      <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            size="small"
            label={t('rates.currency', 'Currency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            sx={{ minWidth: { sm: 180 } }}
          >
            <MenuItem value="">{t('rates.all', 'All currencies')}</MenuItem>
            {currencies.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flexGrow: 1 }} />
          {me.canControl && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setOpen(true)}
            >
              {t('rates.add', 'Add rate')}
            </Button>
          )}
        </Stack>

        <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(error)}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('rates.pair', 'Pair')}</TableCell>
                <TableCell>{t('rates.date', 'From date')}</TableCell>
                <TableCell align="right">{t('rates.rate', 'Rate')}</TableCell>
                <TableCell>{t('rates.type', 'Type')}</TableCell>
                <TableCell>{t('rates.source', 'Source')}</TableCell>
                <TableCell>{t('rates.by', 'Entered by')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                      1 {r.fromCurrency} → {r.toCurrency}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.rateDate}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {fRate(r.rate)}
                  </TableCell>
                  <TableCell>
                    {t(`rates.types.${r.rateType}`, RATE_TYPES[r.rateType] ?? r.rateType)}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={SOURCE_COLOR[r.source] ?? 'default'}>
                      {r.source}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {r.createdBy || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && !rates.length && (
          <EmptyContent title={t('rates.empty', 'No rates yet')} sx={{ py: 6 }} />
        )}
      </Card>

      <RateDialog open={open} onClose={() => setOpen(false)} currencies={currencies} />
    </>
  );
}

// ----------------------------------------------------------------------

function RateDialog({ open, onClose, currencies }) {
  const { t } = useFahT();
  const blank = {
    fromCurrency: '',
    toCurrency: 'SAR',
    rateDate: today(),
    rate: '',
    rateType: 'SPOT',
  };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleClose = () => {
    if (busy) return;
    setForm(blank);
    onClose();
  };

  const valid =
    form.fromCurrency &&
    form.toCurrency &&
    form.fromCurrency !== form.toCurrency &&
    Number(form.rate) > 0 &&
    form.rateDate;

  const handleSave = async () => {
    setBusy(true);
    try {
      await createRate({ ...form, rate: Number(form.rate) });
      toast.success(t('rates.saved', 'Rate saved'));
      setForm(blank);
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('rates.add', 'Add rate')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              fullWidth
              label={t('rates.from', 'From')}
              value={form.fromCurrency}
              onChange={set('fromCurrency')}
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={t('rates.to', 'To')}
              value={form.toCurrency}
              onChange={set('toCurrency')}
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            type="date"
            label={t('rates.date', 'From date')}
            value={form.rateDate}
            onChange={set('rateDate')}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="number"
            label={t('rates.rate', 'Rate')}
            value={form.rate}
            onChange={set('rate')}
            inputProps={{ min: 0, step: 'any' }}
            helperText={
              form.fromCurrency && form.toCurrency
                ? t('rates.rateHelp', '1 {{from}} = ? {{to}}', {
                    from: form.fromCurrency,
                    to: form.toCurrency,
                  })
                : ' '
            }
          />
          <TextField
            select
            label={t('rates.type', 'Type')}
            value={form.rateType}
            onChange={set('rateType')}
          >
            {Object.entries(RATE_TYPES).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {t(`rates.types.${value}`, label)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} disabled={!valid} onClick={handleSave}>
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
