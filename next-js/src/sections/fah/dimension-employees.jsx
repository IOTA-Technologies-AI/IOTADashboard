'use client';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  fahError,
  useErpEmployees,
  useEmployeePractice,
  createEmployeePractice,
  updateEmployeePractice,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { today } from './fah-labels';
import { useFahT } from './fah-gate';
import { orNull, orEmpty, DimensionTable, DimensionDialog } from './dimension-shared';

// ----------------------------------------------------------------------

const blank = {
  employeesId: null,
  employeeCode: '',
  employeeName: '',
  entraObjectId: '',
  practiceId: '',
  fahCostCentreId: '',
  locationId: '',
  isBillable: false,
  fte: 1,
  validFrom: today(),
  validTo: '',
};

export function DimensionEmployees({ me, practices, costCentres, locations }) {
  const { t, nameOf } = useFahT();
  const { assignments, error } = useEmployeePractice();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const { employees } = useErpEmployees(!!editing);

  const practiceName = (id) => nameOf(practices.find((p) => p.id === id)) || '—';
  const ccCode = (id) => costCentres.find((c) => c.id === id)?.code;

  const openNew = () => {
    setForm({ ...blank, validFrom: today() });
    setEditing('new');
  };
  const openEdit = (a) => {
    setForm({
      ...blank,
      ...a,
      employeeCode: orEmpty(a.employeeCode),
      employeeName: orEmpty(a.employeeName),
      entraObjectId: orEmpty(a.entraObjectId),
      fahCostCentreId: orEmpty(a.fahCostCentreId),
      locationId: orEmpty(a.locationId),
      validTo: orEmpty(a.validTo),
    });
    setEditing(a);
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const fte = Number(form.fte);
  const valid =
    (form.employeesId || form.entraObjectId.trim()) &&
    form.practiceId &&
    form.validFrom &&
    fte >= 0.01 &&
    fte <= 1 &&
    (!form.validTo || form.validTo >= form.validFrom);

  const handleSave = async () => {
    setBusy(true);
    try {
      const body = {
        employeesId: form.employeesId ?? null,
        employeeCode: orNull(form.employeeCode),
        employeeName: orNull(form.employeeName),
        entraObjectId: orNull(form.entraObjectId.trim()),
        practiceId: form.practiceId,
        fahCostCentreId: orNull(form.fahCostCentreId),
        locationId: orNull(form.locationId),
        isBillable: form.isBillable,
        fte,
        validFrom: form.validFrom,
        validTo: orNull(form.validTo),
      };
      if (editing === 'new') await createEmployeePractice(body);
      else await updateEmployeePractice(editing.id, body);
      toast.success(t('dims.saved', 'Saved'));
      setEditing(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const employeeValue = form.employeesId
    ? (employees.find((e) => e.id === form.employeesId) ?? {
        id: form.employeesId,
        name: form.employeeName,
        employeeCode: form.employeeCode,
      })
    : null;

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      <DimensionTable
        title={t('dims.employees', 'Employees → practice')}
        help={t(
          'dims.employeesHelp',
          'Which practice each employee belongs to, by date. Payroll and employee expenses follow it; headcount drives allocations.'
        )}
        addLabel={t('dims.addEmployee', 'Assign employee')}
        onAdd={me.canPrepare ? openNew : undefined}
        onRowClick={me.canPrepare ? openEdit : undefined}
        rows={assignments}
        minWidth={860}
        columns={[
          {
            key: 'employee',
            label: t('dims.employee', 'Employee'),
            render: (a) => (
              <Stack>
                <Typography variant="body2">
                  {a.employeeName || a.employeeCode || a.entraObjectId}
                </Typography>
                {a.employeeCode && (
                  <Typography variant="caption" color="text.secondary">
                    {a.employeeCode}
                  </Typography>
                )}
              </Stack>
            ),
          },
          {
            key: 'practice',
            label: t('dims.practice', 'Practice'),
            render: (a) => practiceName(a.practiceId),
          },
          {
            key: 'cc',
            label: t('dims.costCentre', 'Cost centre'),
            render: (a) => ccCode(a.fahCostCentreId) || '—',
          },
          {
            key: 'billable',
            label: t('dims.billable', 'Billable'),
            render: (a) => (
              <Label variant="soft" color={a.isBillable ? 'info' : 'default'}>
                {a.isBillable
                  ? t('dims.billableYes', 'Billable')
                  : t('dims.billableNo', 'Indirect')}
              </Label>
            ),
          },
          {
            key: 'fte',
            label: t('dims.fte', 'FTE'),
            align: 'right',
            render: (a) => Number(a.fte).toFixed(2),
          },
          {
            key: 'dates',
            label: t('dims.validity', 'Valid'),
            render: (a) => (
              <Typography variant="body2" color="text.secondary" noWrap>
                {a.validFrom} – {a.validTo || t('dims.ongoing', 'ongoing')}
              </Typography>
            ),
          },
        ]}
      />

      <DimensionDialog
        open={!!editing}
        title={
          editing === 'new'
            ? t('dims.addEmployee', 'Assign employee')
            : t('dims.editEmployee', 'Edit assignment')
        }
        busy={busy}
        valid={valid}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      >
        <Autocomplete
          value={employeeValue}
          options={employees}
          getOptionLabel={(o) =>
            o ? `${o.name}${o.employeeCode ? ` · ${o.employeeCode}` : ''}` : ''
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(e, v) =>
            setForm((f) => ({
              ...f,
              employeesId: v?.id ?? null,
              employeeCode: v?.employeeCode ?? '',
              employeeName: v?.name ?? '',
            }))
          }
          renderInput={(params) => <TextField {...params} label={t('dims.employee', 'Employee')} />}
        />
        <TextField
          label={t('dims.entraObjectId', 'Entra object id (optional)')}
          value={form.entraObjectId}
          onChange={set('entraObjectId')}
          helperText={t(
            'dims.entraHelp',
            'The id invoices, expenses and payroll lines carry for this person, if known.'
          )}
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            fullWidth
            label={t('dims.practice', 'Practice')}
            value={form.practiceId}
            onChange={set('practiceId')}
          >
            {practices
              .filter((p) => p.isActive || p.id === form.practiceId)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            fullWidth
            label={t('dims.costCentre', 'Cost centre')}
            value={form.fahCostCentreId}
            onChange={set('fahCostCentreId')}
          >
            <MenuItem value="">{t('dims.none', 'None')}</MenuItem>
            {costCentres
              .filter((c) => c.isActive || c.id === form.fahCostCentreId)
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} · {nameOf(c)}
                </MenuItem>
              ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
          <TextField
            type="number"
            label={t('dims.fte', 'FTE')}
            value={form.fte}
            onChange={set('fte')}
            inputProps={{ min: 0.01, max: 1, step: 0.05 }}
            error={!(fte >= 0.01 && fte <= 1)}
            sx={{ width: { sm: 140 } }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            type="date"
            label={t('dims.validFrom', 'Valid from')}
            value={form.validFrom}
            onChange={set('validFrom')}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label={t('dims.validTo', 'Valid to (optional)')}
            value={form.validTo}
            onChange={set('validTo')}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Switch
              checked={form.isBillable}
              onChange={(e) => setForm((f) => ({ ...f, isBillable: e.target.checked }))}
            />
          }
          label={t('dims.billableSwitch', 'Billable to customers (cost of revenue)')}
        />
      </DimensionDialog>
    </>
  );
}
