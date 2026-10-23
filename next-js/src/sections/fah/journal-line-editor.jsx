'use client';

import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

let nextKey = 0;

/** A blank editable line. */
export const newLine = (patch = {}) => ({
  key: `l${(nextKey += 1)}`,
  accountId: '',
  debit: '',
  credit: '',
  txnCurrency: '',
  exchangeRate: '',
  practiceId: '',
  fahCostCentreId: '',
  engagementId: '',
  customerId: '',
  ipCounterpartyId: '',
  memo: '',
  ...patch,
});

/** A saved line as an editable one. */
export const lineFromSaved = (l) =>
  newLine({
    accountId: l.accountId,
    debit: Number(l.debitTxn) ? String(Number(l.debitTxn)) : '',
    credit: Number(l.creditTxn) ? String(Number(l.creditTxn)) : '',
    txnCurrency: l.txnCurrency,
    exchangeRate: l.exchangeRate ? String(Number(l.exchangeRate)) : '',
    practiceId: l.practiceId ?? '',
    fahCostCentreId: l.fahCostCentreId ?? '',
    engagementId: l.engagementId ?? '',
    customerId: l.customerId ?? '',
    ipCounterpartyId: l.ipCounterpartyId ?? '',
    memo: l.memo ?? '',
  });

/** Which dimensions an account asks for (mirrors fah/rules.ts checkJournal). */
export function dimensionNeeds(account) {
  if (!account) return {};
  const cls = account.class;
  return {
    practice: cls === 'REVENUE' || cls === 'COST_OF_REVENUE' || account.requiresPractice,
    practiceOrCostCentre: cls === 'OPEX',
    costCentre: account.requiresCostCentre,
    engagement: account.requiresEngagement,
    counterparty: account.requiresIpCounterparty,
  };
}

/** The problems a line has, for the inline hints. */
export function lineProblems(line, account, t) {
  if (!line.accountId) return [];
  const need = dimensionNeeds(account);
  const out = [];
  if (!Number(line.debit) && !Number(line.credit))
    out.push(t('je.needAmount', 'Enter a debit or a credit'));
  if (need.practice && !line.practiceId) out.push(t('je.needPractice', 'Choose a practice'));
  if (need.practiceOrCostCentre && !line.practiceId && !line.fahCostCentreId)
    out.push(t('je.needPracticeOrCc', 'Choose a practice or a cost centre'));
  if (need.costCentre && !line.fahCostCentreId) out.push(t('je.needCc', 'Choose a cost centre'));
  if (need.engagement && !line.engagementId)
    out.push(t('je.needEngagement', 'Choose an engagement'));
  if (need.counterparty && !line.ipCounterpartyId)
    out.push(t('je.needCounterparty', 'Choose the counterparty practice'));
  return out;
}

