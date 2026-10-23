'use client';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fahError, createCostCentre, updateCostCentre } from 'src/actions/fah';

import { Label } from 'src/components/label';
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

const KINDS = { SHARED: 'Shared service', PRACTICE_OVERHEAD: 'Practice overhead' };
const METHODS = {
  DRIVER: 'By driver',
  FIXED_PERCENT: 'Fixed percentages',
  STEP_DOWN: 'Step-down',
  DIRECT: 'Direct (stays put)',
};

const blank = {
  code: '',
  nameEn: '',
  nameAr: '',
  kind: 'SHARED',
  practiceId: '',
  locationId: '',
  allocationMethod: 'DRIVER',
  driver: '',
  stepDownOrder: '',
  isActive: true,
};

export function DimensionCostCentres({ me, costCentres, practices, locations }) {
  const { t, nameOf } = useFahT();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const practiceName = (id) => nameOf(practices.find((p) => p.id === id));
  const locationName = (id) => nameOf(locations.find((l) => l.id === id));

  const openNew = () => {
    setForm(blank);
    setEditing('new');
  };
  const openEdit = (c) => {
    setForm({
      ...blank,
      ...c,
      nameAr: orEmpty(c.nameAr),
      practiceId: orEmpty(c.practiceId),
      locationId: orEmpty(c.locationId),
      allocationMethod: orEmpty(c.allocationMethod),
      driver: orEmpty(c.driver),
      stepDownOrder: orEmpty(c.stepDownOrder),
    });
    setEditing(c);
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      const body = {
        nameEn: form.nameEn.trim(),
        nameAr: orNull(form.nameAr.trim()),
        kind: form.kind,
        practiceId: form.kind === 'PRACTICE_OVERHEAD' ? orNull(form.practiceId) : null,
        locationId: orNull(form.locationId),
        allocationMethod: orNull(form.allocationMethod),
        driver: orNull(form.driver.trim()),
        stepDownOrder: form.stepDownOrder === '' ? null : Number(form.stepDownOrder),
        isActive: form.isActive,
      };
      if (editing === 'new')
        await createCostCentre({ ...body, code: form.code.trim().toUpperCase() });
      else await updateCostCentre(editing.id, body);
      toast.success(t('dims.saved', 'Saved'));
      setEditing(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const valid =
    form.nameEn.trim() &&
    (editing !== 'new' || /^[A-Z_]{2,30}$/.test(form.code)) &&
    (form.kind !== 'PRACTICE_OVERHEAD' || form.practiceId);

  return (
    <>
      <DimensionTable
        title={t('dims.costCentres', 'Cost centres')}
        help={t(
          'dims.costCentresHelp',
          'Shared services and each practice’s own overhead. Operating expenses carry a practice or a cost centre. Not the ERP cost centres.'
        )}
        addLabel={t('dims.addCostCentre', 'Add cost centre')}
        onAdd={me.canControl ? openNew : undefined}
        onRowClick={me.canControl ? openEdit : undefined}
        rows={costCentres}
        minWidth={860}
        columns={[
          {
            key: 'code',
            label: t('dims.code', 'Code'),
            width: 200,
            render: (c) => <Code>{c.code}</Code>,
          },
          { key: 'name', label: t('dims.name', 'Name'), render: (c) => nameOf(c) },
          {
            key: 'kind',
            label: t('dims.kind', 'Kind'),
            render: (c) => (
              <Label variant="soft" color={c.kind === 'SHARED' ? 'info' : 'secondary'}>
                {t(`dims.kinds.${c.kind}`, KINDS[c.kind] ?? c.kind)}
              </Label>
            ),
          },
          {
            key: 'owner',
            label: t('dims.practiceOrLocation', 'Practice / location'),
            render: (c) => practiceName(c.practiceId) || locationName(c.locationId) || '—',
          },
          {
            key: 'method',
            label: t('dims.allocation', 'Allocation'),
            render: (c) =>
              c.allocationMethod
                ? `${t(`dims.methods.${c.allocationMethod}`, METHODS[c.allocationMethod] ?? c.allocationMethod)}${c.stepDownOrder ? ` · ${c.stepDownOrder}` : ''}`
                : '—',
          },
          {
            key: 'active',
            label: t('dims.status', 'Status'),
            render: (c) => <ActiveLabel active={c.isActive} />,
          },
        ]}
      />

      <DimensionDialog
        open={!!editing}
        title={
          editing === 'new'
            ? t('dims.addCostCentre', 'Add cost centre')
            : t('dims.editCostCentre', 'Edit cost centre')
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
          inputProps={{ style: { fontFamily: 'monospace' }, maxLength: 30 }}
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
            select
            fullWidth
            label={t('dims.kind', 'Kind')}
            value={form.kind}
            onChange={set('kind')}
          >
            {Object.entries(KINDS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {t(`dims.kinds.${value}`, label)}
              </MenuItem>
            ))}
          </TextField>
          {form.kind === 'PRACTICE_OVERHEAD' ? (
            <TextField
              select
              fullWidth
              label={t('dims.practice', 'Practice')}
              value={form.practiceId}
              onChange={set('practiceId')}
            >
              {practices
                .filter((p) => p.isActive)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {nameOf(p)}
                  </MenuItem>
                ))}
            </TextField>
          ) : (
            <TextField
              select
              fullWidth
              label={t('dims.location', 'Location')}
              value={form.locationId}
              onChange={set('locationId')}
            >
              <MenuItem value="">{t('dims.none', 'None')}</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {nameOf(l)}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            fullWidth
            label={t('dims.allocationMethod', 'Allocation method')}
            value={form.allocationMethod}
            onChange={set('allocationMethod')}
          >
            <MenuItem value="">{t('dims.none', 'None')}</MenuItem>
            {Object.entries(METHODS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {t(`dims.methods.${value}`, label)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label={t('dims.driver', 'Driver')}
            placeholder="HEADCOUNT"
            value={form.driver}
            onChange={set('driver')}
          />
          <TextField
            type="number"
            label={t('dims.stepDownOrder', 'Step-down order')}
            value={form.stepDownOrder}
            onChange={set('stepDownOrder')}
            sx={{ width: { sm: 180 } }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Switch
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          }
          label={t('dims.active', 'Active')}
        />
      </DimensionDialog>
    </>
  );
}
