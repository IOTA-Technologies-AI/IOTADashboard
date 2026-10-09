'use client';

import { useParams } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import {
  getOnboardingToken,
  verifyOnboardingOtp,
  saveOnboardingDraft,
  requestOnboardingOtp,
  submitOnboardingForm,
} from 'src/actions/employee-onboarding';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  'Verify Identity',
  'Personal Details',
  'Contact & Emergency',
  'Identity Documents',
  'Family & Dependants',
  'Bank & GOSI',
  'Insurance',
  'Review & Submit',
];

const NATIONALITIES = [
  'Saudi Arabian',
  'Emirati',
  'Egyptian',
  'Indian',
  'Pakistani',
  'Filipino',
  'Lebanese',
  'Jordanian',
  'Syrian',
  'Yemeni',
  'Sudanese',
  'Bangladeshi',
  'Sri Lankan',
  'Nepalese',
  'British',
  'American',
  'Canadian',
  'Australian',
  'Other',
];

const COUNTRIES = [
  'Saudi Arabia (KSA)',
  'United Arab Emirates (UAE)',
  'Egypt',
  'India',
  'Pakistan',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Jordan',
  'Lebanon',
  'Other',
];

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const KSA_BANKS = [
  'Saudi National Bank (SNB)',
  'Al Rajhi Bank',
  'Riyad Bank',
  'Saudi Awwal Bank (SAB)',
  'Banque Saudi Fransi',
  'Alinma Bank',
  'Arab National Bank',
  'Bank AlJazira',
  'Bank Albilad',
  'Saudi Investment Bank',
  'Other',
];

/**
 * Mandatory fields per step. The backend checks the same list, so a form that
 * skips a step cannot be submitted incomplete.
 */
const REQUIRED_BY_STEP = {
  1: [
    ['firstName', 'First name'],
    ['lastName', 'Last name'],
    ['dateOfBirth', 'Date of birth'],
    ['gender', 'Gender'],
    ['maritalStatus', 'Marital status'],
    ['nationality', 'Nationality'],
  ],
  2: [
    ['phone', 'Mobile number'],
    ['personalEmail', 'Personal email'],
    ['currentAddress', 'Current address'],
    ['countryOfResidence', 'Country of residence'],
    ['emergencyContactName', 'Emergency contact name'],
    ['emergencyContactRelationship', 'Emergency contact relationship'],
    ['emergencyContactPhone', 'Emergency contact phone'],
  ],
  3: [
    ['passportNumber', 'Passport number'],
    ['passportExpiryDate', 'Passport expiry date'],
  ],
  4: [],
  5: [
    ['bankName', 'Bank name'],
    ['iban', 'IBAN'],
  ],
  6: [],
  7: [
    ['declarationAccepted', 'Declaration'],
    ['backgroundCheckConsent', 'Background check consent'],
  ],
};

/** Shown on the form from HR's side; never sent back as answers. */
const PREFILL_ONLY_KEYS = ['employeeCode', 'designation', 'department', 'joiningDate'];

/**
 * What actually goes to the API, for a draft or a submission. Blank answers are
 * LEFT OUT rather than sent as null or '': the API types every answer as text,
 * a number or a yes/no and rejects null outright ("expected a string").
 */
function cleanFormData(formData) {
  const isBlank = (v) => v === null || v === undefined || v === '';
  const data = {};
  Object.entries(formData).forEach(([key, value]) => {
    if (PREFILL_ONLY_KEYS.includes(key) || isBlank(value)) return;
    data[key] = value;
  });
  data.dependents = (Array.isArray(formData.dependents) ? formData.dependents : []).map((dep) => {
    const clean = {};
    Object.entries(dep || {}).forEach(([key, value]) => {
      if (!isBlank(value)) clean[key] = value;
    });
    return clean;
  });
  data.numberOfDependents = data.dependents.length;
  return data;
}

/**
 * What the browser says about itself, recorded with each step of the audit
 * trail HR sees (alongside the IP address and browser the server observes).
 */
function clientInfo() {
  try {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      language: navigator.language || undefined,
      screen: window.screen ? `${window.screen.width}x${window.screen.height}` : undefined,
      platform: navigator.platform || undefined,
    };
  } catch {
    return undefined;
  }
}