const amountSx = { '& input': { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } };
const cleanAmount = (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

// ----------------------------------------------------------------------

/**
 * One journal line: account, debit, credit, memo; under it the dimensions
 * the account asks for, plus currency and rate. Typing a debit clears the
 * credit and the other way round.
 */
export function JournalLineEditor({
  index,
  line,
  accounts,
  accountById,
  catalog,
  customers,
  functionalCurrency,
  onChange,
  onRemove,
  canRemove,
  disabled,
}) {
  const { t, nameOf } = useFahT();
  const account = accountById.get(line.accountId) ?? null;
  const need = dimensionNeeds(account);
  const problems = lineProblems(line, account, t);
  const foreign = line.txnCurrency && line.txnCurrency !== functionalCurrency;
  const showDims =
    !!account &&
    (need.practice ||
      need.practiceOrCostCentre ||
      need.costCentre ||
      need.engagement ||
      need.counterparty ||
      line.practiceId ||
      line.fahCostCentreId ||
      line.engagementId ||
      account.class === 'REVENUE');

  const set = (patch) => onChange({ ...line, ...patch });
  const activePractices = catalog.practices.filter((p) => p.isActive);

  return (
    <Box
      component={m.div}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22 }}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
        bgcolor: problems.length && line.accountId ? 'background.neutral' : 'transparent',
      }}
    >
      <Box
        sx={{
          gap: 1.25,
          display: 'grid',
          alignItems: 'flex-start',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            md: '28px minmax(220px, 3fr) 1fr 1fr minmax(140px, 1.6fr) 36px',
          },
        }}
      >
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ pt: 1.25, display: { xs: 'none', md: 'block' }, textAlign: 'right' }}
        >
          {index + 1}
        </Typography>

        <Autocomplete
          size="small"
          sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
          options={accounts}
          value={account}
          disabled={disabled}
          onChange={(e, value) => set({ accountId: value?.id ?? '' })}
          getOptionLabel={(a) => (a ? `${a.code} · ${nameOf(a)}` : '')}
          groupBy={(a) => t(`class.${a.class}`, a.class)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderOption={(props, a) => (
            <li {...props} key={a.id}>
              <Box
                component="span"
                sx={{ fontFamily: 'monospace', mr: 1, color: 'text.secondary' }}
              >
                {a.code}
              </Box>
              {nameOf(a)}
              {a.isControlAccount && (
                <Chip size="small" label={t('je.control', 'control')} sx={{ ml: 1 }} />
              )}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} placeholder={t('je.account', 'Account')} />
          )}
        />

        <TextField
          size="small"
          placeholder={t('je.debit', 'Debit')}
          value={line.debit}
          disabled={disabled}
          inputProps={{ inputMode: 'decimal' }}
          sx={amountSx}
          onChange={(e) => {
            const v = cleanAmount(e.target.value);
            set({ debit: v, credit: v ? '' : line.credit });
          }}
        />
        <TextField
          size="small"
          placeholder={t('je.credit', 'Credit')}
          value={line.credit}
          disabled={disabled}
          inputProps={{ inputMode: 'decimal' }}
          sx={amountSx}
          onChange={(e) => {
            const v = cleanAmount(e.target.value);
            set({ credit: v, debit: v ? '' : line.debit });
          }}
        />

        <TextField
          size="small"
          sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
          placeholder={t('je.memo', 'Memo')}
          value={line.memo}
          disabled={disabled}
          onChange={(e) => set({ memo: e.target.value })}
        />

        <Tooltip title={t('je.removeLine', 'Remove line')}>
          <span>
            <IconButton
              size="small"
              onClick={onRemove}
              disabled={disabled || !canRemove}
              sx={{ mt: 0.5, display: { xs: 'none', md: 'inline-flex' } }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <AnimatePresence initial={false}>
        {(showDims || foreign) && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              spacing={1.25}
              sx={{ pt: 1.5, pl: { md: '40px' } }}
            >
              {showDims && (
                <TextField
                  select
                  size="small"
                  label={t('je.practice', 'Practice')}
                  value={line.practiceId}
                  disabled={disabled}
                  required={need.practice}
                  error={need.practice && !line.practiceId}
                  onChange={(e) => set({ practiceId: e.target.value })}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">
                    <em>{t('je.none', 'None')}</em>
                  </MenuItem>
                  {activePractices.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {nameOf(p)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {showDims && (
                <TextField
                  select
                  size="small"
                  label={t('je.costCentre', 'Cost centre')}
                  value={line.fahCostCentreId}
                  disabled={disabled}
                  required={need.costCentre}
                  error={
                    (need.costCentre && !line.fahCostCentreId) ||
                    (need.practiceOrCostCentre && !line.practiceId && !line.fahCostCentreId)
                  }
                  onChange={(e) => set({ fahCostCentreId: e.target.value })}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">
                    <em>{t('je.none', 'None')}</em>
                  </MenuItem>
                  {catalog.costCentres
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.code} · {nameOf(c)}
                      </MenuItem>
                    ))}
                </TextField>
              )}
              {showDims && (
                <TextField
                  select
                  size="small"
                  label={t('je.engagement', 'Engagement')}
                  value={line.engagementId}
                  disabled={disabled}
                  required={need.engagement}
                  error={need.engagement && !line.engagementId}
                  onChange={(e) => set({ engagementId: e.target.value })}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">
                    <em>{t('je.none', 'None')}</em>
                  </MenuItem>
                  {catalog.engagements
                    .filter((g) => g.status !== 'CLOSED')
                    .map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.code} · {g.name}
                      </MenuItem>
                    ))}
                </TextField>
              )}
              {need.counterparty && (
                <TextField
                  select
                  size="small"
                  label={t('je.counterparty', 'Counterparty practice')}
                  value={line.ipCounterpartyId}
                  disabled={disabled}
                  required
                  error={!line.ipCounterpartyId}
                  onChange={(e) => set({ ipCounterpartyId: e.target.value })}
                  sx={{ minWidth: 200 }}
                >
                  {activePractices.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {nameOf(p)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {account?.class === 'REVENUE' && (
                <Autocomplete
                  size="small"
                  sx={{ minWidth: 220 }}
                  options={customers}
                  value={customers.find((c) => c.id === line.customerId) ?? null}
                  disabled={disabled}
                  onChange={(e, value) => set({ customerId: value?.id ?? '' })}
                  getOptionLabel={(c) => c?.name ?? ''}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderInput={(params) => (
                    <TextField {...params} label={t('je.customer', 'Customer')} />
                  )}
                />
              )}
              {foreign && (
                <TextField
                  size="small"
                  label={t('je.rate', 'Rate to {{cur}}', { cur: functionalCurrency })}
                  placeholder={t('je.rateAuto', 'From the rate table')}
                  value={line.exchangeRate}
                  disabled={disabled}
                  onChange={(e) => set({ exchangeRate: cleanAmount(e.target.value) })}
                  sx={{ width: 170, ...amountSx }}
                />
              )}
            </Stack>
          </m.div>
        )}
      </AnimatePresence>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1, pl: { md: '40px' } }}>
        <TextField
          select
          size="small"
          variant="standard"
          value={line.txnCurrency || functionalCurrency}
          disabled={disabled}
          onChange={(e) =>
            set({ txnCurrency: e.target.value === functionalCurrency ? '' : e.target.value })
          }
          sx={{ width: 72, '& .MuiInput-input': { typography: 'caption' } }}
        >
          {catalog.currencies.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        {problems.length > 0 && (
          <Typography variant="caption" color="warning.main">
            {problems.join(' · ')}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={onRemove}
          disabled={disabled || !canRemove}
          sx={{ display: { md: 'none' } }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
        </IconButton>
      </Stack>
    </Box>
  );
}

/** Debit and credit totals of editable lines in the functional currency (unknown rates left out). */
export function lineTotals(lines, functionalCurrency) {
  let debit = 0;
  let credit = 0;
  let unknown = 0;
  lines.forEach((l) => {
    const foreign = l.txnCurrency && l.txnCurrency !== functionalCurrency;
    const rate = foreign ? Number(l.exchangeRate) : 1;
    if (foreign && !rate) {
      if (Number(l.debit) || Number(l.credit)) unknown += 1;
      return;
    }
    debit += Math.round((Number(l.debit) || 0) * rate * 100) / 100;
    credit += Math.round((Number(l.credit) || 0) * rate * 100) / 100;
  });
  const r = (n) => Math.round(n * 100) / 100;
  return { debit: r(debit), credit: r(credit), difference: r(debit - credit), unknown };
}
