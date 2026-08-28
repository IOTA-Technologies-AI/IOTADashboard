'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { getEmployees, createMsiRequest, updateMsiRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const MsiSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  effectiveDate: z.string().min(1, { message: 'Effective date is required!' }),
  revisedBasic: z.coerce.number().min(0, { message: 'Basic salary cannot be negative!' }),
  revisedHousing: z.coerce.number().min(0),
  revisedTransport: z.coerce.number().min(0),
  revisedOther: z.coerce.number().min(0),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const COMPONENTS = [
  { key: 'Basic', label: 'Basic Salary' },
  { key: 'Housing', label: 'Housing Allowance' },
  { key: 'Transport', label: 'Transportation Allowance' },
  { key: 'Other', label: 'Other Allowances' },
];

// ----------------------------------------------------------------------

/**
 * Create or amend a Monthly Salary Increment.
 *
 * On create the "current" column is read live from the selected employee. On
 * edit it comes from the request's own snapshot instead — the increment was
 * judged against the salary as it stood when it was raised, and refreshing
 * that mid-approval would silently change what the approver is agreeing to.
 */
export function MsiNewEditForm({ currentMsi }) {
  const router = useRouter();
  const isEdit = Boolean(currentMsi);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const defaultValues = useMemo(
    () => ({
      employeeId: currentMsi?.employeeId ?? '',
      effectiveDate: currentMsi?.effectiveDate?.slice(0, 10) ?? '',
      revisedBasic: num(currentMsi?.revisedBasic),
      revisedHousing: num(currentMsi?.revisedHousing),
      revisedTransport: num(currentMsi?.revisedTransport),
      revisedOther: num(currentMsi?.revisedOther),
      reason: currentMsi?.reason ?? '',
      notes: currentMsi?.notes ?? '',
    }),
    [currentMsi]
  );

  const methods = useForm({ resolver: zodResolver(MsiSchema), defaultValues });
  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (isEdit) return undefined;
    let active = true;
    getEmployees()
      .then((list) => {
        if (active) setEmployees(list || []);
      })
      .catch((error) => {
        console.error('Failed to load employees', error);
        toast.error('Failed to load employees');
      });
    return () => {
      active = false;
    };
  }, [isEdit]);

  // Picking an employee seeds the revised figures with what they earn today,
  // so HR edits the numbers that are changing rather than retyping the rest.
  useEffect(() => {
    if (isEdit || !values.employeeId) return;
    const emp = employees.find((e) => Number(e.id) === Number(values.employeeId));
    if (!emp || emp === selectedEmployee) return;
    setSelectedEmployee(emp);
    setValue('revisedBasic', num(emp.basicSalary));
    setValue('revisedHousing', num(emp.housingAllowance));
    setValue('revisedTransport', num(emp.transportAllowance));
    setValue('revisedOther', num(emp.otherAllowances));
  }, [values.employeeId, employees, isEdit, selectedEmployee, setValue]);

  // The current column: the employee record on create, the snapshot on edit.
  const current = useMemo(() => {
    if (isEdit) {
      return {
        Basic: num(currentMsi.currentBasic),
        Housing: num(currentMsi.currentHousing),
        Transport: num(currentMsi.currentTransport),
        Other: num(currentMsi.currentOther),
      };
    }
    return {
      Basic: num(selectedEmployee?.basicSalary),
      Housing: num(selectedEmployee?.housingAllowance),
      Transport: num(selectedEmployee?.transportAllowance),
      Other: num(selectedEmployee?.otherAllowances),
    };
  }, [isEdit, currentMsi, selectedEmployee]);

  const currentGross = Object.values(current).reduce((a, b) => a + b, 0);
  const revisedGross =
    num(values.revisedBasic) +
    num(values.revisedHousing) +
    num(values.revisedTransport) +
    num(values.revisedOther);
  const delta = revisedGross - currentGross;
  const pct = currentGross > 0 ? (delta / currentGross) * 100 : 0;

  const currency = (isEdit ? currentMsi?.currencyCode : selectedEmployee?.currencyCode) || 'SAR';
  const hasEmployee = isEdit || Boolean(selectedEmployee);
  const isDecrease = hasEmployee && revisedGross < currentGross;

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (revisedGross < currentGross) {
        toast.error('The revised salary is below the current salary.');
        return;
      }

      const payload = {
        effectiveDate: data.effectiveDate,
        revisedBasic: num(data.revisedBasic),
        revisedHousing: num(data.revisedHousing),
        revisedTransport: num(data.revisedTransport),
        revisedOther: num(data.revisedOther),
        reason: data.reason?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      if (isEdit) {
        await updateMsiRequest(currentMsi.id, payload);
        toast.success('Increment updated');
        router.push(paths.dashboard.hr.employee.finance.msi.details(currentMsi.id));
      } else {
        const created = await createMsiRequest({
          ...payload,
          employeeId: Number(data.employeeId),
        });
        toast.success('Increment submitted for approval');
        router.push(paths.dashboard.hr.employee.finance.msi.details(created.id));
      }
    } catch (error) {
      console.error('Failed to save increment', error);
      toast.error(error?.response?.data?.message || 'Failed to save increment');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Employee
              </Typography>

              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                {isEdit ? (
                  // Plain field, not Field.Text: it displays the snapshot and is
                  // not part of the form, so it must not register with RHF.
                  <TextField
                    label="Employee"
                    value={`${currentMsi.employeeName || ''}${
                      currentMsi.employeeCode ? ` (${currentMsi.employeeCode})` : ''
                    }`}
                    disabled
                    helperText="The employee cannot be changed after the increment is raised."
                  />
                ) : (
                  <Field.Select name="employeeId" label="Employee" required>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {`${emp.firstName || ''} ${emp.lastName || ''}`.trim()}
                        {emp.employeeId ? ` (${emp.employeeId})` : ''}
                      </MenuItem>
                    ))}
                  </Field.Select>
                )}

                <Field.Text
                  name="effectiveDate"
                  label="Effective Date"
                  type="date"
                  required
                  InputLabelProps={{ shrink: true }}
                  helperText="The revised salary is applied to the employee record on this date."
                />
              </Box>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Revised Salary
              </Typography>

              {!hasEmployee && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Select an employee to load their current salary.
                </Alert>
              )}

              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                {COMPONENTS.map(({ key, label }) => (
                  <Field.Text
                    key={key}
                    name={`revised${key}`}
                    label={label}
                    type="number"
                    disabled={!hasEmployee}
                    helperText={`Current: ${fCurrency(current[key]) ?? current[key]}`}
                  />
                ))}
              </Box>

              <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Current gross
                  </Typography>
                  <Typography variant="body2">{`${currency} ${currentGross.toFixed(2)}`}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Revised gross</Typography>
                  <Typography variant="subtitle2">{`${currency} ${revisedGross.toFixed(2)}`}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Increase
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    color={isDecrease ? 'error.main' : 'primary.main'}
                  >
                    {`${currency} ${delta.toFixed(2)} (${pct.toFixed(2)}%)`}
                  </Typography>
                </Stack>
              </Stack>

              {isDecrease && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  The revised salary is below the current salary. An increment records a raise.
                </Alert>
              )}
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Justification
              </Typography>
              <Stack spacing={3}>
                <Field.Text
                  name="reason"
                  label="Reason"
                  multiline
                  rows={3}
                  helperText="Why this increment is being granted. Kept on the record; not printed on the letter."
                />
                <Field.Text name="notes" label="Internal Notes" multiline rows={2} />
              </Stack>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {isEdit ? 'Update increment' : 'Submit for approval'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isEdit
                ? 'Changes are allowed until a decision is recorded. After approval or rejection the increment is locked.'
                : 'The increment goes to an approver. It stays editable until a decision is made; the letter is available once approved.'}
            </Typography>

            <Stack direction="row" spacing={1.5}>
              <LoadingButton
                fullWidth
                type="submit"
                variant="contained"
                loading={isSubmitting}
                disabled={!hasEmployee || isDecrease}
              >
                {isEdit ? 'Save Changes' : 'Submit for Approval'}
              </LoadingButton>
              <Button fullWidth variant="outlined" onClick={() => router.back()}>
                Cancel
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
