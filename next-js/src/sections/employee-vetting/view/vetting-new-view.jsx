'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { createVetting, getVettingCatalogue } from 'src/actions/employee-vetting';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * The offices IOTA vets for, with the country its employees are normally
 * verified against. IDfy's source-verified checks reach India, the Philippines,
 * Indonesia, Singapore and Malaysia only — so for KSA, UAE and UK the country
 * is still recorded, but only the country-agnostic checks can return a result.
 * The form says which, rather than offering a check that can never come back.
 */
const IOTA_OFFICES = [
  { value: 'KSA', label: 'IOTA Saudi Arabia', country: 'SA' },
  { value: 'UAE', label: 'IOTA United Arab Emirates', country: 'AE' },
  { value: 'UK', label: 'IOTA United Kingdom', country: 'GB' },
  { value: 'India', label: 'IOTA India', country: 'IN' },
];

const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'PH', label: 'Philippines' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'MY', label: 'Malaysia' },
];

const CATEGORY_LABELS = {
  identity: 'Identity',
  criminal: 'Criminal & Legal History',
  employment: 'Employment History',
  sanctions: 'Sanctions & PEP',
  contact: 'Contact',
};

const CATEGORY_ORDER = ['identity', 'criminal', 'sanctions', 'employment', 'contact'];

// ----------------------------------------------------------------------

