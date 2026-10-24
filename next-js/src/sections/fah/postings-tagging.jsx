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
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  setTag,
  fahError,
  useFahTags,
  useFahCatalog,
  useErpCustomers,
  setCustomerDefault,
  useCustomerDefaults,
  deleteCustomerDefault,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const SOURCE_LABEL = { invoices: 'Invoice', expenses: 'Expense', payrollRuns: 'Payroll' };

export function PostingsTagging({ me }) {
  const { t } = useFahT();
  const catalog = useFahCatalog();
  const [all, setAll] = useState(false);
  const [pageNo, setPageNo] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState(null);
  const { tags, total, error, loading, validating } = useFahTags({
    review: all ? undefined : true,
    offset: pageNo * rowsPerPage,
    limit: rowsPerPage,
  });
  const codeOf = (list, id) => list.find((x) => x.id === id)?.code;

  return (
    <Stack spacing={3}>
      <Card>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          sx={{ p: 2.5 }}
        >
          <Box>
            <Typography variant="h6">{t('postings.tagging.title', 'Tagging queue')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
              {t(
                'postings.tagging.help',
                'Revenue and costs the rules could not place with certainty. Choose the practice (and engagement or cost centre); an item already posted is reversed and reposted with your tag.'
              )}
            </Typography>
          </Box>
          <FormControlLabel
            sx={{ flexShrink: 0 }}
            control={
              <Switch
                checked={all}
                onChange={(e) => {
                  setAll(e.target.checked);
                  setPageNo(0);
                }}
              />
            }
            label={t('postings.tagging.showAll', 'Show all tags')}
          />
        </Stack>
        <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(error)}
          </Alert>
        )}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('postings.tagging.source', 'Source')}</TableCell>
                <TableCell>{t('postings.tagging.date', 'Date')}</TableCell>
                <TableCell align="right">{t('postings.tagging.amount', 'Amount (SAR)')}</TableCell>
                <TableCell>{t('postings.tagging.tag', 'Tagged to')}</TableCell>
                <TableCell>{t('postings.tagging.reason', 'Why')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((tag, index) => (
                <TableRow
                  key={tag.id}
                  component={m.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 12) * 0.015 }}
                >
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {t(
                        `postings.tagging.kind.${tag.sourceTable}`,
                        SOURCE_LABEL[tag.sourceTable] ?? tag.sourceTable
                      )}
                    </Typography>
                    <Typography variant="body2" noWrap>
                      {tag.label ?? tag.sourceId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{tag.sourceDate ?? '—'}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fAmount(tag.amount)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {[
                        codeOf(catalog.practices, tag.practiceId),
                        codeOf(catalog.costCentres, tag.fahCostCentreId),
                        codeOf(catalog.engagements, tag.engagementId),
                        tag.overrideAccountCode,
                      ]
                        .filter(Boolean)
                        .map((c) => (
                          <Label key={c} variant="soft" sx={{ fontFamily: 'monospace' }}>
                            {c}
                          </Label>
                        ))}
                      {tag.confidence === 'MANUAL' && (
                        <Label variant="soft" color="success">
                          {t('postings.tagging.manual', 'by hand')}
                        </Label>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography
                      variant="caption"
                      color={tag.needsReview ? 'warning.main' : 'text.secondary'}
                    >
                      {tag.reviewReason ?? tag.notes ?? ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {me.canPrepare && SOURCE_LABEL[tag.sourceTable] && (
                      <Button size="small" variant="outlined" onClick={() => setEditing(tag)}>
                        {t('postings.tagging.tagButton', 'Tag')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && !tags.length && (
          <EmptyContent
            title={
              all
                ? t('postings.tagging.noTags', 'No tags yet')
                : t('postings.tagging.clear', 'Nothing to tag')
            }
            description={t(
              'postings.tagging.clearHelp',
              'Every posted invoice, expense and payroll run has a practice the rules are sure of.'
            )}
            sx={{ py: 6 }}
          />
        )}
        <TablePagination
          component="div"
          count={total}
          page={pageNo}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(e, p) => setPageNo(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPageNo(0);
          }}
        />
      </Card>

      <CustomerDefaults me={me} catalog={catalog} />

      <TagDialog tag={editing} catalog={catalog} onClose={() => setEditing(null)} />
    </Stack>
  );
}

// ----------------------------------------------------------------------

function TagDialog({ tag, catalog, onClose }) {
  const { t, nameOf } = useFahT();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tag) {
      setForm({
        practiceId: tag.practiceId ?? '',
        engagementId: tag.engagementId ?? '',
        fahCostCentreId: tag.fahCostCentreId ?? '',
        overrideAccountCode: tag.overrideAccountCode ?? '',
        notes: tag.notes ?? '',
      });
    }
  }, [tag]);

  const accounts = catalog.accounts.filter(
    (a) =>
      a.type === 'POSTING' &&
      a.isActive &&
      ['REVENUE', 'COST_OF_REVENUE', 'OPEX', 'OTHER'].includes(a.class)
  );
  const override = accounts.find((a) => a.code === form.overrideAccountCode) ?? null;

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await setTag({
        sourceTable: tag.sourceTable,
        sourceId: tag.sourceId,
        practiceId: form.practiceId || null,
        engagementId: form.engagementId || null,
        fahCostCentreId: form.fahCostCentreId || null,
        overrideAccountCode: form.overrideAccountCode || null,
        notes: form.notes || null,
      });
      toast.success(
        res.reposting
          ? t('postings.tagging.reposted', 'Tagged and reposted')
          : t('postings.tagging.saved', 'Tag saved')
      );
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!tag} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('postings.tagging.dialogTitle', 'Tag')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {tag?.label}
          </Typography>
          <TextField
            select
            label={t('postings.tagging.practice', 'Practice')}
            value={form.practiceId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, practiceId: e.target.value }))}
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              label={t('postings.tagging.engagement', 'Engagement')}
              value={form.engagementId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, engagementId: e.target.value }))}
            >
              <MenuItem value="">
                <em>{t('postings.tagging.none', 'None')}</em>
              </MenuItem>
              {catalog.engagements
                .filter((g) => g.status !== 'CLOSED')
                .map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.code} · {g.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={t('postings.tagging.costCentre', 'Cost centre')}
              value={form.fahCostCentreId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, fahCostCentreId: e.target.value }))}
            >
              <MenuItem value="">
                <em>{t('postings.tagging.none', 'None')}</em>
              </MenuItem>
              {catalog.costCentres
                .filter((c) => c.isActive)
                .map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.code} · {nameOf(c)}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
          <Autocomplete
            options={accounts}
            value={override}
            onChange={(e, v) => setForm((f) => ({ ...f, overrideAccountCode: v?.code ?? '' }))}
            getOptionLabel={(a) => (a ? `${a.code} · ${nameOf(a)}` : '')}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('postings.tagging.override', 'Account instead of the rule’s (optional)')}
              />
            )}
          />
          <TextField
            multiline
            minRows={2}
            label={t('postings.tagging.notes', 'Notes')}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} onClick={handleSave}>
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function CustomerDefaults({ me, catalog }) {
  const { t, nameOf } = useFahT();
  const { defaults, error, loading } = useCustomerDefaults();
  const [editing, setEditing] = useState(null); // {} for new
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const practiceName = (id) => nameOf(catalog.practices.find((p) => p.id === id)) || '—';
  const engagement = (id) => catalog.engagements.find((g) => g.id === id);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteCustomerDefault(removing.customerId);
      toast.success(t('postings.customers.removed', 'Default removed'));
      setRemoving(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ p: 2.5 }}
      >
        <Box>
          <Typography variant="h6">
            {t('postings.customers.title', 'Customer default practices')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
            {t(
              'postings.customers.help',
              'Invoices whose type has no practice of its own (for example E-Invoice) take the customer’s practice from here. Without one they go to Corporate and into the tagging queue.'
            )}
          </Typography>
        </Box>
        {me.canPrepare && (
          <Button
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setEditing({})}
            sx={{ flexShrink: 0 }}
          >
            {t('postings.customers.add', 'Add customer')}
          </Button>
        )}
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('postings.customers.customer', 'Customer')}</TableCell>
              <TableCell>{t('postings.customers.practice', 'Practice')}</TableCell>
              <TableCell>{t('postings.customers.engagement', 'Engagement')}</TableCell>
              <TableCell>{t('postings.customers.note', 'Note')}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {defaults.map((d) => (
              <TableRow key={d.customerId}>
                <TableCell>{d.customerName ?? d.customerId}</TableCell>
                <TableCell>{practiceName(d.practiceId)}</TableCell>
                <TableCell>{engagement(d.engagementId)?.code ?? '—'}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {d.note}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {me.canPrepare && (
                    <>
                      <IconButton size="small" onClick={() => setEditing(d)}>
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setRemoving(d)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!loading && !defaults.length && (
        <EmptyContent
          title={t('postings.customers.empty', 'No customer defaults yet')}
          sx={{ py: 5 }}
        />
      )}

      <CustomerDefaultDialog value={editing} catalog={catalog} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={t('postings.customers.removeTitle', 'Remove this default?')}
        content={t(
          'postings.customers.removeContent',
          'New invoices for this customer will go to Corporate until tagged. Posted ones keep their practice.'
        )}
        action={
          <LoadingButton variant="contained" color="error" loading={busy} onClick={handleDelete}>
            {t('postings.customers.remove', 'Remove')}
          </LoadingButton>
        }
      />
    </Card>
  );
}

function CustomerDefaultDialog({ value, catalog, onClose }) {
  const { t, nameOf } = useFahT();
  const { customers } = useErpCustomers(!!value);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const editingExisting = !!value?.customerId;

  useEffect(() => {
    if (value) {
      setForm({
        customerId: value.customerId ?? '',
        customerName: value.customerName ?? '',
        practiceId: value.practiceId ?? '',
        engagementId: value.engagementId ?? '',
        note: value.note ?? '',
      });
    }
  }, [value]);

  const customer = customers.find((c) => c.id === form.customerId) ?? null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await setCustomerDefault(form.customerId, {
        customerName: form.customerName || null,
        practiceId: form.practiceId,
        engagementId: form.engagementId || null,
        note: form.note || null,
      });
      toast.success(t('postings.customers.saved', 'Customer default saved'));
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
        {editingExisting
          ? t('postings.customers.editTitle', 'Edit customer default')
          : t('postings.customers.addTitle', 'Customer default practice')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            options={customers}
            value={customer}
            disabled={editingExisting}
            onChange={(e, c) =>
              setForm((f) => ({ ...f, customerId: c?.id ?? '', customerName: c?.name ?? '' }))
            }
            getOptionLabel={(c) => c?.name ?? ''}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('postings.customers.customer', 'Customer')}
                placeholder={editingExisting ? form.customerName : undefined}
              />
            )}
          />
          <TextField
            select
            label={t('postings.customers.practice', 'Practice')}
            value={form.practiceId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, practiceId: e.target.value }))}
          >
            {catalog.practices
              .filter((p) => p.isActive)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label={t('postings.customers.engagementOptional', 'Engagement (optional)')}
            value={form.engagementId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, engagementId: e.target.value }))}
          >
            <MenuItem value="">
              <em>{t('postings.tagging.none', 'None')}</em>
            </MenuItem>
            {catalog.engagements
              .filter((g) => g.status !== 'CLOSED')
              .map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.code} · {g.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            label={t('postings.customers.note', 'Note')}
            value={form.note ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
          disabled={!form.customerId || !form.practiceId}
          onClick={handleSave}
        >
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
