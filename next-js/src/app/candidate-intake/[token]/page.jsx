'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import {
  getCandidateIntakeToken,
  verifyCandidateIntakeOtp,
  requestCandidateIntakeOtp,
  submitCandidateIntakeForm,
} from 'src/utils/apiHelper';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  'Verify Identity',
  'Personal Details',
  'Residency & Documents',
  'Family & Dependents',
  'Insurance',
  'Salary & Expectations',
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
  'Syria',
  'Other',
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function IOTALogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        component="img"
        src="https://iotalogostorage.blob.core.windows.net/assets/iotaicon.png"
        alt="IOTA"
        sx={{ height: 40, width: 'auto', borderRadius: 1 }}
      />
      <Typography variant="h6" fontWeight={700} color="primary.dark">
        IOTA Technologies
      </Typography>
    </Box>
  );
}

// ─── Step screens ─────────────────────────────────────────────────────────────

function StepVerifyIdentity({ tokenRecord, onVerified }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Auto-fill email from token
  useEffect(() => {
    if (tokenRecord?.candidateEmail) setEmail(tokenRecord.candidateEmail);
  }, [tokenRecord]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleRequestOtp = async () => {
    setError('');
    setSuccessMsg('');
    setRequesting(true);
    try {
      const res = await requestCandidateIntakeOtp(tokenRecord.token, email);
      setOtpSent(true);
      setSuccessMsg(res.message || 'Verification code sent to your email.');
      setCountdown(60);
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || 'Failed to send code. Please try again.'
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setVerifying(true);
    try {
      const res = await verifyCandidateIntakeOtp(tokenRecord.token, email, otp);
      onVerified(res.sessionToken, email);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Verify Your Identity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your email address and we will send you a one-time verification code.
        </Typography>
      </Stack>

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

function StepPersonalDetails({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
  });

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Personal Details
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please fill in your personal information accurately.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField label="First Name *" {...field('firstName')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Middle Name" {...field('middleName')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Last Name *" {...field('lastName')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Full Name in Arabic" {...field('nameArabic')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Date of Birth"
            type="date"
            {...field('dateOfBirth')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Gender" select {...field('gender')}>
            {['Male', 'Female', 'Other'].map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Marital Status" select {...field('maritalStatus')}>
            {['Single', 'Married', 'Divorced', 'Widowed'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Nationality" select {...field('nationality')}>
            {NATIONALITIES.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Phone Number" {...field('phone')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Alternate Phone" {...field('alternatePhone')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Personal Email" type="email" {...field('personalEmail')} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function StepResidencyDocuments({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
  });

  const isKsa = (data.countryOfResidence || '').includes('Saudi');

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Residency & Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please provide your current residency and document details.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Country of Residence *" select {...field('countryOfResidence')}>
            {COUNTRIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="City of Residence" {...field('cityOfResidence')} />
        </Grid>

        {/* KSA-specific fields */}
        {isKsa && (
          <>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 0 }}>
                You selected Saudi Arabia — please fill in your Iqama / National ID details.
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="National ID / Iqama Number" {...field('iqamaNumber')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Iqama Expiry Date"
                type="date"
                {...field('iqamaExpiryDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Saudi National ID (if citizen)" {...field('nationalId')} />
            </Grid>
          </>
        )}

        <Grid item xs={12} sm={6}>
          <TextField label="Passport Number" {...field('passportNumber')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Passport Expiry Date"
            type="date"
            {...field('passportExpiryDate')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Visa Type"
            {...field('visaType')}
            helperText='e.g. "Work Visa", "Family Residence", "Visit Visa"'
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Visa Expiry Date"
            type="date"
            {...field('visaExpiryDate')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Current Employer (if any)" {...field('currentEmployer')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Notice Period"
            {...field('noticePeriod')}
            helperText='e.g. "1 month", "2 weeks", "Immediate"'
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

function StepFamilyDependents({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
  });

  const numDeps = parseInt(data.numberOfDependents || 0, 10);
  const dependents = Array.isArray(data.dependents) ? data.dependents : [];

  const handleDepChange = (idx, key, value) => {
    const updated = [...dependents];
    if (!updated[idx]) updated[idx] = {};
    updated[idx] = { ...updated[idx], [key]: value };
    onChange('dependents', updated);
  };

  const handleNumDepsChange = (e) => {
    const n = parseInt(e.target.value || 0, 10);
    onChange('numberOfDependents', n);
    const updated = Array.from({ length: n }, (_, i) => dependents[i] || {});
    onChange('dependents', updated);
  };

  const isMarried = data.maritalStatus === 'Married';

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Family & Dependents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please provide details about your family members and dependents.
        </Typography>
      </Stack>

      {isMarried && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Spouse Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField label="Spouse Full Name" {...field('spouseName')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Spouse Nationality" select {...field('spouseNationality')}>
                {NATIONALITIES.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Spouse National ID / Iqama" {...field('spouseNationalId')} />
            </Grid>
          </Grid>
        </Card>
      )}

      <TextField
        label="Number of Dependents"
        type="number"
        value={data.numberOfDependents || 0}
        onChange={handleNumDepsChange}
        inputProps={{ min: 0, max: 20 }}
        fullWidth
        helperText="Include children and other dependents (excluding spouse)."
      />

      {numDeps > 0 && (
        <Stack spacing={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Dependent Details
          </Typography>
          {Array.from({ length: numDeps }).map((_, idx) => (
            <Card key={idx} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={1.5}>
                Dependent {idx + 1}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Full Name"
                    value={dependents[idx]?.name || ''}
                    onChange={(e) => handleDepChange(idx, 'name', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Relationship"
                    select
                    value={dependents[idx]?.relationship || ''}
                    onChange={(e) => handleDepChange(idx, 'relationship', e.target.value)}
                    fullWidth
                  >
                    {['Spouse', 'Child', 'Parent', 'Sibling', 'Other'].map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={dependents[idx]?.dateOfBirth || ''}
                    onChange={(e) => handleDepChange(idx, 'dateOfBirth', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Nationality"
                    select
                    value={dependents[idx]?.nationality || ''}
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
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Passport Number"
                    value={dependents[idx]?.passportNumber || ''}
                    onChange={(e) => handleDepChange(idx, 'passportNumber', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="National ID / Iqama"
                    value={dependents[idx]?.nationalIdOrIqama || ''}
                    onChange={(e) => handleDepChange(idx, 'nationalIdOrIqama', e.target.value)}
                    fullWidth
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

function StepInsurance({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
  });

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Insurance Information
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please share your insurance preferences and current coverage details.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Preferred Insurance Class" select {...field('insuranceClass')}>
            {['Basic', 'Enhanced', 'VIP', 'Family'].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Current Insurance Provider" {...field('currentInsurer')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Current Policy Number" {...field('currentInsurancePolicyNumber')} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Insurance Notes / Special Requirements"
            multiline
            rows={3}
            {...field('insuranceNotes')}
            helperText="E.g. pre-existing conditions, special coverage needs for dependents, etc."
          />
        </Grid>
      </Grid>

      <Alert severity="info">
        Insurance cards and policy documents can be submitted after joining. Our HR team will
        contact you with the details of the IOTA medical coverage plan.
      </Alert>
    </Stack>
  );
}

function StepSalaryExpectations({ data, onChange }) {
  const field = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, e.target.value),
    fullWidth: true,
  });

  const numField = (name) => ({
    value: data[name] || '',
    onChange: (e) => onChange(name, parseFloat(e.target.value) || ''),
    fullWidth: true,
    type: 'number',
    inputProps: { min: 0 },
  });

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Salary Expectations & Work Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please share your total expected monthly salary.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Currency"
            select
            value={data.currencyCode || 'SAR'}
            onChange={(e) => onChange('currencyCode', e.target.value)}
            fullWidth
          >
            {['SAR', 'AED', 'USD', 'GBP', 'EUR', 'PKR', 'INR'].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Expected Total Salary (monthly)"
            {...numField('expectedTotalPackage')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">{data.currencyCode || 'SAR'}</InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Desired Start Date"
            type="date"
            value={data.desiredStartDate || ''}
            onChange={(e) => onChange('desiredStartDate', e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Work Arrangement" select {...field('workArrangement')}>
            {['On-site', 'Hybrid', 'Remote'].map((w) => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Additional Remarks"
            multiline
            rows={3}
            {...field('additionalRemarks')}
            helperText="Any other information you would like HR to know."
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

function StepReview({ formData, tokenRecord }) {
  const Section = ({ title, children }) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.dark' }}>
        <Typography variant="subtitle2" color="white" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Card>
  );

  const Row = ({ label, value }) =>
    value ? (
      <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
          {label}:
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {String(value)}
        </Typography>
      </Stack>
    ) : null;

  const numDeps = parseInt(formData.numberOfDependents || 0, 10);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Review Your Information
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please review all details carefully before submitting. Once submitted, the link will be
          deactivated.
        </Typography>
      </Stack>

      <Alert severity="warning">
        <strong>This form can only be submitted once.</strong> After submission, this link will be
        permanently deactivated.
      </Alert>

      <Section title="Position">
        <Row label="Position" value={tokenRecord?.positionTitle} />
        <Row
          label="Type"
          value={tokenRecord?.jobType === 'new_joiner' ? 'New Joiner' : 'Interview Candidate'}
        />
      </Section>

      <Section title="Personal Details">
        <Row
          label="Full Name"
          value={[formData.firstName, formData.middleName, formData.lastName]
            .filter(Boolean)
            .join(' ')}
        />
        <Row label="Name (Arabic)" value={formData.nameArabic} />
        <Row label="Date of Birth" value={formData.dateOfBirth} />
        <Row label="Gender" value={formData.gender} />
        <Row label="Nationality" value={formData.nationality} />
        <Row label="Marital Status" value={formData.maritalStatus} />
        <Row label="Phone" value={formData.phone} />
        <Row label="Personal Email" value={formData.personalEmail} />
      </Section>

      <Section title="Residency & Documents">
        <Row label="Country of Residence" value={formData.countryOfResidence} />
        <Row label="City" value={formData.cityOfResidence} />
        <Row label="National ID" value={formData.nationalId} />
        <Row label="Iqama Number" value={formData.iqamaNumber} />
        <Row label="Iqama Expiry" value={formData.iqamaExpiryDate} />
        <Row label="Passport Number" value={formData.passportNumber} />
        <Row label="Passport Expiry" value={formData.passportExpiryDate} />
        <Row label="Visa Type" value={formData.visaType} />
        <Row label="Current Employer" value={formData.currentEmployer} />
        <Row label="Notice Period" value={formData.noticePeriod} />
      </Section>

      <Section title="Family & Dependents">
        <Row label="Spouse Name" value={formData.spouseName} />
        <Row label="Spouse Nationality" value={formData.spouseNationality} />
        <Row label="Number of Dependents" value={numDeps} />
        {(formData.dependents || []).map((d, i) => (
          <Box key={i} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Dependent {i + 1}
            </Typography>
            <Row label="Name" value={d.name} />
            <Row label="Relationship" value={d.relationship} />
            <Row label="DOB" value={d.dateOfBirth} />
            <Row label="Nationality" value={d.nationality} />
          </Box>
        ))}
      </Section>

      <Section title="Insurance">
        <Row label="Preferred Class" value={formData.insuranceClass} />
        <Row label="Current Insurer" value={formData.currentInsurer} />
        <Row label="Policy Number" value={formData.currentInsurancePolicyNumber} />
        <Row label="Notes" value={formData.insuranceNotes} />
      </Section>

      <Section title="Salary Expectations">
        <Row label="Currency" value={formData.currencyCode} />
        <Row label="Expected Total Salary" value={formData.expectedTotalPackage} />
        <Row label="Desired Start Date" value={formData.desiredStartDate} />
        <Row label="Work Arrangement" value={formData.workArrangement} />
        <Row label="Additional Remarks" value={formData.additionalRemarks} />
      </Section>
    </Stack>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateIntakePage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [tokenRecord, setTokenRecord] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [activeStep, setActiveStep] = useState(0);
  const [sessionToken, setSessionToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    currencyCode: 'SAR',
    numberOfDependents: 0,
    dependents: [],
  });

  // Load token on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getCandidateIntakeToken(token)
      .then((res) => {
        setTokenRecord(res.token);
        if (res.alreadySubmitted) setAlreadySubmitted(true);
      })
      .catch((e) => {
        setTokenError(
          e?.response?.data?.message || e?.message || 'This link is invalid or has expired.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleFieldChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleVerified = useCallback((sToken, email) => {
    setSessionToken(sToken);
    setVerifiedEmail(email);
    setActiveStep(1);
  }, []);

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => setActiveStep((s) => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = { ...formData };
      // Convert all numeric fields: empty string → undefined, string number → number
      // Also strip legacy salary breakup fields (no longer collected)
      const numericFields = [
        'numberOfDependents',
        'expectedTotalPackage',
        'expectedBasicSalary',
        'expectedHousingAllowance',
        'expectedTransportAllowance',
        'expectedOtherAllowances',
      ];
      numericFields.forEach((key) => {
        if (data[key] === '' || data[key] === null || data[key] === undefined) {
          delete data[key];
        } else {
          const parsed = parseFloat(data[key]);
          data[key] = isNaN(parsed) ? undefined : parsed;
          if (data[key] === undefined) delete data[key];
        }
      });

      await submitCandidateIntakeForm(token, sessionToken, data);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(
        e?.response?.data?.message || e?.message || 'Submission failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render states ─────────────────────────────────────────────────────────

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
        <Card sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
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
        </Card>
      </Box>
    );
  }

  if (alreadySubmitted) {
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
        <Card sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <IOTALogo />
          <Typography variant="h5" fontWeight={700} mt={3} mb={1}>
            Already Submitted
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your information has already been submitted using this link. Each link can only be used
            once. Please contact{' '}
            <a href="mailto:hr@iotatechnologies.io" style={{ color: '#1a237e' }}>
              hr@iotatechnologies.io
            </a>{' '}
            if you need to make any changes.
          </Typography>
        </Card>
      </Box>
    );
  }

  if (submitted) {
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
        <Card sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}>
          <IOTALogo />
          <Box sx={{ mt: 3, mb: 2, fontSize: 64 }}>✅</Box>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Form Submitted!
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={2}>
            Thank you, <strong>{tokenRecord?.candidateName}</strong>. Your information has been
            securely received by the IOTA HR team.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A confirmation email has been sent to <strong>{verifiedEmail}</strong>. Our team will be
            in touch with you shortly.
          </Typography>
        </Card>
      </Box>
    );
  }

  // ─── Step content ───────────────────────────────────────────────────────────

  const stepContent = [
    <StepVerifyIdentity key={0} tokenRecord={tokenRecord} onVerified={handleVerified} />,
    <StepPersonalDetails key={1} data={formData} onChange={handleFieldChange} />,
    <StepResidencyDocuments key={2} data={formData} onChange={handleFieldChange} />,
    <StepFamilyDependents
      key={3}
      data={{ ...formData, maritalStatus: formData.maritalStatus }}
      onChange={handleFieldChange}
    />,
    <StepInsurance key={4} data={formData} onChange={handleFieldChange} />,
    <StepSalaryExpectations key={5} data={formData} onChange={handleFieldChange} />,
    <StepReview key={6} formData={formData} tokenRecord={tokenRecord} />,
  ];

  const isLastStep = activeStep === STEPS.length - 1;
  const isFirstStep = activeStep === 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f4f5', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="md">
        {/* Header */}
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
          {tokenRecord?.positionTitle && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Position
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {tokenRecord.positionTitle}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Stepper */}
        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto' }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': { fontSize: { xs: '10px', sm: '12px' } },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Card>

        {/* Step content */}
        <Card sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
          {stepContent[activeStep]}

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
        </Card>

        {/* Navigation */}
        {activeStep > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={submitting}
              sx={{ minWidth: 120 }}
            >
              Back
            </Button>

            {isLastStep ? (
              <LoadingButton
                variant="contained"
                color="success"
                size="large"
                loading={submitting}
                onClick={handleSubmit}
                sx={{ minWidth: 180 }}
              >
                Submit Form
              </LoadingButton>
            ) : (
              <Button variant="contained" onClick={handleNext} sx={{ minWidth: 120 }}>
                Next
              </Button>
            )}
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled">
            © {new Date().getFullYear()} IOTA Technologies · This is a secure, personalised form
            link. Do not share this URL.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