export function VettingNewView() {
  const router = useRouter();
  const { data: catalogue, error: catalogueError, isLoading } = useSWR(
    'vetting/catalogue',
    getVettingCatalogue
  );

  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [iotaOffice, setIotaOffice] = useState('KSA');
  const [nationality, setNationality] = useState('');
  const [countryCode, setCountryCode] = useState('SA');
  const [notes, setNotes] = useState('');
  // IDfy's Background Verification product identifies the candidate on the
  // profile itself rather than per check, so these are collected once here.
  const [employeePhone, setEmployeePhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fathersName, setFathersName] = useState('');

  // taskType -> { selected, values: { fieldName: value } }
  const [selection, setSelection] = useState({});
  const [saving, setSaving] = useState(false);
  // Set once submit has been attempted, so required-field errors appear on the
  // offending inputs instead of only in a sentence at the top of the page.
  const [attempted, setAttempted] = useState(false);
  // `<input type="date">` reports an empty value until the date is COMPLETE, so
  // a half-entered date looks filled but submits as blank. The browser tells us
  // via validity.badInput; without surfacing it the form just says the field is
  // required while the user is looking straight at their date.
  const [badDates, setBadDates] = useState({});
  const [error, setError] = useState('');

  const checks = useMemo(() => catalogue || [], [catalogue]);

  /** A check runs against this country if it is global or names it. */
  const isAvailable = (check) =>
    check.countries.includes('*') || check.countries.includes(countryCode);

  const available = checks.filter(isAvailable);
  const unavailable = checks.filter((c) => !isAvailable(c));

  const grouped = useMemo(() => {
    const byCategory = {};
    available.forEach((c) => {
      (byCategory[c.category] = byCategory[c.category] || []).push(c);
    });
    return CATEGORY_ORDER.filter((c) => byCategory[c]).map((c) => [c, byCategory[c]]);
  }, [available]);

  const selectedChecks = checks.filter((c) => selection[c.taskType]?.selected && isAvailable(c));
  const needsProfileDetails = selectedChecks.some((c) => c.provider === 'bgv');

  const toggleCheck = (taskType) =>
    setSelection((prev) => ({
      ...prev,
      [taskType]: { ...(prev[taskType] || { values: {} }), selected: !prev[taskType]?.selected },
    }));

  const setField = (taskType, field, value) =>
    setSelection((prev) => ({
      ...prev,
      [taskType]: {
        ...(prev[taskType] || { selected: true }),
        values: { ...(prev[taskType]?.values || {}), [field]: value },
      },
    }));

  /**
   * Prefill a check's name/date fields from the candidate details already
   * entered, so the same name is not typed five times — and so the value sent
   * to IDfy matches across checks, which is what makes their results comparable.
   */
  const applyPrefill = () => {
    setSelection((prev) => {
      const next = { ...prev };
      selectedChecks.forEach((check) => {
        const values = { ...(next[check.taskType]?.values || {}) };
        check.fields.forEach((f) => {
          if (values[f.name]) return;
          if (['name', 'full_name', 'search_term', 'name_on_card'].includes(f.name)) {
            values[f.name] = employeeName;
          }
          if (f.name === 'email_id') values[f.name] = employeeEmail;
          if (f.name === 'nationality' && nationality) values[f.name] = nationality;
        });
        next[check.taskType] = { ...next[check.taskType], values };
      });
      return next;
    });
  };

  const isBlank = (check, field) =>
    !String(selection[check.taskType]?.values?.[field.name] || '').trim();

  const missingRequired = selectedChecks.flatMap((check) =>
    check.fields
      .filter((f) => f.required && isBlank(check, f))
      .map((f) => `${check.label}: ${f.label}`)
  );

  const handleSubmit = async () => {
    setError('');
    setAttempted(true);
    if (!employeeName.trim()) {
      setError('Employee name is required.');
      return;
    }
    if (!selectedChecks.length) {
      setError('Select at least one check to run.');
      return;
    }
    if (missingRequired.length) {
      const incomplete = Object.values(badDates).some(Boolean);
      setError(
        `Complete the ${missingRequired.length} highlighted field${
          missingRequired.length === 1 ? '' : 's'
        }: ${missingRequired.join(', ')}.${
          incomplete
            ? ' One or more dates are only partly entered — a date counts as empty until day, month and year are all set.'
            : ''
        }`
      );
      return;
    }
    // BGV reaches out to the employer, so it needs a contactable candidate on
    // the profile. Caught here rather than as an opaque rejection from IDfy.
    if (needsProfileDetails && (!employeeEmail.trim() || !employeePhone.trim())) {
      setError('Employment Verification needs the candidate\'s email and phone.');
      return;
    }

    setSaving(true);
    try {
      const created = await createVetting({
        employeeName: employeeName.trim(),
        employeeEmail: employeeEmail.trim(),
        iotaOffice,
        nationality: nationality.trim(),
        countryCode,
        notes: notes.trim(),
        employeePhone: employeePhone.trim(),
        dateOfBirth: dateOfBirth.trim(),
        fathersName: fathersName.trim(),
        selectedChecks: selectedChecks.map((c) => ({
          taskType: c.taskType,
          input: selection[c.taskType]?.values || {},
        })),
      });
      if (created?.id) {
        router.push(paths.dashboard.hr.employeeVetting.details(created.id));
      } else {
        router.push(paths.dashboard.hr.employeeVetting.root);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not submit the vetting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <IconButton onClick={() => router.push(paths.dashboard.hr.employeeVetting.root)}>
          <Iconify icon="eva:arrow-back-fill" />
        </IconButton>
        <Box>
          <Typography variant="h4">New Employee Vetting</Typography>
          <Typography variant="body2" color="text.secondary">
            Select the checks required and provide the details each one needs.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {catalogueError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load the check catalogue —{' '}
          {catalogueError?.response?.data?.message || catalogueError.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Candidate ─────────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Candidate
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                label="Full Name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>IOTA Office</InputLabel>
                <Select
                  value={iotaOffice}
                  label="IOTA Office"
                  onChange={(e) => {
                    const next = e.target.value;
                    setIotaOffice(next);
                    const office = IOTA_OFFICES.find((o) => o.value === next);
                    if (office) setCountryCode(office.country);
                  }}
                >
                  {IOTA_OFFICES.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                helperText="Free text, e.g. Indian. Used to prefill the passport check."
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Verify Against</InputLabel>
                <Select
                  value={countryCode}
                  label="Verify Against"
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Only asked for when a check actually needs them: IDfy's BGV
                  product carries the candidate on the profile, while the EVE
                  checks take their details per check. */}
              {needsProfileDetails && (
                <>
                  <Divider textAlign="left">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      REQUIRED FOR EMPLOYMENT VERIFICATION
                    </Typography>
                  </Divider>
                  <TextField
                    label="Phone"
                    value={employeePhone}
                    onChange={(e) => setEmployeePhone(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Father's Name"
                    value={fathersName}
                    onChange={(e) => setFathersName(e.target.value)}
                    fullWidth
                  />
                </>
              )}

              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />

              <Divider />
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {selectedChecks.length} check{selectedChecks.length === 1 ? '' : 's'} selected
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!selectedChecks.length || !employeeName.trim()}
                  onClick={applyPrefill}
                  startIcon={<Iconify icon="solar:magic-stick-3-bold" width={16} />}
                >
                  Prefill from candidate
                </Button>
                <Button
                  variant="contained"
                  disabled={saving || !selectedChecks.length}
                  onClick={handleSubmit}
                  startIcon={
                    saving ? <CircularProgress size={16} /> : <Iconify icon="solar:shield-check-bold" />
                  }
                >
                  Submit to IDfy
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* ── Checks ────────────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          {isLoading ? (
            <Card sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Card>
          ) : (
            <Stack spacing={3}>
              {grouped.map(([category, items]) => (
                <Card key={category} sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                    {CATEGORY_LABELS[category] || category}
                  </Typography>
                  <Stack spacing={2}>
                    {items.map((check) => {
                      const picked = Boolean(selection[check.taskType]?.selected);
                      return (
                        <Box
                          key={check.taskType}
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: picked ? 'primary.main' : 'divider',
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={picked}
                                onChange={() => toggleCheck(check.taskType)}
                              />
                            }
                            label={
                              <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" fontWeight={600}>
                                    {check.label}
                                  </Typography>
                                  {check.countries.includes('*') && (
                                    <Chip label="All countries" size="small" sx={{ height: 18, fontSize: 10 }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {check.description}
                                </Typography>
                              </Box>
                            }
                          />

                          {picked && (
                            <Grid container spacing={2} sx={{ mt: 0.5, pl: 4 }}>
                              {check.fields.map((field) => (
                                <Grid item xs={12} sm={6} key={field.name}>
                                  {field.type === 'select' ? (
                                    <FormControl fullWidth size="small">
                                      <InputLabel>{field.label}</InputLabel>
                                      <Select
                                        label={field.label}
                                        value={selection[check.taskType]?.values?.[field.name] || ''}
                                        onChange={(e) =>
                                          setField(check.taskType, field.name, e.target.value)
                                        }
                                      >
                                        {(field.options || []).map((o) => (
                                          <MenuItem key={o} value={o}>
                                            {o}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  ) : (
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label={field.label}
                                      required={field.required}
                                      error={
                                        (attempted && field.required && isBlank(check, field)) ||
                                        Boolean(badDates[`${check.taskType}.${field.name}`])
                                      }
                                      helperText={
                                        badDates[`${check.taskType}.${field.name}`]
                                          ? 'Incomplete date — set day, month and year'
                                          : attempted && field.required && isBlank(check, field)
                                            ? 'Required'
                                            : field.hint
                                      }
                                      type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                                      InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                                      value={selection[check.taskType]?.values?.[field.name] || ''}
                                      onChange={(e) => {
                                        setField(check.taskType, field.name, e.target.value);
                                        // A date input yields '' until it is complete; badInput
                                        // tells us the difference between "not filled in" and
                                        // "filled in but not yet a whole date".
                                        if (field.type === 'date') {
                                          const bad = Boolean(e.target.validity?.badInput);
                                          setBadDates((prev) => ({
                                            ...prev,
                                            [`${check.taskType}.${field.name}`]: bad,
                                          }));
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Re-read on blur as well. Browser autofill and some
                                        // date pickers set the value without firing the change
                                        // React listens for, which would otherwise leave the
                                        // field looking filled while the form sees nothing.
                                        const domValue = e.target.value;
                                        if (
                                          domValue &&
                                          domValue !==
                                            (selection[check.taskType]?.values?.[field.name] || '')
                                        ) {
                                          setField(check.taskType, field.name, domValue);
                                        }
                                        if (field.type === 'date') {
                                          setBadDates((prev) => ({
                                            ...prev,
                                            [`${check.taskType}.${field.name}`]: Boolean(
                                              e.target.validity?.badInput
                                            ),
                                          }));
                                        }
                                      }}
                                    />
                                  )}
                                </Grid>
                              ))}
                            </Grid>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Card>
              ))}

              {/* Checks IDfy cannot run for this country. Shown rather than
                  hidden: an operator needs to know a criminal check is not
                  merely unselected but unavailable, so they can arrange it by
                  another route instead of assuming it was covered. */}
              {unavailable.length > 0 && (
                <Alert severity="info">
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Not available for {COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.label || countryCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    IDfy verifies against government sources in India, the Philippines, Indonesia,
                    Singapore and Malaysia only. These checks cannot run here and must be arranged
                    another way: {unavailable.map((c) => c.label).join(', ')}.
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
