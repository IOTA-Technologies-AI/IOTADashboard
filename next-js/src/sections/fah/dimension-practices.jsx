'use client';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fahError, createPractice, updatePractice } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';

import { useFahT } from './fah-gate';
import {
  Code,
  orNull,
  orEmpty,
  ActiveLabel,
  DimensionTable,
  DimensionDialog,
} from './dimension-shared';

// ----------------------------------------------------------------------

const blank = {
  code: '',
  nameEn: '',
  nameAr: '',
  leadEmail: '',
  isRevenueCentre: true,
  isActive: true,
  sortOrder: 0,
};

export function DimensionPractices({ me, practices }) {
  const { t, nameOf } = useFahT();
  const [editing, setEditing] = useState(null); // null | 'new' | practice
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setForm(blank);
    setEditing('new');
  };
  const openEdit = (p) => {
    setForm({ ...blank, ...p, nameAr: orEmpty(p.nameAr), leadEmail: orEmpty(p.leadEmail) });
    setEditing(p);
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      const body = {
        nameEn: form.nameEn.trim(),
        nameAr: orNull(form.nameAr.trim()),
        leadEmail: orNull(form.leadEmail.trim().toLowerCase()),
        isRevenueCentre: form.isRevenueCentre,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing === 'new')
        await createPractice({ ...body, code: form.code.trim().toUpperCase() });
      else await updatePractice(editing.id, body);
      toast.success(t('dims.saved', 'Saved'));
      setEditing(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const valid = form.nameEn.trim() && (editing !== 'new' || /^[A-Z_]{2,20}$/.test(form.code));

  return (
    <>
      <DimensionTable
        title={t('dims.practices', 'Practices')}
        help={t(
          'dims.practicesHelp',
          'Revenue centres. Revenue and cost of revenue always carry a practice.'
        )}
        addLabel={t('dims.addPractice', 'Add practice')}
        onAdd={me.canControl ? openNew : undefined}
        onRowClick={me.canControl ? openEdit : undefined}
        rows={practices}
        columns={[
          {
            key: 'code',
            label: t('dims.code', 'Code'),
            width: 180,
            render: (p) => <Code>{p.code}</Code>,
          },
          { key: 'name', label: t('dims.name', 'Name'), render: (p) => nameOf(p) },
          {
            key: 'kind',
            label: t('dims.kind', 'Kind'),
            render: (p) =>
              p.isRevenueCentre
                ? t('dims.revenueCentre', 'Revenue centre')
                : t('dims.corporate', 'Corporate'),
          },
          {
            key: 'lead',
            label: t('dims.lead', 'Lead'),
            render: (p) => (
              <Typography variant="body2" color="text.secondary" noWrap>
                {p.leadEmail || '—'}
              </Typography>
            ),
          },
          {
            key: 'active',
            label: t('dims.status', 'Status'),
            render: (p) => <ActiveLabel active={p.isActive} />,
          },
        ]}
      />

      <DimensionDialog
        open={!!editing}
        title={
          editing === 'new'
            ? t('dims.addPractice', 'Add practice')
            : t('dims.editPractice', 'Edit practice')
        }
        busy={busy}
        valid={valid}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      >
        <TextField
          label={t('dims.code', 'Code')}
          value={form.code}
          disabled={editing !== 'new'}
          onChange={(e) =>
            setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') }))
          }
          helperText={t('dims.codeHelp', 'Capital letters and underscores. Fixed once saved.')}
          inputProps={{ style: { fontFamily: 'monospace' }, maxLength: 20 }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label={t('dims.nameEn', 'Name (English)')}
            value={form.nameEn}
            onChange={set('nameEn')}
          />
          <TextField
            fullWidth
            label={t('dims.nameAr', 'Name (Arabic)')}
            value={form.nameAr}
            onChange={set('nameAr')}
            inputProps={{ dir: 'rtl' }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label={t('dims.leadEmail', 'Practice lead e-mail')}
            value={form.leadEmail}
            onChange={set('leadEmail')}
          />
          <TextField
            type="number"
            label={t('dims.sortOrder', 'Order')}
            value={form.sortOrder}
            onChange={set('sortOrder')}
            sx={{ width: { sm: 120 } }}
          />
        </Stack>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={form.isRevenueCentre}
                disabled={editing !== 'new'}
                onChange={(e) => setForm((f) => ({ ...f, isRevenueCentre: e.target.checked }))}
              />
            }
            label={t('dims.revenueCentre', 'Revenue centre')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label={t('dims.active', 'Active')}
          />
        </Stack>
      </DimensionDialog>
    </>
  );
}
