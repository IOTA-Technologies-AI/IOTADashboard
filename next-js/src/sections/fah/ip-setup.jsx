'use client';

import { useState } from 'react';

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
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import {
  fahError,
  useRateCards,
  useFahCatalog,
  endIpAgreement,
  createRateCard,
  approveRateCard,
  useIpAgreements,
  createIpAgreement,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { today, fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export const PRICING = {
  COST_PLUS: 'Cost plus %',
  RATE_CARD: 'Rate card (bill rate)',
  AT_COST: 'At cost',
  FIXED: 'Fixed price',
};

function Header({ title, help, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      sx={{ p: 2.5 }}
    >
      <div>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {help}
        </Typography>
      </div>
      {action}
    </Stack>
  );
}

/** Who charges whom, on which engagement, at what price (§9.1, D-6, D-16). */
export function IpAgreements({ me }) {
  const { t, nameOf } = useFahT();
  const { agreements, error, loading } = useIpAgreements();
  const { practices, entities, engagements } = useFahCatalog();
  const [open, setOpen] = useState(false);
  const code = (id) => practices.find((p) => p.id === id)?.code ?? '';

  const end = async (a) => {
    try {
      await endIpAgreement(a.id, today());
      toast.success(t('ip.ended', '{{code}} ended today', { code: a.code }));
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  return (
    <Card>
      <Header
        title={t('ip.agreementsTitle', 'Agreements')}
        help={t(
          'ip.agreementsHelp',
          'One practice working for another on an engagement. Default price: cost plus 10 % (D-6).'
        )}
        action={
          me.canPrepare && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setOpen(true)}
            >
              {t('ip.newAgreement', 'New agreement')}
            </Button>
          )
        }
      />
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !agreements.length ? (
        <EmptyContent title={t('ip.noAgreements', 'No agreements yet')} sx={{ py: 6 }} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('ip.code', 'Code')}</TableCell>
                <TableCell>{t('ip.fromTo', 'Provider → consumer')}</TableCell>
                <TableCell>{t('ip.engagement', 'Engagement')}</TableCell>
                <TableCell>{t('ip.pricing', 'Pricing')}</TableCell>
                <TableCell>{t('ip.period', 'Dates')}</TableCell>
                <TableCell>{t('ip.status', 'Status')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {agreements.map((a) => {
                const e = engagements.find((x) => x.id === a.engagementId);
                return (
                  <TableRow key={a.id}>
                    <TableCell>{a.code}</TableCell>
                    <TableCell>
                      {code(a.providerPracticeId)} → {code(a.consumerPracticeId)}
                      <Typography variant="caption" color="text.secondary" component="div">
                        {nameOf(entities.find((x) => x.id === a.legalEntityId))}
                      </Typography>
                    </TableCell>
                    <TableCell>{e ? `${e.code} ${e.name}` : ''}</TableCell>
                    <TableCell>
                      {PRICING[a.pricingBasis]}
                      {a.pricingBasis === 'COST_PLUS' ? ` ${Number(a.markupPercent)} %` : ''}
                      {a.pricingBasis === 'FIXED' ? ` ${fAmount(a.fixedUnitPrice)}` : ''} /{' '}
                      {a.unit.toLowerCase()}
                    </TableCell>
                    <TableCell sx={num}>
                      {a.effectiveFrom} → {a.effectiveTo ?? '…'}
                    </TableCell>
                    <TableCell>
                      <Label variant="soft" color={a.status === 'ACTIVE' ? 'success' : 'default'}>
                        {a.status.toLowerCase()}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      {me.canPrepare && a.status === 'ACTIVE' && (
                        <Button size="small" color="inherit" onClick={() => end(a)}>
                          {t('ip.end', 'End today')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <AgreementDialog
        open={open}
        onClose={() => setOpen(false)}
        practices={practices}
        entities={entities}
        engagements={engagements}
      />
    </Card>
  );
}

function AgreementDialog({ open, onClose, practices, entities, engagements }) {
  const { t, nameOf } = useFahT();
  const revenueCentres = practices.filter((p) => p.isRevenueCentre && p.isActive);
  const books = entities.filter((e) => e.isActive);
  const [form, setForm] = useState({
    legalEntityId: '',
    providerPracticeId: '',
    consumerPracticeId: '',
    engagementId: '',
    pricingBasis: 'COST_PLUS',
    markupPercent: 10,
    fixedUnitPrice: '',
    unit: 'HOUR',
    effectiveFrom: today(),
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setBusy(true);
    try {
      const a = await createIpAgreement({
        ...form,
        legalEntityId: form.legalEntityId || books[0]?.id,
        markupPercent: Number(form.markupPercent),
        fixedUnitPrice: form.fixedUnitPrice === '' ? null : Number(form.fixedUnitPrice),
      });
      toast.success(t('ip.agreementCreated', 'Agreement {{code}} created', { code: a.code }));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{t('ip.newAgreement', 'New agreement')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label={t('ip.book', 'Book')}
            value={form.legalEntityId || books[0]?.id || ''}
            onChange={(e) => set({ legalEntityId: e.target.value })}
          >
            {books.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {nameOf(b)}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('ip.provider', 'Provider')}
              value={form.providerPracticeId}
              onChange={(e) => set({ providerPracticeId: e.target.value })}
            >
              {revenueCentres.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label={t('ip.consumer', 'Consumer')}
              value={form.consumerPracticeId}
              onChange={(e) => set({ consumerPracticeId: e.target.value })}
            >
              {revenueCentres
                .filter((p) => p.id !== form.providerPracticeId)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {nameOf(p)}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
          <TextField
            select
            size="small"
            label={t('ip.engagement', 'Engagement')}
            value={form.engagementId}
            onChange={(e) => set({ engagementId: e.target.value })}
            helperText={t('ip.engagementHelp', 'Required (D-16). Add engagements in Dimensions.')}
          >
            {engagements
              .filter((e) => e.status !== 'CLOSED')
              .map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.code} · {e.name}
                </MenuItem>
              ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('ip.pricing', 'Pricing')}
              value={form.pricingBasis}
              onChange={(e) => set({ pricingBasis: e.target.value })}
            >
              {Object.entries(PRICING).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`ip.pricing.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            {form.pricingBasis === 'COST_PLUS' && (
              <TextField
                size="small"
                type="number"
                label={t('ip.markup', 'Mark-up %')}
                value={form.markupPercent}
                onChange={(e) => set({ markupPercent: e.target.value })}
              />
            )}
            {form.pricingBasis === 'FIXED' && (
              <TextField
                size="small"
                type="number"
                label={t('ip.unitPrice', 'Price per unit (SAR)')}
                value={form.fixedUnitPrice}
                onChange={(e) => set({ fixedUnitPrice: e.target.value })}
              />
            )}
            <TextField
              select
              size="small"
              label={t('ip.unit', 'Unit')}
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value })}
              sx={{ minWidth: 110 }}
            >
              {['HOUR', 'DAY', 'UNIT'].map((u) => (
                <MenuItem key={u} value={u}>
                  {u.toLowerCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            size="small"
            type="date"
            label={t('ip.from', 'From')}
            value={form.effectiveFrom}
            onChange={(e) => set({ effectiveFrom: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label={t('ip.description', 'Description')}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!form.providerPracticeId || !form.consumerPracticeId || !form.engagementId}
          onClick={save}
        >
          {t('ip.create', 'Create')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/** A practice's rates per grade, approved by a controller before use (FR-IP-6). */
export function IpRateCards({ me }) {
  const { t, nameOf } = useFahT();
  const { rateCards, error, loading } = useRateCards();
  const { practices } = useFahCatalog();
  const [open, setOpen] = useState(false);
  const canEnter = me.canPrepare || (me.leadPractices ?? []).length > 0;

  const approve = async (c) => {
    try {
      await approveRateCard(c.id);
      toast.success(t('ip.rateApproved', 'Rate approved'));
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  return (
    <Card>
      <Header
        title={t('ip.ratesTitle', 'Rate cards')}
        help={t(
          'ip.ratesHelp',
          'Bill rate prices "rate card" agreements; cost rate prices "cost plus" and "at cost". A rate is used only once a controller approves it.'
        )}
        action={
          canEnter && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setOpen(true)}
            >
              {t('ip.newRate', 'New rate')}
            </Button>
          )
        }
      />
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !rateCards.length ? (
        <EmptyContent title={t('ip.noRates', 'No rates yet')} sx={{ py: 6 }} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('ip.practice', 'Practice')}</TableCell>
              <TableCell>{t('ip.grade', 'Grade')}</TableCell>
              <TableCell align="right">{t('ip.billRate', 'Bill rate')}</TableCell>
              <TableCell align="right">{t('ip.costRate', 'Cost rate')}</TableCell>
              <TableCell>{t('ip.period', 'Dates')}</TableCell>
              <TableCell>{t('ip.approval', 'Approval')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rateCards.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{nameOf(practices.find((p) => p.id === c.practiceId))}</TableCell>
                <TableCell>{c.grade}</TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(c.billRate)} / {c.unit.toLowerCase()}
                </TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(c.costRate)}
                </TableCell>
                <TableCell sx={num}>
                  {c.effectiveFrom} → {c.effectiveTo ?? '…'}
                </TableCell>
                <TableCell>
                  {c.approvedBy ? (
                    <Typography variant="caption">{c.approvedBy}</Typography>
                  ) : me.canControl && c.createdBy?.toLowerCase() !== me.email ? (
                    <Button size="small" onClick={() => approve(c)}>
                      {t('ip.approve', 'Approve')}
                    </Button>
                  ) : (
                    <Label variant="soft" color="warning">
                      {t('ip.awaiting', 'awaiting a controller')}
                    </Label>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <RateDialog open={open} onClose={() => setOpen(false)} me={me} practices={practices} />
    </Card>
  );
}

function RateDialog({ open, onClose, me, practices }) {
  const { t, nameOf } = useFahT();
  const choices = practices.filter(
    (p) =>
      p.isRevenueCentre && p.isActive && (me.canPrepare || (me.leadPractices ?? []).includes(p.id))
  );
  const [form, setForm] = useState({
    practiceId: '',
    grade: '',
    unit: 'HOUR',
    billRate: '',
    costRate: '',
    effectiveFrom: today(),
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const save = async () => {
    setBusy(true);
    try {
      await createRateCard({
        ...form,
        billRate: Number(form.billRate),
        costRate: Number(form.costRate),
      });
      toast.success(t('ip.rateCreated', 'Rate entered; a controller approves it before use'));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{t('ip.newRate', 'New rate')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label={t('ip.practice', 'Practice')}
            value={form.practiceId}
            onChange={(e) => set({ practiceId: e.target.value })}
          >
            {choices.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {nameOf(p)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t('ip.grade', 'Grade')}
            placeholder="Senior"
            value={form.grade}
            onChange={(e) => set({ grade: e.target.value })}
          />
          <TextField
            select
            size="small"
            label={t('ip.unit', 'Unit')}
            value={form.unit}
            onChange={(e) => set({ unit: e.target.value })}
          >
            <MenuItem value="HOUR">{t('ip.hour', 'hour')}</MenuItem>
            <MenuItem value="DAY">{t('ip.day', 'day')}</MenuItem>
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField
              size="small"
              type="number"
              label={t('ip.billRate', 'Bill rate')}
              value={form.billRate}
              onChange={(e) => set({ billRate: e.target.value })}
            />
            <TextField
              size="small"
              type="number"
              label={t('ip.costRate', 'Cost rate')}
              value={form.costRate}
              onChange={(e) => set({ costRate: e.target.value })}
            />
          </Stack>
          <TextField
            size="small"
            type="date"
            label={t('ip.from', 'From')}
            value={form.effectiveFrom}
            onChange={(e) => set({ effectiveFrom: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={
            !form.practiceId || !form.grade.trim() || form.billRate === '' || form.costRate === ''
          }
          onClick={save}
        >
          {t('ip.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
