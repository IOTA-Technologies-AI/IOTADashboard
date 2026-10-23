'use client';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fahError, createAccount, updateAccount } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';

import { useFahT } from './fah-gate';
import { ACCOUNT_CLASS, NORMAL_BALANCE, CONTROL_SUBLEDGER } from './fah-labels';

// ----------------------------------------------------------------------

const CLASS_BY_DIGIT = {
  1: 'ASSET',
  2: 'LIABILITY',
  3: 'EQUITY',
  4: 'REVENUE',
  5: 'COST_OF_REVENUE',
  6: 'OPEX',
  7: 'OTHER',
  8: 'TAX_INTERNAL',
  9: 'STATISTICAL',
};

export const classOfCode = (code) =>
  /^[1-9]\d{3}(\.\d{2})?$/.test(String(code || '').trim()) ? CLASS_BY_DIGIT[code.trim()[0]] : null;

const CASH_FLOW = ['CASH', 'OPERATING', 'INVESTING', 'FINANCING', 'NON_CASH'];

const blank = {
  code: '',
  nameEn: '',
  nameAr: '',
  accountGroup: '',
  parentCode: '',
  normalBalance: 'DEBIT',
  legalEntityId: '',
  controlSubledger: '',
  requiresPractice: false,
  requiresCostCentre: false,
  requiresEngagement: false,
  requiresIpCounterparty: false,
  allowManualPosting: true,
  currencyMode: 'ANY',
  reconcilable: false,
  cashFlowCategory: '',
  isActive: true,
  validFrom: '',
  validTo: '',
};

