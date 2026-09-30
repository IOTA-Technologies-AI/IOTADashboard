import { useState, useEffect, useCallback } from 'react';

import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fCurrency } from 'src/utils/format-number';

import { computeRateCard, addContractLine, updateContractLine } from 'src/actions/employee-billing';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v) || 0);

const emptyForm = (contract) => ({
  employee: null,
  basicSalary: '',
  housingAllowance: '',
  transportAllowance: '',
  otherAllowances: '',
  nationality: '',
  isExpat: true,
  familyStatus: false,
  dependentsCount: 0,
  insuranceCostPerPax: 3000,
  ticketCostPerPax: 2500,
  rateOverride: '',
  startDate: contract?.startDate || new Date().toISOString().slice(0, 10),
  endDate: contract?.endDate || '',
  isActive: true,
  notes: '',
});

/**
 * Add or edit one employee on a billing contract. Pulls salary, nationality
 * and family details from the employee record, computes the rate card through
 * the backend (same engine as the resource-calculation quotation), and lets
 * the user adjust the editable lines and switch optional ones (e.g. Zakat
 * provision) on or off before saving.
 */
export function ContractLineDialog({ open, onClose, contract, line, employees, onSaved }) {
  const [form, setForm] = useState(emptyForm(contract));
  const [lineItems, setLineItems] = useState([]);
  const [rate, setRate] = useState(null);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!line?.id;

  useEffect(() => {
    if (!open) return;
    if (line) {
      setForm({
        employee: employees.find((e) => e.id === line.employeeId) || {
          id: line.employeeId,
          firstName: line.employeeName,
          lastName: '',
          employeeId: line.employeeCode,
          designation: line.designation,
        },
        basicSalary: line.basicSalary ?? '',
        housingAllowance: line.housingAllowance ?? '',
        transportAllowance: line.transportAllowance ?? '',
        otherAllowances: line.otherAllowances ?? '',
        nationality: line.nationality || '',
        isExpat: line.isExpat ?? true,
        familyStatus: !!line.familyStatus,
        dependentsCount: line.dependentsCount ?? 0,
        insuranceCostPerPax: line.insuranceCostPerPax ?? 3000,
        ticketCostPerPax: line.ticketCostPerPax ?? 2500,
        rateOverride: line.rateOverride ?? '',
        startDate: line.startDate || '',
        endDate: line.endDate || '',
        isActive: line.isActive ?? true,
        notes: line.notes || '',
      });
      setLineItems(Array.isArray(line.lineItems) ? line.lineItems : []);
      setRate({ monthlyRate: line.monthlyRate, gosiRate: line.gosiRate });
    } else {
      setForm(emptyForm(contract));
      setLineItems([]);
      setRate(null);
    }
  }, [open, line, contract, employees]);

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickEmployee = (_, emp) => {
    if (!emp) {
      setForm((prev) => ({ ...prev, employee: null }));
      return;
    }
    const nationality = emp.nationality || '';
    setForm((prev) => ({
      ...prev,
      employee: emp,
      basicSalary: emp.basicSalary ?? prev.basicSalary,
      housingAllowance: emp.housingAllowance ?? prev.housingAllowance,
      transportAllowance:
        emp.transportAllowance ?? emp.transportationAllowance ?? prev.transportAllowance,
      otherAllowances: emp.otherAllowances ?? prev.otherAllowances,
      nationality,
      isExpat: !/saudi/i.test(nationality),
      familyStatus: !!emp.familyStatus || emp.maritalStatus === 'Married',
      dependentsCount: Number(emp.dependentsCount) || 0,
      startDate: prev.startDate || emp.joiningDate || contract?.startDate || '',
    }));
    setLineItems([]);
    setRate(null);
  };

  const inputs = useCallback(
    (items) => ({
      iotaOffice: contract?.iotaOffice || 'KSA',
      nationality: form.nationality,
      isExpat: !!form.isExpat,
      basicSalary: num(form.basicSalary),
      housingAllowance: num(form.housingAllowance),
      transportAllowance: num(form.transportAllowance),
      otherAllowances: num(form.otherAllowances),
      familyStatus: !!form.familyStatus,
      dependentsCount: num(form.dependentsCount),
      insuranceCostPerPax: num(form.insuranceCostPerPax) || 3000,
      ticketCostPerPax: num(form.ticketCostPerPax) || 2500,
      ...(items?.length ? { lineItems: items } : {}),
    }),
    [contract, form]
  );

  const handleCompute = async (items = lineItems) => {
    setComputing(true);
    try {
      const res = await computeRateCard(inputs(items));
      setLineItems(res.lineItems);
      setRate(res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Rate calculation failed');
    } finally {
      setComputing(false);
    }
  };

  const handleItemAmount = (id, value) => {
    setLineItems((prev) => prev.map((it) => (it.id === id ? { ...it, monthly: num(value) } : it)));
  };
  const handleItemActive = (id, active) => {
    const next = lineItems.map((it) => (it.id === id ? { ...it, isActive: active } : it));
    setLineItems(next);
    handleCompute(next);
  };

  const handleSave = async () => {
    if (!form.employee) {
      toast.error('Pick an employee.');
      return;
    }
    if (!form.startDate) {
      toast.error('Start date is required.');
      return;
    }
    setSaving(true);
    try {
      const emp = form.employee;
      const payload = {
        ...inputs(lineItems),
        employeeId: emp.id,
        employeeCode: emp.employeeId || undefined,
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        designation: emp.designation || undefined,
        rateOverride: form.rateOverride === '' ? null : num(form.rateOverride),
        startDate: form.startDate,
        endDate: form.endDate || null,
        isActive: !!form.isActive,
        notes: form.notes || undefined,
      };
      const saved = isEdit
        ? await updateContractLine(contract.id, line.id, payload)
        : await addContractLine(contract.id, payload);
      toast.success(isEdit ? 'Employee line updated' : 'Employee added to contract');
      onSaved?.(saved);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const currency = contract?.currencyCode || 'SAR';
  const monthly = rate?.monthlyRate ?? null;
  const billed = form.rateOverride !== '' ? num(form.rateOverride) : monthly;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit employee line' : 'Add employee to contract'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Autocomplete
            options={employees}
            value={form.employee}
            onChange={handlePickEmployee}
            disabled={isEdit}
            getOptionLabel={(o) =>
              `${o.firstName || ''} ${o.lastName || ''}`.trim() +
              (o.employeeId ? ` (${o.employeeId})` : '') +
              (o.designation ? ` — ${o.designation}` : '')
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Employee *" />}
          />
          {form.employee &&
            form.employee.onboardingStatus &&
            form.employee.onboardingStatus !== 'completed' && (
              <Alert severity="warning">
                Onboarding for this employee is{' '}
                <strong>{String(form.employee.onboardingStatus).replace(/_/g, ' ')}</strong>.
                Family, GOSI and insurance details drive the rate card, so complete HR &gt; Employee
                Onboarding first or check the inputs below carefully.
              </Alert>
            )}

          <Typography variant="subtitle2">Salary (monthly, from the employee record)</Typography>
          <Grid container spacing={2}>
            {[
              ['basicSalary', 'Basic'],
              ['housingAllowance', 'Housing'],
              ['transportAllowance', 'Transport'],
              ['otherAllowances', 'Other'],
            ].map(([key, label]) => (
              <Grid key={key} size={{ xs: 6, sm: 3 }}>
                <TextField
                  label={label}
                  type="number"
                  value={form[key]}
                  onChange={set(key)}
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle2">Statutory & family inputs</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Nationality"
                value={form.nationality}
                onChange={set('nationality')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <FormControlLabel
                control={<Switch checked={!!form.isExpat} onChange={set('isExpat')} />}
                label={form.isExpat ? 'Expatriate (GOSI 2%)' : 'Saudi national (GOSI 11.75%)'}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <FormControlLabel
                control={<Switch checked={!!form.familyStatus} onChange={set('familyStatus')} />}
                label="Family status"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Dependants"
                type="number"
                value={form.dependentsCount}
                onChange={set('dependentsCount')}
                fullWidth
                inputProps={{ min: 0 }}
                disabled={!form.familyStatus}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Insurance / pax / year"
                type="number"
                value={form.insuranceCostPerPax}
                onChange={set('insuranceCostPerPax')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label="Tickets / pax / year"
                type="number"
                value={form.ticketCostPerPax}
                onChange={set('ticketCostPerPax')}
                fullWidth
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} alignItems="center">
            <LoadingButton variant="outlined" loading={computing} onClick={() => handleCompute([])}>
              {lineItems.length ? 'Recompute from template' : 'Compute rate card'}
            </LoadingButton>
            {lineItems.length > 0 && (
              <LoadingButton
                variant="text"
                loading={computing}
                onClick={() => handleCompute(lineItems)}
              >
                Recalculate with my edits
              </LoadingButton>
            )}
          </Stack>

          {lineItems.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cost component</TableCell>
                  <TableCell>Basis</TableCell>
                  <TableCell align="right" sx={{ width: 160 }}>
                    Monthly
                  </TableCell>
                  <TableCell align="center" sx={{ width: 80 }}>
                    Bill
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((it) => (
                  <TableRow key={it.id} sx={{ opacity: it.isActive ? 1 : 0.5 }}>
                    <TableCell>{it.label}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {it.isComputed ? it.formula : 'entered'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {it.isEditable && !it.isComputed ? (
                        <TextField
                          size="small"
                          type="number"
                          value={it.monthly}
                          onChange={(e) => handleItemAmount(it.id, e.target.value)}
                          inputProps={{ min: 0, style: { textAlign: 'right' } }}
                        />
                      ) : (
                        fCurrency(it.monthly, { currencyCode: currency })
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={!!it.isActive}
                        onChange={(e) => handleItemActive(it.id, e.target.checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2}>
                    <strong>Monthly billing rate (ex-VAT)</strong>
                    {rate?.gosiRate != null && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        GOSI at {(rate.gosiRate * 100).toFixed(2)}% on basic + housing · VAT{' '}
                        {contract?.vatRate}% added on the invoice
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {monthly != null ? fCurrency(monthly, { currencyCode: currency }) : '—'}
                    </strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}

          <Typography variant="subtitle2">Billing window</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Start date *"
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="End date"
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Rate override"
                type="number"
                value={form.rateOverride}
                onChange={set('rateOverride')}
                fullWidth
                helperText="Bills this instead of the rate card"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControlLabel
                control={<Switch checked={!!form.isActive} onChange={set('isActive')} />}
                label="Active"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Notes" value={form.notes} onChange={set('notes')} fullWidth />
            </Grid>
          </Grid>

          {billed != null && (
            <Alert severity="success" icon={false}>
              Bills <strong>{fCurrency(billed, { currencyCode: currency })}</strong> per month
              ex-VAT
              {form.rateOverride !== '' ? ' (override)' : ''}; partial months are pro-rated by days.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={saving}
          onClick={handleSave}
          disabled={!form.employee}
        >
          {isEdit ? 'Save changes' : 'Add employee'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
