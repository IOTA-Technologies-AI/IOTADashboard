'use client';

import { m } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import {
  fahError,
  useTypeMaps,
  useFahCatalog,
  usePostingRules,
  updatePostingRule,
  saveExpenseTypeMap,
  saveInvoiceTypeMap,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';
import { EVENT_LABEL } from './postings-events';

// ----------------------------------------------------------------------

const PRACTICE_RULES = {
  CORPORATE: 'Corporate (cost centre carries it)',
  EMPLOYEE_PRACTICE: 'The employee’s practice',
  ENGAGEMENT_FROM_LINKED_INVOICE: 'The re-billed invoice’s practice',
};

const POLICIES = {
  ON_INVOICE: 'On invoice',
  ON_INVOICE_OR_POC: 'On invoice, or by completion for large contracts',
  DEFER_AND_RELEASE: 'Deferred and released over the service period',
  IGNORE: 'Never posts',
};

const camelWords = (s) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export function PostingsRules({ me }) {
  const { t } = useFahT();
  const catalog = useFahCatalog();
  const { rules, error, loading } = usePostingRules();
  const postable = useMemo(
    () => catalog.accounts.filter((a) => a.type === 'POSTING' && a.isActive),
    [catalog.accounts]
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">{t('postings.rules.title', 'Posting rules')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820 }}>
          {t(
            'postings.rules.help',
            'Each rule turns one kind of ERP event into a journal. The logic is fixed; the accounts it uses are set here. A switched-off rule leaves its events waiting until it is switched on again. Use an event’s drawer to see what the rule would post.'
          )}
        </Typography>
      </Box>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{fahError(error)}</Alert>}
      <Box
        sx={{
          gap: 2.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        {rules.map((rule, index) => (
          <RuleCard
            key={rule.eventType}
            rule={rule}
            index={index}
            postable={postable}
            canEdit={me.canControl}
          />
        ))}
      </Box>
      <TypeMaps me={me} catalog={catalog} postable={postable} />
    </Stack>
  );
}

function RuleCard({ rule, index, postable, canEdit }) {
  const { t, nameOf } = useFahT();
  const [active, setActive] = useState(rule.isActive);
  const [accounts, setAccounts] = useState(rule.accounts);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActive(rule.isActive);
    setAccounts(rule.accounts);
  }, [rule]);

  const dirty =
    active !== rule.isActive || JSON.stringify(accounts) !== JSON.stringify(rule.accounts);

  const handleSave = async () => {
    setBusy(true);
    try {
      await updatePostingRule(rule.eventType, { isActive: active, accounts });
      toast.success(t('postings.rules.saved', 'Rule saved'));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      component={m.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: active ? 1 : 0.7, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.03 }}
      sx={{ p: 2.5 }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1">
            {t(`postings.event.${rule.eventType}`, EVENT_LABEL[rule.eventType] ?? rule.eventType)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {rule.eventType} · v{rule.version}
          </Typography>
        </Box>
        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              checked={active}
              disabled={!canEdit}
              onChange={(e) => setActive(e.target.checked)}
            />
          }
          label={active ? t('postings.rules.on', 'On') : t('postings.rules.off', 'Off')}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        {rule.description}
      </Typography>
      <Stack spacing={1.25}>
        {Object.entries(accounts).map(([role, code]) => (
          <Autocomplete
            key={role}
            size="small"
            disableClearable
            disabled={!canEdit}
            options={postable}
            value={postable.find((a) => a.code === code) ?? { code, nameEn: '' }}
            onChange={(e, v) => v && setAccounts((prev) => ({ ...prev, [role]: v.code }))}
            getOptionLabel={(a) => (a ? `${a.code}${nameOf(a) ? ` · ${nameOf(a)}` : ''}` : '')}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => (
              <TextField {...params} label={t(`postings.roles.${role}`, camelWords(role))} />
            )}
          />
        ))}
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.disabled">
          {rule.updatedBy ? `${rule.updatedBy} · ${fDateTime(rule.updatedAt)}` : ''}
        </Typography>
        {canEdit && (
          <LoadingButton
            size="small"
            variant="contained"
            disabled={!dirty}
            loading={busy}
            onClick={handleSave}
          >
            {t('common.save', 'Save')}
          </LoadingButton>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function TypeMaps({ me, catalog, postable }) {
  const { t, nameOf } = useFahT();
  const maps = useTypeMaps();
  const [editExpense, setEditExpense] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const practice = (id) => catalog.practices.find((p) => p.id === id);
  const unmapped = maps.unmappedExpenseTypes.length + maps.unmappedInvoiceTypes.length;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">{t('postings.maps.title', 'Type maps')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820 }}>
          {t(
            'postings.maps.help',
            'Which account each ERP expense type and invoice type posts to. An unmapped type sends its events to the exceptions queue rather than guessing.'
          )}
        </Typography>
      </Box>
      {maps.error && <Alert severity="error">{fahError(maps.error)}</Alert>}
      {unmapped > 0 && (
        <Alert severity="warning">
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('postings.maps.unmapped', 'ERP types with no mapping')}
          </Typography>
          <Stack spacing={0.75}>
            {maps.unmappedExpenseTypes.map((x) => (
              <Stack key={`e${x.id}`} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {t('postings.maps.expenseType', 'Expense type')} {x.id} · {x.expenseTypeDesc}
                </Typography>
                {me.canControl && (
                  <Button
                    size="small"
                    onClick={() =>
                      setEditExpense({
                        expensesTypeId: x.id,
                        expenseTypeDesc: x.expenseTypeDesc,
                        accountCode: '',
                        fahCostCentreCode: '',
                        practiceRule: 'CORPORATE',
                        note: '',
                        isNew: true,
                      })
                    }
                  >
                    {t('postings.maps.add', 'Add mapping')}
                  </Button>
                )}
              </Stack>
            ))}
            {maps.unmappedInvoiceTypes.map((x) => (
              <Stack key={`i${x.id}`} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {t('postings.maps.invoiceType', 'Invoice type')} {x.id} · {x.invoiceTypeDesc}
                </Typography>
                {me.canControl && (
                  <Button
                    size="small"
                    onClick={() =>
                      setEditInvoice({
                        invoiceTypeId: x.id,
                        invoiceTypeDesc: x.invoiceTypeDesc,
                        revenueAccountCode: '',
                        recognitionPolicy: 'ON_INVOICE',
                        defaultPracticeId: '',
                        note: '',
                        isNew: true,
                      })
                    }
                  >
                    {t('postings.maps.add', 'Add mapping')}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      <Card>
        <Typography variant="subtitle1" sx={{ p: 2.5, pb: 1 }}>
          {t('postings.maps.expenseTypes', 'Expense types')}
        </Typography>
        {maps.loading && <LinearProgress />}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell width={50}>#</TableCell>
                <TableCell>{t('postings.maps.description', 'Description')}</TableCell>
                <TableCell>{t('postings.maps.account', 'Account')}</TableCell>
                <TableCell>{t('postings.maps.costCentre', 'Cost centre')}</TableCell>
                <TableCell>{t('postings.maps.practiceRule', 'Practice')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {maps.expenseTypes.map((x) => (
                <TableRow key={x.expensesTypeId} hover>
                  <TableCell sx={{ color: 'text.secondary' }}>{x.expensesTypeId}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{x.expenseTypeDesc}</Typography>
                    {x.note && (
                      <Typography variant="caption" color="text.secondary">
                        {x.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <AccountCode code={x.accountCode} accounts={catalog.accounts} nameOf={nameOf} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {x.fahCostCentreCode ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {t(
                        `postings.practiceRule.${x.practiceRule}`,
                        PRACTICE_RULES[x.practiceRule] ?? x.practiceRule
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {me.canControl && (
                      <IconButton size="small" onClick={() => setEditExpense({ ...x })}>
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Card>
        <Typography variant="subtitle1" sx={{ p: 2.5, pb: 1 }}>
          {t('postings.maps.invoiceTypes', 'Invoice types')}
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell width={50}>#</TableCell>
                <TableCell>{t('postings.maps.description', 'Description')}</TableCell>
                <TableCell>{t('postings.maps.revenueAccount', 'Revenue account')}</TableCell>
                <TableCell>{t('postings.maps.policy', 'Recognition')}</TableCell>
                <TableCell>{t('postings.maps.defaultPractice', 'Default practice')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {maps.invoiceTypes.map((x) => (
                <TableRow key={x.invoiceTypeId} hover>
                  <TableCell sx={{ color: 'text.secondary' }}>{x.invoiceTypeId}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{x.invoiceTypeDesc}</Typography>
                    {x.note && (
                      <Typography variant="caption" color="text.secondary">
                        {x.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {x.revenueAccountCode ? (
                      <AccountCode
                        code={x.revenueAccountCode}
                        accounts={catalog.accounts}
                        nameOf={nameOf}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Label
                      variant="soft"
                      color={x.recognitionPolicy === 'IGNORE' ? 'default' : 'info'}
                    >
                      {t(
                        `postings.policy.${x.recognitionPolicy}`,
                        POLICIES[x.recognitionPolicy] ?? x.recognitionPolicy
                      )}
                    </Label>
                  </TableCell>
                  <TableCell>
                    {x.defaultPracticeId ? nameOf(practice(x.defaultPracticeId)) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {me.canControl && (
                      <IconButton size="small" onClick={() => setEditInvoice({ ...x })}>
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ExpenseMapDialog
        value={editExpense}
        catalog={catalog}
        postable={postable}
        onClose={() => setEditExpense(null)}
      />
      <InvoiceMapDialog
        value={editInvoice}
        catalog={catalog}
        postable={postable}
        onClose={() => setEditInvoice(null)}
      />
    </Stack>
  );
}

function AccountCode({ code, accounts, nameOf }) {
  const a = accounts.find((x) => x.code === code);
  return (
    <Typography variant="body2">
      <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary', mr: 1 }}>
        {code}
      </Box>
      {a ? nameOf(a) : ''}
    </Typography>
  );
}

function useMapForm(value) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm(value ? { ...value } : null);
  }, [value]);
  return { form, setForm, busy, setBusy };
}

function ExpenseMapDialog({ value, catalog, postable, onClose }) {
  const { t, nameOf } = useFahT();
  const { form, setForm, busy, setBusy } = useMapForm(value);
  const ccCodes = [
    'OFFICE_BY_ENTITY',
    ...catalog.costCentres.filter((c) => c.isActive).map((c) => c.code),
  ];

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveExpenseTypeMap(form.expensesTypeId, {
        expenseTypeDesc: form.expenseTypeDesc,
        accountCode: form.accountCode,
        fahCostCentreCode: form.fahCostCentreCode || null,
        practiceRule: form.practiceRule,
        note: form.note || null,
      });
      toast.success(t('postings.maps.saved', 'Mapping saved'));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!value} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('postings.maps.expenseType', 'Expense type')} {form?.expensesTypeId} ·{' '}
        {form?.expenseTypeDesc}
      </DialogTitle>
      {form && (
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              options={postable}
              value={postable.find((a) => a.code === form.accountCode) ?? null}
              onChange={(e, v) => setForm((f) => ({ ...f, accountCode: v?.code ?? '' }))}
              getOptionLabel={(a) => (a ? `${a.code} · ${nameOf(a)}` : '')}
              isOptionEqualToValue={(a, b) => a.code === b.code}
              renderInput={(params) => (
                <TextField {...params} label={t('postings.maps.account', 'Account')} />
              )}
            />
            <TextField
              select
              label={t('postings.maps.costCentre', 'Cost centre')}
              value={form.fahCostCentreCode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, fahCostCentreCode: e.target.value }))}
              helperText={t(
                'postings.maps.byEntity',
                'OFFICE_BY_ENTITY: the Riyadh or Dubai office, by book.'
              )}
            >
              <MenuItem value="">
                <em>{t('postings.tagging.none', 'None')}</em>
              </MenuItem>
              {ccCodes.map((c) => (
                <MenuItem key={c} value={c} sx={{ fontFamily: 'monospace' }}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('postings.maps.practiceRule', 'Practice')}
              value={form.practiceRule}
              onChange={(e) => setForm((f) => ({ ...f, practiceRule: e.target.value }))}
            >
              {Object.entries(PRACTICE_RULES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`postings.practiceRule.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('postings.maps.note', 'Note')}
              value={form.note ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Stack>
        </DialogContent>
      )}
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!form?.accountCode}
          onClick={handleSave}
        >
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function InvoiceMapDialog({ value, catalog, postable, onClose }) {
  const { t, nameOf } = useFahT();
  const { form, setForm, busy, setBusy } = useMapForm(value);
  const revenue = postable.filter((a) => a.class === 'REVENUE');

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveInvoiceTypeMap(form.invoiceTypeId, {
        invoiceTypeDesc: form.invoiceTypeDesc,
        revenueAccountCode: form.revenueAccountCode || null,
        recognitionPolicy: form.recognitionPolicy,
        defaultPracticeId: form.defaultPracticeId || null,
        note: form.note || null,
      });
      toast.success(t('postings.maps.saved', 'Mapping saved'));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!value} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('postings.maps.invoiceType', 'Invoice type')} {form?.invoiceTypeId} ·{' '}
        {form?.invoiceTypeDesc}
      </DialogTitle>
      {form && (
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label={t('postings.maps.policy', 'Recognition')}
              value={form.recognitionPolicy}
              onChange={(e) => setForm((f) => ({ ...f, recognitionPolicy: e.target.value }))}
            >
              {Object.entries(POLICIES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`postings.policy.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            {form.recognitionPolicy !== 'IGNORE' && (
              <Autocomplete
                options={revenue}
                value={revenue.find((a) => a.code === form.revenueAccountCode) ?? null}
                onChange={(e, v) => setForm((f) => ({ ...f, revenueAccountCode: v?.code ?? '' }))}
                getOptionLabel={(a) => (a ? `${a.code} · ${nameOf(a)}` : '')}
                isOptionEqualToValue={(a, b) => a.code === b.code}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('postings.maps.revenueAccount', 'Revenue account')}
                  />
                )}
              />
            )}
            <TextField
              select
              label={t('postings.maps.defaultPractice', 'Default practice')}
              value={form.defaultPracticeId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, defaultPracticeId: e.target.value }))}
              helperText={t(
                'postings.maps.defaultPracticeHelp',
                'Leave empty to use the customer’s default practice.'
              )}
            >
              <MenuItem value="">
                <em>{t('postings.tagging.none', 'None')}</em>
              </MenuItem>
              {catalog.practices
                .filter((p) => p.isActive)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {nameOf(p)}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label={t('postings.maps.note', 'Note')}
              value={form.note ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Stack>
        </DialogContent>
      )}
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!form || (form.recognitionPolicy !== 'IGNORE' && !form.revenueAccountCode)}
          onClick={handleSave}
        >
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