/** Add or edit an account (FR-COA-1). `account` null: a new one. */
export function AccountEditDialog({ open, onClose, account, accounts, entities }) {
  const { t, nameOf } = useFahT();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (!account) {
      setForm(blank);
      return;
    }
    const parent = accounts.find((a) => a.id === account.parentId);
    setForm({
      ...blank,
      ...Object.fromEntries(Object.keys(blank).map((k) => [k, account[k] ?? blank[k]])),
      parentCode: parent?.code ?? '',
    });
  }, [open, account, accounts]);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e?.target?.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const posted = Boolean(account?.firstPostedAt);
  const cls = classOfCode(form.code);
  const parentOptions = accounts.filter((a) => a.id !== account?.id && (!cls || a.class === cls));
  const parentValue = accounts.find((a) => a.code === form.parentCode) ?? null;

  const handleSave = async () => {
    setBusy(true);
    setError('');
    const payload = {
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim() || null,
      accountGroup: form.accountGroup.trim() || null,
      parentCode: form.parentCode || null,
      normalBalance: form.normalBalance,
      legalEntityId: form.legalEntityId || null,
      controlSubledger: form.controlSubledger || null,
      requiresPractice: form.requiresPractice,
      requiresCostCentre: form.requiresCostCentre,
      requiresEngagement: form.requiresEngagement,
      requiresIpCounterparty: form.requiresIpCounterparty,
      allowManualPosting: form.allowManualPosting,
      currencyMode: form.currencyMode,
      reconcilable: form.reconcilable,
      cashFlowCategory: form.cashFlowCategory || null,
      isActive: form.isActive,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
    };
    if (!account || form.code.trim() !== account.code) payload.code = form.code.trim();
    try {
      if (account) await updateAccount(account.id, payload);
      else await createAccount(payload);
      toast.success(
        account ? t('accounts.saved', 'Account saved') : t('accounts.created', 'Account created')
      );
      onClose();
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const flag = (key, label) => (
    <FormControlLabel
      key={key}
      control={<Switch checked={Boolean(form[key])} onChange={set(key)} disabled={busy} />}
      label={label}
    />
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {account ? t('accounts.editTitle', 'Edit account') : t('accounts.addTitle', 'Add account')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('accounts.code', 'Code')}
              value={form.code}
              onChange={set('code')}
              disabled={busy || posted}
              placeholder="6250 or 1020.03"
              helperText={
                posted
                  ? t('accounts.codeFixed', 'Fixed: the account has postings')
                  : cls
                    ? t(`class.${cls}`, ACCOUNT_CLASS[cls].label)
                    : t('accounts.codeHelp', 'Four digits, or four digits, a dot and two digits')
              }
              inputProps={{ style: { fontFamily: 'monospace' } }}
              sx={{ width: { sm: 220 } }}
            />
            <TextField
              fullWidth
              label={t('accounts.nameEn', 'Name (English)')}
              value={form.nameEn}
              onChange={set('nameEn')}
              disabled={busy}
            />
            <TextField
              fullWidth
              label={t('accounts.nameAr', 'Name (Arabic)')}
              value={form.nameAr}
              onChange={set('nameAr')}
              disabled={busy}
              inputProps={{ dir: 'rtl' }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label={t('accounts.group', 'Group')}
              value={form.accountGroup}
              onChange={set('accountGroup')}
              disabled={busy}
            />
            <Autocomplete
              fullWidth
              value={parentValue}
              options={parentOptions}
              getOptionLabel={(a) => `${a.code} ${nameOf(a)}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(e, v) => setForm((f) => ({ ...f, parentCode: v?.code ?? '' }))}
              disabled={busy}
              renderInput={(params) => (
                <TextField {...params} label={t('accounts.parent', 'Parent account')} />
              )}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              label={t('accounts.normalBalance', 'Normal balance')}
              value={form.normalBalance}
              onChange={set('normalBalance')}
              disabled={busy || posted}
            >
              {Object.entries(NORMAL_BALANCE).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`normal.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={t('accounts.book', 'Book')}
              value={form.legalEntityId}
              onChange={set('legalEntityId')}
              disabled={busy}
            >
              <MenuItem value="">{t('accounts.allBooks', 'Every book')}</MenuItem>
              {entities.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.shortCode} · {nameOf(e)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={t('accounts.control', 'Control subledger')}
              value={form.controlSubledger}
              onChange={set('controlSubledger')}
              disabled={busy}
            >
              <MenuItem value="">{t('accounts.noControl', 'None')}</MenuItem>
              {Object.entries(CONTROL_SUBLEDGER).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`subledger.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              label={t('accounts.currencyMode', 'Currencies')}
              value={form.currencyMode}
              onChange={set('currencyMode')}
              disabled={busy}
            >
              <MenuItem value="ANY">{t('accounts.anyCurrency', 'Any currency')}</MenuItem>
              <MenuItem value="FUNCTIONAL_ONLY">
                {t('accounts.functionalOnly', 'Functional currency only')}
              </MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label={t('accounts.cashFlow', 'Cash-flow category')}
              value={form.cashFlowCategory}
              onChange={set('cashFlowCategory')}
              disabled={busy}
            >
              <MenuItem value="">{t('accounts.noCashFlow', 'None')}</MenuItem>
              {CASH_FLOW.map((c) => (
                <MenuItem key={c} value={c}>
                  {t(`cashFlow.${c}`, c.charAt(0) + c.slice(1).toLowerCase().replace('_', '-'))}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="date"
              label={t('accounts.validFrom', 'Valid from')}
              value={form.validFrom}
              onChange={set('validFrom')}
              disabled={busy}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label={t('accounts.validTo', 'Valid to')}
              value={form.validTo}
              onChange={set('validTo')}
              disabled={busy}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <div>
            <Typography variant="overline" color="text.secondary">
              {t('accounts.requires', 'Every line on this account needs')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" columnGap={2}>
              {flag('requiresPractice', t('accounts.reqPractice', 'A practice'))}
              {flag('requiresCostCentre', t('accounts.reqCostCentre', 'A cost centre'))}
              {flag('requiresEngagement', t('accounts.reqEngagement', 'An engagement'))}
              {flag(
                'requiresIpCounterparty',
                t('accounts.reqCounterparty', 'A counterparty practice')
              )}
            </Stack>
          </div>

          <Stack direction="row" flexWrap="wrap" columnGap={2}>
            {flag('allowManualPosting', t('accounts.manual', 'Manual journals allowed'))}
            {flag('reconcilable', t('accounts.reconcilable', 'Reconcilable'))}
            {flag('isActive', t('accounts.active', 'Active'))}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          onClick={handleSave}
          disabled={!cls || !form.nameEn.trim()}
        >
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