/** Drop blanks before merging server data into form state. */
const withoutBlanks = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );

const todayStr = () => new Date().toISOString().split('T')[0];
const maxDobStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d.toISOString().split('T')[0];
};

// ─── Small pieces ─────────────────────────────────────────────────────────────

function IOTALogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        component="img"
        src="https://iotalogostorage.blob.core.windows.net/assets/iotaicon.png"
        alt="IOTA"
        sx={{ height: 40, width: 'auto', borderRadius: 1 }}
      />
      <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.dark' }}>
        IOTA Technologies
      </Typography>
    </Box>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h5" fontWeight={700}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Stack>
  );
}

function CenteredCard({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f4f4f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}>{children}</Card>
    </Box>
  );
}

const useField =
  (data, onChange) =>
  (name, extra = {}) => ({
    value: data[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
    ...extra,
  });

// ─── Step 0: verify ───────────────────────────────────────────────────────────

function StepVerifyIdentity({ tokenRecord, token, onVerified }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (tokenRecord?.employeeEmail) setEmail(tokenRecord.employeeEmail);
  }, [tokenRecord]);

  useEffect(() => {
    let t;
    if (countdown > 0) t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleRequestOtp = async () => {
    setError('');
    setSuccessMsg('');
    setRequesting(true);
    try {
      const res = await requestOnboardingOtp(token, email, clientInfo());
      setOtpSent(true);
      setSuccessMsg(res.message || 'Verification code sent to your email.');
      setCountdown(60);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to send code.');
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setVerifying(true);
    try {
      const res = await verifyOnboardingOtp(token, email, otp, clientInfo());
      onVerified(res.sessionToken, email, res);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Stack spacing={3}>
      <StepHeader
        title={`Welcome, ${tokenRecord?.employeeName || 'colleague'}`}
        subtitle="Confirm the email address where you received this link and we will send you a one-time verification code."
      />
      {error && <Alert severity="error">{error}</Alert>}
      {successMsg && <Alert severity="success">{successMsg}</Alert>}
      <TextField
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={otpSent}
        fullWidth
        helperText="Must match the email where you received this link."
      />
      {!otpSent ? (
        <LoadingButton
          variant="contained"
          size="large"
          loading={requesting}
          onClick={handleRequestOtp}
          disabled={!email}
        >
          Send Verification Code
        </LoadingButton>
      ) : (
        <Stack spacing={2}>
          <TextField
            label="Verification Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{
              maxLength: 6,
              inputMode: 'numeric',
              style: { letterSpacing: '8px', fontSize: '24px', fontWeight: 700 },
            }}
            fullWidth
            helperText="Enter the 6-digit code from your email."
          />
          <LoadingButton
            variant="contained"
            size="large"
            loading={verifying}
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6}
          >
            Verify & Continue
          </LoadingButton>
          <Button
            variant="text"
            size="small"
            disabled={countdown > 0 || requesting}
            onClick={handleRequestOtp}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

// ─── Step 1: personal ─────────────────────────────────────────────────────────

function StepPersonal({ data, onChange }) {
  const field = useField(data, onChange);
  return (
    <Stack spacing={3}>
      <StepHeader
        title="Personal Details"
        subtitle="Details already on record are pre-filled — please check and correct them."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField label="First Name *" {...field('firstName')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField label="Middle Name" {...field('middleName')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField label="Last Name *" {...field('lastName')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Full Name in Arabic (as on Iqama / ID)" {...field('nameArabic')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Date of Birth *"
            type="date"
            {...field('dateOfBirth')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: maxDobStr() }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Gender *" select {...field('gender')}>
            {['Male', 'Female'].map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Marital Status *" select {...field('maritalStatus')}>
            {['Single', 'Married', 'Divorced', 'Widowed'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Nationality *" select {...field('nationality')}>
            {NATIONALITIES.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Religion" {...field('religion')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Blood Group" select {...field('bloodGroup')}>
            {BLOOD_GROUPS.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Highest Qualification" {...field('highestQualification')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Specialization" {...field('specialization')} />
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─── Step 2: contact & emergency ──────────────────────────────────────────────

function StepContact({ data, onChange }) {
  const field = useField(data, onChange);
  return (
    <Stack spacing={3}>
      <StepHeader
        title="Contact & Emergency"
        subtitle="Where we can reach you, and who to contact in an emergency."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Mobile Number *" {...field('phone')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Alternate Phone" {...field('alternatePhone')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Personal Email *" type="email" {...field('personalEmail')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Current Address *" multiline rows={2} {...field('currentAddress')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Permanent / Home Country Address"
            multiline
            rows={2}
            {...field('permanentAddress')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="City of Residence" {...field('cityOfResidence')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Country of Residence *" select {...field('countryOfResidence')}>
            {COUNTRIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Emergency Contact
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Full Name *" {...field('emergencyContactName')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Relationship *" select {...field('emergencyContactRelationship')}>
              {RELATIONSHIPS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Phone *" {...field('emergencyContactPhone')} />
          </Grid>
        </Grid>
      </Card>
    </Stack>
  );
}

// ─── Step 3: documents ────────────────────────────────────────────────────────

function StepDocuments({ data, onChange }) {
  const field = useField(data, onChange);
  const isSaudi = String(data.nationality || '')
    .toLowerCase()
    .includes('saudi');
  const inKsa = String(data.countryOfResidence || '').includes('Saudi');
  return (
    <Stack spacing={3}>
      <StepHeader
        title="Identity Documents"
        subtitle="Numbers exactly as printed on the document. Expiry dates drive renewal reminders."
      />
      <Grid container spacing={2}>
        {isSaudi && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="National ID" {...field('nationalId')} />
          </Grid>
        )}
        {!isSaudi && inKsa && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Iqama Number" {...field('iqamaNumber')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Iqama Issue Date"
                type="date"
                {...field('iqamaIssueDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Iqama Expiry Date"
                type="date"
                {...field('iqamaExpiryDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Passport Number *" {...field('passportNumber')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Passport Issue Date"
            type="date"
            {...field('passportIssueDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: todayStr() }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Passport Expiry Date *"
            type="date"
            {...field('passportExpiryDate')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: todayStr() }}
            helperText="Must be a future date"
          />
        </Grid>
        {!isSaudi && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Visa Type" select {...field('visaType')}>
                {[
                  'Work Visa',
                  'Transferable Iqama',
                  'Premium Resident',
                  'Family Residence',
                  'Not Applicable',
                ].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Visa Number" {...field('visaNumber')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Visa Expiry Date"
                type="date"
                {...field('visaExpiryDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        )}
      </Grid>
    </Stack>
  );
}

// ─── Step 4: family ───────────────────────────────────────────────────────────

function StepFamily({ data, onChange }) {
  const field = useField(data, onChange);
  const dependents = Array.isArray(data.dependents) ? data.dependents : [];
  const numDeps = dependents.length;
  const isMarried = data.maritalStatus === 'Married';

  const handleDepChange = (idx, key, value) => {
    const updated = [...dependents];
    updated[idx] = { ...(updated[idx] || {}), [key]: value };
    onChange('dependents', updated);
  };

  const handleNumDepsChange = (e) => {
    const n = Math.max(0, Math.min(20, parseInt(e.target.value || 0, 10) || 0));
    onChange('numberOfDependents', n);
    onChange(
      'dependents',
      Array.from({ length: n }, (_, i) => dependents[i] || { includeInInsurance: true })
    );
  };

  return (
    <Stack spacing={3}>
      <StepHeader
        title="Family & Dependants"
        subtitle="Used for medical insurance, family visas and travel allowances."
      />

      {isMarried && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Spouse Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Spouse Full Name *" {...field('spouseName')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Spouse Nationality" select {...field('spouseNationality')}>
                {NATIONALITIES.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Spouse National ID / Iqama" {...field('spouseNationalId')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Spouse Date of Birth"
                type="date"
                {...field('spouseDateOfBirth')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: todayStr() }}
              />
            </Grid>
          </Grid>
        </Card>
      )}

      <TextField
        label="Number of Dependants (excluding spouse)"
        type="number"
        value={numDeps}
        onChange={handleNumDepsChange}
        inputProps={{ min: 0, max: 20 }}
        fullWidth
        helperText="Children and other dependants living with you or covered by you."
      />

      {numDeps > 0 && (
        <Stack spacing={2}>
          {dependents.map((dep, idx) => (
            <Card key={idx} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>
                Dependant {idx + 1}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full Name *"
                    value={dep?.name || ''}
                    onChange={(e) => handleDepChange(idx, 'name', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Relationship *"
                    select
                    value={dep?.relationship || ''}
                    onChange={(e) => handleDepChange(idx, 'relationship', e.target.value)}
                    fullWidth
                  >
                    {RELATIONSHIPS.filter((r) => r !== 'Spouse').map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={dep?.dateOfBirth || ''}
                    onChange={(e) => handleDepChange(idx, 'dateOfBirth', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: todayStr() }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Nationality"
                    select
                    value={dep?.nationality || ''}
                    onChange={(e) => handleDepChange(idx, 'nationality', e.target.value)}
                    fullWidth
                  >
                    {NATIONALITIES.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Passport Number"
                    value={dep?.passportNumber || ''}
                    onChange={(e) => handleDepChange(idx, 'passportNumber', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="National ID / Iqama"
                    value={dep?.nationalIdOrIqama || ''}
                    onChange={(e) => handleDepChange(idx, 'nationalIdOrIqama', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={dep?.includeInInsurance !== false}
                        onChange={(e) =>
                          handleDepChange(idx, 'includeInInsurance', e.target.checked)
                        }
                      />
                    }
                    label="Include in medical insurance"
                  />
                </Grid>
              </Grid>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ─── Step 5: bank & GOSI ──────────────────────────────────────────────────────

function StepBank({ data, onChange }) {
  const field = useField(data, onChange);
  return (
    <Stack spacing={3}>
      <StepHeader
        title="Bank & GOSI"
        subtitle="Salary is paid by bank transfer under the Wage Protection System; the IBAN must be in your own name."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Bank Name *" select {...field('bankName')}>
            {KSA_BANKS.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Account Number" {...field('bankAccountNumber')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="IBAN *"
            {...field('iban')}
            onChange={(e) => onChange('iban', e.target.value.replace(/\s+/g, '').toUpperCase())}
            helperText="Saudi IBANs start with SA and are 24 characters long."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="GOSI Number (if already registered)" {...field('gosiNumber')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!data.previouslyRegisteredWithGosi}
                onChange={(e) => onChange('previouslyRegisteredWithGosi', e.target.checked)}
              />
            }
            label="I have previously been registered with GOSI"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─── Step 6: insurance ────────────────────────────────────────────────────────

function StepInsurance({ data, onChange }) {
  const field = useField(data, onChange);
  const deps = Array.isArray(data.dependents) ? data.dependents : [];
  const hasFamily = data.maritalStatus === 'Married' || deps.length > 0;
  return (
    <Stack spacing={3}>
      <StepHeader
        title="Insurance"
        subtitle="Medical insurance is arranged by IOTA. Tell us about any existing cover."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Preferred Insurance Class" select {...field('insuranceClass')}>
            {['Basic', 'Enhanced', 'VIP', 'Family'].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {hasFamily && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!data.includeDependentsInInsurance}
                  onChange={(e) => onChange('includeDependentsInInsurance', e.target.checked)}
                />
              }
              label="Cover my spouse / dependants"
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Current Insurance Provider" {...field('currentInsurer')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Current Policy Number" {...field('currentInsurancePolicyNumber')} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Insurance Notes / Special Requirements"
            multiline
            rows={3}
            {...field('insuranceNotes')}
            helperText="E.g. pre-existing conditions, special coverage needs for dependants."
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─── Step 7: review ───────────────────────────────────────────────────────────

function StepReview({ data, onChange, tokenRecord }) {
  const Section = ({ title, children }) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.dark' }}>
        <Typography variant="subtitle2" sx={{ color: 'white' }} fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Card>
  );
  const Row = ({ label, value }) =>
    value || value === 0 ? (
      <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
          {label}:
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {String(value)}
        </Typography>
      </Stack>
    ) : null;
  const deps = Array.isArray(data.dependents) ? data.dependents : [];

  return (
    <Stack spacing={2}>
      <StepHeader
        title="Review & Submit"
        subtitle="Please check everything carefully. Once submitted, this link is closed."
      />
      <Section title="Employee">
        <Row label="Name" value={tokenRecord?.employeeName} />
        <Row label="Employee code" value={data.employeeCode} />
        <Row label="Designation" value={data.designation} />
        <Row label="Department" value={data.department} />
      </Section>
      <Section title="Personal Details">
        <Row
          label="Full Name"
          value={[data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ')}
        />
        <Row label="Name (Arabic)" value={data.nameArabic} />
        <Row label="Date of Birth" value={data.dateOfBirth} />
        <Row label="Gender" value={data.gender} />
        <Row label="Marital Status" value={data.maritalStatus} />
        <Row label="Nationality" value={data.nationality} />
        <Row label="Blood Group" value={data.bloodGroup} />
        <Row label="Qualification" value={data.highestQualification} />
      </Section>
      <Section title="Contact & Emergency">
        <Row label="Mobile" value={data.phone} />
        <Row label="Personal Email" value={data.personalEmail} />
        <Row label="Current Address" value={data.currentAddress} />
        <Row label="Country" value={data.countryOfResidence} />
        <Row
          label="Emergency Contact"
          value={[
            data.emergencyContactName,
            data.emergencyContactRelationship,
            data.emergencyContactPhone,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </Section>
      <Section title="Identity Documents">
        <Row label="National ID" value={data.nationalId} />
        <Row label="Iqama" value={data.iqamaNumber} />
        <Row label="Iqama Expiry" value={data.iqamaExpiryDate} />
        <Row label="Passport" value={data.passportNumber} />
        <Row label="Passport Expiry" value={data.passportExpiryDate} />
        <Row label="Visa" value={[data.visaType, data.visaNumber].filter(Boolean).join(' · ')} />
      </Section>
      <Section title="Family & Dependants">
        <Row label="Spouse" value={data.spouseName} />
        <Row label="Dependants" value={deps.length} />
        {deps.map((d, i) => (
          <Box key={i} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Dependant {i + 1}
            </Typography>
            <Row label="Name" value={d.name} />
            <Row label="Relationship" value={d.relationship} />
            <Row label="DOB" value={d.dateOfBirth} />
            <Row
              label="Insurance"
              value={d.includeInInsurance === false ? 'Not covered' : 'Covered'}
            />
          </Box>
        ))}
      </Section>
      <Section title="Bank & GOSI">
        <Row label="Bank" value={data.bankName} />
        <Row label="IBAN" value={data.iban} />
        <Row label="GOSI Number" value={data.gosiNumber} />
      </Section>
      <Section title="Insurance">
        <Row label="Preferred Class" value={data.insuranceClass} />
        <Row label="Cover Dependants" value={data.includeDependentsInInsurance ? 'Yes' : 'No'} />
        <Row label="Current Insurer" value={data.currentInsurer} />
      </Section>

      <TextField
        label="Anything else HR should know?"
        multiline
        rows={2}
        fullWidth
        value={data.additionalRemarks || ''}
        onChange={(e) => onChange('additionalRemarks', e.target.value)}
      />

      <Card variant="outlined" sx={{ p: 2, bgcolor: 'warning.lighter' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!data.declarationAccepted}
              onChange={(e) => onChange('declarationAccepted', e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              I confirm that the information provided is true and complete, and I understand it will
              be used for my employment records, payroll, GOSI, medical insurance and government
              registrations. *
            </Typography>
          }
        />
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={!!data.backgroundCheckConsent}
              onChange={(e) => onChange('backgroundCheckConsent', e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              I authorise IOTA Technologies to verify my identity and carry out a background check —
              passport verification and sanctions, politically-exposed-person and adverse-media
              screening — through its verification provider, using the details I have given here. *
            </Typography>
          }
        />
      </Card>
    </Stack>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OnboardingPublicForm() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [tokenRecord, setTokenRecord] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [activeStep, setActiveStep] = useState(0);
  const [sessionToken, setSessionToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({ numberOfDependents: 0, dependents: [] });

  // Draft saving: progress is stored on the link, server-side, and handed back
  // only after the one-time code is verified again.
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  // True once the person has typed anything in this visit — a server draft must
  // not then overwrite what is on screen (e.g. after a session timeout).
  const dirtyRef = useRef(false);
  const resumeStepRef = useRef(1);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getOnboardingToken(token)
      .then((res) => {
        setTokenRecord(res.token);
        if (res.alreadySubmitted) setAlreadySubmitted(true);
        if (res.prefill) setFormData((prev) => ({ ...prev, ...withoutBlanks(res.prefill) }));
      })
      .catch((e) => {
        setTokenError(
          e?.response?.data?.message || e?.message || 'This link is invalid or has expired.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleFieldChange = useCallback((name, value) => {
    dirtyRef.current = true;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleVerified = useCallback((sToken, email, res) => {
    setSessionToken(sToken);
    setVerifiedEmail(email);
    setStepError('');
    if (dirtyRef.current) {
      // Re-verified mid-form (session timed out): keep what is on screen.
      setActiveStep(resumeStepRef.current || 1);
      return;
    }
    const draft = res?.draft && typeof res.draft === 'object' ? withoutBlanks(res.draft) : null;
    if (draft && Object.keys(draft).length) {
      setFormData((prev) => ({
        ...prev,
        ...draft,
        dependents: Array.isArray(draft.dependents) ? draft.dependents : prev.dependents,
      }));
      setDraftSavedAt(res.draftSavedAt || null);
      setDraftNotice('Your saved draft has been restored. Carry on from where you stopped.');
      const step = Number(res.draftStep);
      setActiveStep(step >= 1 && step <= STEPS.length - 1 ? step : 1);
      return;
    }
    setActiveStep(1);
  }, []);

  /**
   * Save progress. `silent` is the automatic save on Next/Back: it never
   * blocks navigation and only speaks up when the session has run out.
   */
  const saveDraft = async (step, { silent = false } = {}) => {
    if (!sessionToken) return false;
    if (!silent) setSavingDraft(true);
    try {
      const res = await saveOnboardingDraft(token, sessionToken, cleanFormData(formData), step, {
        auto: silent,
        client: clientInfo(),
      });
      setDraftSavedAt(res.savedAt || new Date().toISOString());
      if (!silent)
        setDraftNotice('Draft saved. You can close this page and return with the same link.');
      return true;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        // Keep everything on screen; just ask for a fresh code.
        resumeStepRef.current = step;
        setSessionToken('');
        setActiveStep(0);
        setDraftNotice('');
        setStepError(
          'Your session timed out. Verify with a new code to continue — what you have entered is still here.'
        );
      } else if (!silent) {
        setStepError(e?.response?.data?.message || e?.message || 'Could not save the draft.');
      }
      return false;
    } finally {
      if (!silent) setSavingDraft(false);
    }
  };

  const missingForStep = (step) => {
    const missing = (REQUIRED_BY_STEP[step] || [])
      .filter(([key]) => {
        const v = formData[key];
        return key === 'declarationAccepted' || key === 'backgroundCheckConsent'
          ? v !== true
          : v === undefined || v === null || String(v).trim() === '';
      })
      .map(([, label]) => label);
    if (step === 4) {
      if (formData.maritalStatus === 'Married' && !String(formData.spouseName || '').trim()) {
        missing.push('Spouse full name');
      }
      (formData.dependents || []).forEach((d, i) => {
        if (!String(d?.name || '').trim()) missing.push(`Dependant ${i + 1} name`);
        if (!String(d?.relationship || '').trim()) missing.push(`Dependant ${i + 1} relationship`);
      });
    }
    if (step === 5 && formData.iban && String(formData.iban).length < 15) {
      missing.push('A valid IBAN');
    }
    return missing;
  };

  const handleNext = () => {
    const missing = missingForStep(activeStep);
    if (missing.length) {
      setStepError(`Please complete: ${missing.join(', ')}.`);
      return;
    }
    setStepError('');
    setDraftNotice('');
    const next = activeStep + 1;
    setActiveStep(next);
    saveDraft(next, { silent: true });
  };
  const handleBack = () => {
    setStepError('');
    setDraftNotice('');
    const prev = activeStep - 1;
    setActiveStep(prev);
    // Step 0 is the verification screen; going back to it is not progress to save.
    if (prev >= 1) saveDraft(prev, { silent: true });
  };

  const handleSubmit = async () => {
    const missing = missingForStep(7);
    if (missing.length) {
      setStepError(`Please complete: ${missing.join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitOnboardingForm(token, sessionToken, cleanFormData(formData), clientInfo());
      setSubmitted(true);
    } catch (e) {
      if (e?.response?.status === 401) {
        resumeStepRef.current = STEPS.length - 1;
        setSessionToken('');
        setActiveStep(0);
        setStepError(
          'Your session timed out. Verify with a new code to submit — what you have entered is still here.'
        );
      } else {
        setSubmitError(
          e?.response?.data?.message || e?.message || 'Submission failed. Please try again.'
        );
        // Whatever went wrong, do not make them type it all again.
        saveDraft(activeStep, { silent: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (tokenError) {
    return (
      <CenteredCard>
        <IOTALogo />
        <Typography variant="h5" fontWeight={700} mt={3} mb={1} color="error">
          Link Unavailable
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          {tokenError}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please contact{' '}
          <a href="mailto:hr@iotatechnologies.io" style={{ color: '#1a237e' }}>
            hr@iotatechnologies.io
          </a>{' '}
          if you believe this is an error.
        </Typography>
      </CenteredCard>
    );
  }

  if (alreadySubmitted) {
    return (
      <CenteredCard>
        <IOTALogo />
        <Typography variant="h5" fontWeight={700} mt={3} mb={1}>
          Already Submitted
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your onboarding form has already been submitted using this link. Please contact{' '}
          <a href="mailto:hr@iotatechnologies.io" style={{ color: '#1a237e' }}>
            hr@iotatechnologies.io
          </a>{' '}
          if you need to change anything.
        </Typography>
      </CenteredCard>
    );
  }

  if (submitted) {
    return (
      <CenteredCard>
        <IOTALogo />
        <Box sx={{ mt: 3, mb: 2, fontSize: 64 }}>✅</Box>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Welcome to IOTA!
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={2}>
          Thank you, <strong>{tokenRecord?.employeeName}</strong>. Your onboarding details have been
          securely received by the HR team.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          A confirmation has been sent to <strong>{verifiedEmail}</strong>.
        </Typography>
      </CenteredCard>
    );
  }

  const stepContent = [
    <StepVerifyIdentity
      key={0}
      tokenRecord={tokenRecord}
      token={token}
      onVerified={handleVerified}
    />,
    <StepPersonal key={1} data={formData} onChange={handleFieldChange} />,
    <StepContact key={2} data={formData} onChange={handleFieldChange} />,
    <StepDocuments key={3} data={formData} onChange={handleFieldChange} />,
    <StepFamily key={4} data={formData} onChange={handleFieldChange} />,
    <StepBank key={5} data={formData} onChange={handleFieldChange} />,
    <StepInsurance key={6} data={formData} onChange={handleFieldChange} />,
    <StepReview key={7} data={formData} onChange={handleFieldChange} tokenRecord={tokenRecord} />,
  ];
  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f4f5', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="md">
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <IOTALogo />
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Employee Onboarding
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formData.designation || tokenRecord?.employeeName}
            </Typography>
          </Box>
        </Box>

        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto' }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '10px', sm: '12px' } } }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Card>

        <Card sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
          {stepContent[activeStep]}
          {stepError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {stepError}
            </Alert>
          )}
          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
        </Card>

        {activeStep > 0 && draftNotice && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDraftNotice('')}>
            {draftNotice}
          </Alert>
        )}

        {activeStep > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={submitting}
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>
            <Stack alignItems="center" sx={{ flex: 1 }}>
              <LoadingButton
                variant="text"
                loading={savingDraft}
                disabled={submitting}
                onClick={() => saveDraft(activeStep)}
              >
                Save draft
              </LoadingButton>
              <Typography variant="caption" color="text.secondary">
                {draftSavedAt
                  ? `Draft saved ${new Date(draftSavedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} · also saved each time you move between steps`
                  : 'Saved automatically each time you move between steps'}
              </Typography>
            </Stack>
            {isLastStep ? (
              <LoadingButton
                variant="contained"
                color="success"
                size="large"
                loading={submitting}
                onClick={handleSubmit}
                sx={{ minWidth: 180 }}
              >
                Submit Onboarding Form
              </LoadingButton>
            ) : (
              <Button variant="contained" onClick={handleNext} sx={{ minWidth: 120 }}>
                Next
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled">
            © {new Date().getFullYear()} IOTA Technologies · This is a secure, personalised link.
            Do not share this URL.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
