'use client';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { fahError, useErpCustomers, createEngagement, updateEngagement } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { useFahT } from './fah-gate';
import { Code, orNull, orEmpty, DimensionTable, DimensionDialog } from './dimension-shared';

// ----------------------------------------------------------------------

const STATUS = {
  ACTIVE: { label: 'Active', color: 'success' },
  ON_HOLD: { label: 'On hold', color: 'warning' },
  CLOSED: { label: 'Closed', color: 'default' },
};

const blank = {
  name: '',
  owningPracticeId: '',
  legalEntityId: '',
  customerId: '',
  customerName: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  notes: '',
};

export function DimensionEngagements({ me, engagements, practices, entities }) {
  const { t, nameOf } = useFahT();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const { customers } = useErpCustomers(!!editing);

  const practiceName = (id) => nameOf(practices.find((p) => p.id === id)) || '—';
  const bookCode = (id) => entities.find((e) => e.id === id)?.shortCode ?? '—';

  const openNew = () => {
    setForm(blank);
    setEditing('new');
  };
  const openEdit = (e) => {
    setForm({
      ...blank,
      name: e.name,
      owningPracticeId: e.owningPracticeId,
      legalEntityId: orEmpty(e.legalEntityId),
      customerId: orEmpty(e.customerId),
      customerName: orEmpty(e.customerName),
      startDate: orEmpty(e.startDate),
      endDate: orEmpty(e.endDate),
      status: e.status,
      notes: orEmpty(e.notes),
    });
    setEditing(e);
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        owningPracticeId: form.owningPracticeId,
        legalEntityId: orNull(form.legalEntityId),
        customerId: orNull(form.customerId),
        customerName: orNull(form.customerName),
        startDate: orNull(form.startDate),
        endDate: orNull(form.endDate),
        status: form.status,
        notes: orNull(form.notes.trim()),
      };
      if (editing === 'new') await createEngagement(body);
      else await updateEngagement(editing.id, body);
      toast.success(t('dims.saved', 'Saved'));
      setEditing(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const customerValue = form.customerId ? { id: form.customerId, name: form.customerName } : null;
  const valid =
    form.name.trim() &&
    form.owningPracticeId &&
    (!form.endDate || !form.startDate || form.endDate >= form.startDate);

  return (
    <>
      <DimensionTable
        title={t('dims.engagements', 'Engagements')}
        help={t(
          'dims.engagementsHelp',
          'A deal, contract or programme. Optional on ordinary revenue; needed for inter-practice work and profit share.'
        )}
        addLabel={t('dims.addEngagement', 'Add engagement')}
        onAdd={me.canPrepare ? openNew : undefined}
        onRowClick={me.canPrepare ? openEdit : undefined}
        rows={engagements}
        minWidth={900}
        columns={[
          {
            key: 'code',
            label: t('dims.code', 'Code'),
            width: 110,
            render: (e) => <Code>{e.code}</Code>,
          },
          { key: 'name', label: t('dims.name', 'Name'), render: (e) => e.name },
          {
            key: 'practice',
            label: t('dims.owningPractice', 'Owning practice'),
            render: (e) => practiceName(e.owningPracticeId),
          },
          {
            key: 'customer',
            label: t('dims.customer', 'Customer'),
            render: (e) => (
              <Typography variant="body2" noWrap>
                {e.customerName || '—'}
              </Typography>
            ),
          },
          { key: 'book', label: t('dims.book', 'Book'), render: (e) => bookCode(e.legalEntityId) },
          {
            key: 'dates',
            label: t('dims.dates', 'Dates'),
            render: (e) => (
              <Typography variant="body2" color="text.secondary" noWrap>
                {e.startDate || '…'} – {e.endDate || '…'}
              </Typography>
            ),
          },
          {
            key: 'status',
            label: t('dims.status', 'Status'),
            render: (e) => (
              <Label variant="soft" color={STATUS[e.status]?.color ?? 'default'}>
                {t(`dims.engagementStatus.${e.status}`, STATUS[e.status]?.label ?? e.status)}
              </Label>
            ),
          },
        ]}
      />

      <DimensionDialog
        open={!!editing}
        title={
          editing === 'new'
            ? t('dims.addEngagement', 'Add engagement')
            : `${t('dims.editEngagement', 'Edit engagement')} ${editing?.code ?? ''}`
        }
        busy={busy}
        valid={valid}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      >
        <TextField label={t('dims.name', 'Name')} value={form.name} onChange={set('name')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            fullWidth
            label={t('dims.owningPractice', 'Owning practice')}
            value={form.owningPracticeId}
            onChange={set('owningPracticeId')}
          >
            {practices
              .filter((p) => p.isActive || p.id === form.owningPracticeId)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            fullWidth
            label={t('dims.book', 'Book')}
            value={form.legalEntityId}
            onChange={set('legalEntityId')}
          >
            <MenuItem value="">{t('dims.none', 'None')}</MenuItem>
            {entities.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.shortCode} · {nameOf(e)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Autocomplete
          value={customerValue}
          options={customers}
          getOptionLabel={(o) => o?.name ?? ''}
          isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
          onChange={(e, v) =>
            setForm((f) => ({
              ...f,
              customerId: v ? String(v.id) : '',
              customerName: v?.name ?? '',
            }))
          }
          renderInput={(params) => <TextField {...params} label={t('dims.customer', 'Customer')} />}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            type="date"
            label={t('dims.startDate', 'Start date')}
            value={form.startDate}
            onChange={set('startDate')}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label={t('dims.endDate', 'End date')}
            value={form.endDate}
            onChange={set('endDate')}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            fullWidth
            label={t('dims.status', 'Status')}
            value={form.status}
            onChange={set('status')}
          >
            {Object.entries(STATUS).map(([value, s]) => (
              <MenuItem key={value} value={value}>
                {t(`dims.engagementStatus.${value}`, s.label)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          label={t('dims.notes', 'Notes')}
          value={form.notes}
          onChange={set('notes')}
          multiline
          minRows={2}
        />
      </DimensionDialog>
    </>
  );
}
