'use client';

import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect, useCallback } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getOffer, createOffer, updateOffer, resubmitOffer } from 'src/utils/apiHelper';

import { listCustomers } from 'src/actions/documents';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  uploadOfferLetter,
  verifyOfferDocument,
  listEligibleCandidates,
} from 'src/actions/offer-documents';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { OfferLetterPDF, OfferLetterOnePagePDF } from 'src/components/offer-letter';

import { OfferClauses } from 'src/sections/offer/offer-clauses';
import { SignatoryPicker } from 'src/sections/offer/signatory-picker';

// ----------------------------------------------------------------------

const DEPARTMENTS = [
  'IT',
  'Finance',
  'HR',
  'Operations',
  'Sales',
  'Marketing',
  'Customer Service',
  'Administration',
];

const CONTRACT_TYPES = ['Limited', 'Unlimited'];

const CURRENCIES = [
  { code: 'SAR', label: 'SAR – Saudi Riyal' },
  { code: 'AED', label: 'AED – UAE Dirham' },
  { code: 'USD', label: 'USD – US Dollar' },
  { code: 'GBP', label: 'GBP – British Pound' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'INR', label: 'INR – Indian Rupee' },
  { code: 'PKR', label: 'PKR – Pakistani Rupee' },
  { code: 'EGP', label: 'EGP – Egyptian Pound' },
  { code: 'QAR', label: 'QAR – Qatari Riyal' },
  { code: 'KWD', label: 'KWD – Kuwaiti Dinar' },
  { code: 'BHD', label: 'BHD – Bahraini Dinar' },
  { code: 'OMR', label: 'OMR – Omani Rial' },
];

/** The form's letter terms as stored on the offer (offers.letterTerms). */
function letterTermsFrom(data) {
  const t = data.terms || {};
  const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
  return {
    title: t.title || 'Mr.',
    grade: (t.grade || '').trim(),
    division: (data.department || '').trim(),
    reportsTo: (t.reportsTo || '').trim(),
    duties: (t.duties || '').trim(),
    probationDays: num(data.probationPeriod) ?? 90,
    insuranceClass: (t.insuranceClass || '').trim(),
    dependantsCovered: num(t.dependantsCovered) ?? 0,
    airTicketCap: num(t.airTicketCap) ?? 0,
    eosIncludesAllowances: !!t.eosIncludesAllowances,
    dependantsIqamaCovered: !!t.dependantsIqamaCovered,
    regulatedFinancialCustomer: !!t.regulatedFinancialCustomer,
    trainingCostRecovery: num(t.trainingCostRecovery) ?? 0,
    offerValidUntil: t.offerValidUntil || '',
    governmentId: (t.governmentId || '').trim(),
    // New offers are signed on the one-page bilingual offer; the detailed
    // letter is still generated for GOSI records.
    letterFormat: 'one_page',
  };
}

const TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Eng.'];

/** Offers are issued by IOTA Saudi Arabia: the country of work used to suggest clauses. */
const COUNTRY_OF_WORK = 'Saudi Arabia';

const INTERNAL_CLIENT = { id: null, name: 'Internal (IOTA office)', internal: true };

const str = (v) => (v === null || v === undefined ? '' : String(v));

/** A saved offer as the form's values (the reverse of the payload built on save). */
function formValuesFrom(offer) {
  const t = offer.letterTerms || {};
  const day = (v) => (v ? String(v).slice(0, 10) : '');
  return {
    employeeName: offer.candidateName || '',
    candidateEmail: offer.candidateEmail || '',
    passportNumber: offer.passportNumber || '',
    dateOfBirth: day(offer.dateOfBirth),
    nationality: offer.nationality || '',
    position: offer.position || '',
    department: offer.department || '',
    contractType: offer.contractType || 'Limited',
    startDate: day(offer.startDate),
    contractDuration: str(offer.contractDuration),
    probationPeriod: str(
      t.probationDays ?? (offer.probationPeriod ? Number(offer.probationPeriod) * 30 : 90)
    ),
    terms: {
      title: t.title || 'Mr.',
      grade: t.grade || '',
      reportsTo: t.reportsTo || '',
      duties: t.duties || '',
      insuranceClass: t.insuranceClass || '',
      dependantsCovered: str(t.dependantsCovered ?? 0),
      airTicketCap: str(t.airTicketCap ?? 0),
      eosIncludesAllowances: !!t.eosIncludesAllowances,
      dependantsIqamaCovered: !!t.dependantsIqamaCovered,
      regulatedFinancialCustomer: !!t.regulatedFinancialCustomer,
      trainingCostRecovery: str(t.trainingCostRecovery ?? 0),
      offerValidUntil: day(t.offerValidUntil),
      governmentId: t.governmentId || '',
    },
    currency: offer.currency || 'SAR',
    basicSalary: str(offer.basicSalary),
    housingAllowance: str(offer.housingAllowance),
    transportationAllowance: str(offer.transportationAllowance),
    otherAllowances: str(offer.otherAllowances),
    workingHours: str(offer.workingHours),
    annualLeaveDays: str(offer.annualLeaveDays),
    noticePeriod: str(offer.noticePeriod),
  };
}

/**
 * Create an offer, or (with `editId`) amend a draft one: the saved offer fills
 * the form, and saving updates it and submits it for approval again.
 */
export function OfferFormView({ editId }) {
  const router = useRouter();
  const isEdit = !!editId;
  const [loading, setLoading] = useState(false);
  // Edit: the offer being amended, while it loads, and why it can't be edited.
  const [editOffer, setEditOffer] = useState(null);
  const [editLoading, setEditLoading] = useState(isEdit);
  const [editError, setEditError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  // The one-page offer is what the employee signs; the detailed letter is for GOSI.
  const [previewKind, setPreviewKind] = useState('one_page');
  const [formData, setFormData] = useState(null);

  // IOTA Signatories
  const [iotaSignatories, setIotaSignatories] = useState([{ name: '', email: '', title: '' }]);

  // Additional clauses
  const [clauses, setClauses] = useState([]);

  // Onboarded employee this offer is for (vetting approved by a Super Admin)
  const [eligible, setEligible] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);

  // The client the employee is offered for: an ERP customer, or IOTA's own office.
  // It goes into the offer's document ID (shared/doc-id.ts in the API).
  const [customers, setCustomers] = useState([]);
  const [client, setClient] = useState(null);
  const [clientError, setClientError] = useState('');

  // Letter: generated from the IOTA template, or an uploaded PDF
  const [letterSource, setLetterSource] = useState('generated');
  const [letterFile, setLetterFile] = useState(null);
  const letterInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      // Employee Information
      employeeName: '',
      candidateEmail: '',
      passportNumber: '',
      dateOfBirth: '',
      nationality: '',
      position: '',
      department: '',

      // Contract Details
      contractType: 'Limited',
      startDate: '',
      contractDuration: '',
      probationPeriod: '90', // days

      // Offer letter terms (offers.letterTerms) — the template's standard terms
      terms: {
        title: 'Mr.',
        grade: '',
        reportsTo: '',
        duties: '',
        insuranceClass: '',
        dependantsCovered: '2',
        airTicketCap: '2000',
        eosIncludesAllowances: false,
        dependantsIqamaCovered: false,
        regulatedFinancialCustomer: false,
        trainingCostRecovery: '0',
        offerValidUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        governmentId: '',
      },

      // Salary Information
      currency: 'SAR',
      basicSalary: '',
      housingAllowance: '',
      transportationAllowance: '',
      otherAllowances: '',

      // Employment Terms
      workingHours: '8',
      annualLeaveDays: '30',
      noticePeriod: '30',
    },
  });

  const currency = watch('currency') || 'SAR';

  useEffect(() => {
    if (!editId) return;
    getOffer(editId)
      .then((offer) => {
        setEditOffer(offer);
        if (offer.status !== 'draft') return;
        reset(formValuesFrom(offer));
        setClauses(
          (offer.clauses ?? []).map((c) => ({
            ...c,
            title: c.title || '',
            content: c.content || '',
          }))
        );
        const signatories = (offer.iotaSignatories ?? []).map((x) => ({
          name: x.name || '',
          email: x.email || '',
          title: x.title || '',
        }));
        if (signatories.length) setIotaSignatories(signatories);
        setLetterSource(offer.documentSource === 'uploaded' ? 'uploaded' : 'generated');
      })
      .catch((err) => {
        console.error('Loading the offer failed:', err);
        setEditError(err?.response?.data?.message || 'The offer could not be loaded.');
      })
      .finally(() => setEditLoading(false));
  }, [editId, reset]);

  // The client is fixed once the document ID is issued: match it in the list.
  useEffect(() => {
    if (!editOffer || !customers.length) return;
    setClient(
      editOffer.clientCustomerId
        ? (customers.find((c) => c.id === editOffer.clientCustomerId) ?? {
            id: editOffer.clientCustomerId,
            name: editOffer.clientName || 'Client',
          })
        : INTERNAL_CLIENT
    );
  }, [editOffer, customers]);

  useEffect(() => {
    listCustomers()
      .then((list) => setCustomers([INTERNAL_CLIENT, ...list]))
      .catch((err) => {
        console.error('Loading customers failed:', err);
        setCustomers([INTERNAL_CLIENT]);
      });
  }, []);

  useEffect(() => {
    if (isEdit) return;
    listEligibleCandidates()
      .then(setEligible)
      .catch((err) => {
        console.error('Loading onboarded employees failed:', err);
        setEligible([]);
      })
      .finally(() => setEligibleLoading(false));
  }, [isEdit]);

  // These inputs are uncontrolled (register), so MUI can't see a value set from
  // code and leaves the label sitting on top of it. Float it while there is one.
  const filledLabel = (name) => (watch(name) ? { shrink: true } : undefined);

  const applyCandidate = (c) => {
    setCandidate(c);
    if (!c) return;
    const day = (v) => (v ? String(v).slice(0, 10) : '');
    // Validate only what the employee record actually fills: checking an empty
    // field here would show "required" before anyone has had a chance to type.
    const fill = (name, value) => {
      setValue(name, value, { shouldDirty: true, shouldValidate: !!value });
      if (value) clearErrors(name);
    };
    fill('employeeName', c.candidateName || '');
    fill('candidateEmail', c.candidateEmail || '');
    fill('passportNumber', c.passportNumber || '');
    fill('dateOfBirth', day(c.dateOfBirth));
    fill('nationality', c.nationality || '');
    fill('position', c.position || '');
    fill('startDate', day(c.startDate));
    const dept = DEPARTMENTS.find(
      (d) =>
        d.toLowerCase() ===
        String(c.department || '')
          .trim()
          .toLowerCase()
    );
    if (dept) fill('department', dept);
  };

  // Calculate total salary
  const basicSalary = parseFloat(watch('basicSalary')) || 0;
  const housingAllowance = parseFloat(watch('housingAllowance')) || 0;
  const transportationAllowance = parseFloat(watch('transportationAllowance')) || 0;
  const otherAllowances = parseFloat(watch('otherAllowances')) || 0;
  const totalSalary = basicSalary + housingAllowance + transportationAllowance + otherAllowances;

  const onSubmit = handleSubmit(async (data) => {
    if (!client) {
      setClientError('Choose the client, or Internal (IOTA office).');
      toast.error('Choose the client the employee is offered for.');
      return;
    }
    if (!isEdit && letterSource === 'uploaded' && !letterFile) {
      toast.error('Choose the offer letter PDF to upload, or switch to the IOTA template.');
      return;
    }
    try {
      setLoading(true);

      const offerPayload = {
        candidateName: data.employeeName,
        candidateEmail: data.candidateEmail,
        passportNumber: data.passportNumber,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        position: data.position,
        department: data.department,
        // The document ID is issued by the API when the offer is saved.
        clientCustomerId: client?.internal ? null : (client?.id ?? null),
        clientInternal: !!client?.internal,
        contractType: data.contractType,
        startDate: data.startDate,
        contractDuration: data.contractDuration ? Number(data.contractDuration) : undefined,
        // Days, as the letter states them; the column keeps months for older screens.
        probationPeriod: data.probationPeriod
          ? Math.round(Number(data.probationPeriod) / 30)
          : undefined,
        letterTerms: letterTermsFrom(data),
        currency: data.currency || 'SAR',
        basicSalary: Number(data.basicSalary) || 0,
        housingAllowance: Number(data.housingAllowance) || 0,
        transportationAllowance: Number(data.transportationAllowance) || 0,
        otherAllowances: Number(data.otherAllowances) || 0,
        totalSalary,
        workingHours: data.workingHours ? Number(data.workingHours) : undefined,
        annualLeaveDays: data.annualLeaveDays ? Number(data.annualLeaveDays) : undefined,
        noticePeriod: data.noticePeriod ? Number(data.noticePeriod) : undefined,
        documentSource: letterSource,
      };
      if (candidate) offerPayload.onboardingSubmissionId = candidate.submissionId;

      // Attach pre-configured signatories (if any filled)
      const validSignatories = iotaSignatories.filter((s) => s.name.trim() && s.email.trim());
      if (validSignatories.length > 0) {
        offerPayload.iotaSignatories = validSignatories.map((s) => ({
          name: s.name,
          email: s.email,
          title: s.title || null,
          signedAt: null,
          signatureData: null,
          signingToken: null,
          tokenExpiresAt: null,
          ipAddress: null,
        }));
      }
      // Zones on an uploaded letter are placed on the offer page, over the letter itself.

      const validClauses = clauses.filter((c) => c.title.trim() || c.content.trim());
      if (validClauses.length > 0) {
        offerPayload.clauses = validClauses;
      }

      if (isEdit) {
        // The document ID, its client and the letter source stay as issued.
        const fixed = ['clientCustomerId', 'clientInternal', 'documentSource'];
        const changes = Object.fromEntries(
          Object.entries(offerPayload).filter(([key]) => !fixed.includes(key))
        );
        await updateOffer(editId, changes);
        await resubmitOffer(editId);
        toast.success('Offer amended and submitted for approval again.');
        router.push(paths.dashboard.hr.offerManagement.details(editId));
        return;
      }

      const created = await createOffer(offerPayload);

      if (letterSource === 'uploaded') {
        try {
          await uploadOfferLetter(created.id, letterFile);
        } catch (err) {
          toast.error(
            `Offer saved, but the letter upload failed: ${err?.response?.data?.message || err.message}. Upload it again from the offer page.`
          );
          router.push(paths.dashboard.hr.offerManagement.details(created.id));
          return;
        }
        toast.info('Letter uploaded. Checking it against the offer details…');
        try {
          const v = await verifyOfferDocument(created.id);
          const n = v.items.filter((i) => i.status !== 'match').length;
          if (n)
            toast.warning(
              `${n} discrepanc${n === 1 ? 'y' : 'ies'} found — review them on the offer page.`
            );
          else toast.success('Offer created and the letter matches the offer details.');
        } catch (err) {
          toast.warning(
            `Offer created, but the letter check failed: ${err?.response?.data?.message || err.message}. Run it again from the offer page.`
          );
        }
        router.push(paths.dashboard.hr.offerManagement.details(created.id));
        return;
      }

      toast.success('Offer created! Admins have been notified for approval.');
      router.push(paths.dashboard.hr.offerManagement.root);
    } catch (error) {
      console.error(isEdit ? 'Error amending offer:' : 'Error creating offer:', error);
      toast.error(
        error?.response?.data?.message ||
          (isEdit ? 'Failed to amend offer' : 'Failed to create offer')
      );
    } finally {
      setLoading(false);
    }
  });

  // The form as an offer record, so the preview uses the same template as signing.
  const toLetterOffer = useCallback(
    (data) => ({
      contractNumber: editOffer?.contractNumber || 'Issued on save',
      documentIssuedAt: editOffer?.documentIssuedAt || new Date().toISOString(),
      candidateName: data.employeeName || '',
      passportNumber: data.passportNumber || '',
      nationality: data.nationality || '',
      position: data.position || '',
      department: data.department || '',
      clientCustomerId: client && !client.internal ? client.id : null,
      clientName: client?.name || null,
      contractType: data.contractType,
      contractDuration: data.contractDuration,
      startDate: data.startDate,
      workingHours: data.workingHours,
      annualLeaveDays: data.annualLeaveDays,
      noticePeriod: data.noticePeriod,
      currency: data.currency || 'SAR',
      basicSalary: data.basicSalary,
      housingAllowance: data.housingAllowance,
      transportationAllowance: data.transportationAllowance,
      otherAllowances: data.otherAllowances,
      totalSalary,
      iotaSignatories: iotaSignatories.filter((x) => x.name.trim()),
      clauses: clauses.filter((c) => c.title.trim() || c.content.trim()),
      letterTerms: letterTermsFrom(data),
    }),
    [client, totalSalary, iotaSignatories, clauses, editOffer]
  );

  const handlePreviewPDF = useCallback(() => {
    setFormData(toLetterOffer(getValues()));
    setPreviewOpen(true);
  }, [getValues, toLetterOffer]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const breadcrumbs = (
    <CustomBreadcrumbs
      heading={isEdit ? 'Amend offer' : 'Create New Offer Letter'}
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'HR', href: paths.dashboard.hr.root },
        { name: 'Offer Management', href: paths.dashboard.hr.offerManagement.root },
        ...(isEdit
          ? [
              {
                name: editOffer?.contractNumber || 'Offer',
                href: paths.dashboard.hr.offerManagement.details(editId),
              },
              { name: 'Amend' },
            ]
          : [{ name: 'New Offer' }]),
      ]}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  if (isEdit && (editLoading || editError || editOffer?.status !== 'draft')) {
    return (
      <DashboardContent>
        {breadcrumbs}
        {editLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Alert
            severity={editError ? 'error' : 'warning'}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => router.push(paths.dashboard.hr.offerManagement.details(editId))}
              >
                Back to offer
              </Button>
            }
          >
            {editError ||
              'Only an offer being amended can be edited. Start an amendment from the offer page first.'}
          </Alert>
        )}
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {breadcrumbs}

      <form onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* ── Onboarded employee ──────────────────────────────────── */}
              <Card sx={{ p: 3, display: isEdit ? 'none' : undefined }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Start from an onboarded employee
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Employees whose onboarding submission passed vetting and was approved by a Super
                  Admin. Picking one fills in their details below.
                </Typography>
                <Autocomplete
                  options={eligible}
                  loading={eligibleLoading}
                  value={candidate}
                  onChange={(_, v) => applyCandidate(v)}
                  getOptionLabel={(o) => o.candidateName || o.candidateEmail || ''}
                  isOptionEqualToValue={(o, v) => o.submissionId === v.submissionId}
                  renderOption={(props, o) => (
                    <li {...props} key={o.submissionId}>
                      <Box>
                        <Typography variant="body2">{o.candidateName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[o.position, o.department, o.candidateEmail].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  noOptionsText={
                    eligibleLoading
                      ? 'Loading…'
                      : 'No approved onboarding submissions without an offer yet.'
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Onboarded employee (optional)" />
                  )}
                />
                {candidate ? (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Vetting approved by {candidate.vettingApprovedBy || 'a Super Admin'}
                    {candidate.vettingApprovedAt
                      ? ` on ${new Date(candidate.vettingApprovedAt).toLocaleDateString()}`
                      : ''}
                    . Salary and contract terms still need to be entered.
                  </Alert>
                ) : null}
              </Card>

              {/* ── Offer letter source ─────────────────────────────────── */}
              {isEdit && letterSource === 'uploaded' ? (
                <Alert severity="info">
                  This offer uses an uploaded letter. After saving, upload the corrected letter on
                  the offer page so it matches these details.
                </Alert>
              ) : null}
              <Card sx={{ p: 3, display: isEdit ? 'none' : undefined }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Offer letter
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={letterSource}
                  onChange={(_, v) => v && setLetterSource(v)}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="generated">
                    <Iconify icon="solar:document-text-bold" sx={{ mr: 1 }} />
                    Generate from IOTA template
                  </ToggleButton>
                  <ToggleButton value="uploaded">
                    <Iconify icon="eva:cloud-upload-fill" sx={{ mr: 1 }} />
                    Upload our own PDF
                  </ToggleButton>
                </ToggleButtonGroup>
                {letterSource === 'uploaded' ? (
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      Fill in the offer details below as well — the uploaded letter is checked
                      against them and any difference is highlighted. Signature areas and the
                      company stamp are placed on the offer page once it is saved.
                    </Typography>
                    <input
                      ref={letterInputRef}
                      hidden
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && !/\.pdf$/i.test(f.name)) {
                          toast.error('Upload the offer letter as a PDF.');
                          return;
                        }
                        setLetterFile(f || null);
                      }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="outlined"
                        startIcon={<Iconify icon="eva:attach-2-fill" />}
                        onClick={() => letterInputRef.current?.click()}
                      >
                        {letterFile ? 'Change PDF' : 'Choose PDF'}
                      </Button>
                      <Typography variant="body2" noWrap>
                        {letterFile?.name || 'No file chosen'}
                      </Typography>
                    </Stack>
                  </Stack>
                ) : null}
              </Card>

              {/* Employee Information */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Employee Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Employee Full Name"
                      InputLabelProps={filledLabel('employeeName')}
                      {...register('employeeName', { required: 'Name is required' })}
                      error={!!errors.employeeName}
                      helperText={errors.employeeName?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Candidate Email"
                      InputLabelProps={filledLabel('candidateEmail')}
                      {...register('candidateEmail', {
                        required: 'Email is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                      })}
                      error={!!errors.candidateEmail}
                      helperText={errors.candidateEmail?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Passport Number"
                      InputLabelProps={filledLabel('passportNumber')}
                      {...register('passportNumber', { required: 'Passport number is required' })}
                      error={!!errors.passportNumber}
                      helperText={errors.passportNumber?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Date of Birth"
                      InputLabelProps={{ shrink: true }}
                      {...register('dateOfBirth', { required: 'Date of birth is required' })}
                      error={!!errors.dateOfBirth}
                      helperText={errors.dateOfBirth?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nationality"
                      InputLabelProps={filledLabel('nationality')}
                      {...register('nationality', { required: 'Nationality is required' })}
                      error={!!errors.nationality}
                      helperText={errors.nationality?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Position/Designation"
                      InputLabelProps={filledLabel('position')}
                      {...register('position', { required: 'Position is required' })}
                      error={!!errors.position}
                      helperText={errors.position?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Department"
                      value={watch('department') || ''}
                      {...register('department', { required: 'Department is required' })}
                      error={!!errors.department}
                      helperText={errors.department?.message}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Card>

              {/* Contract Details */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Contract Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      options={customers}
                      value={client}
                      disabled={isEdit}
                      onChange={(e, v) => {
                        setClient(v);
                        setClientError('');
                      }}
                      getOptionLabel={(o) => o.name}
                      isOptionEqualToValue={(a, b) =>
                        a.id === b.id && !!a.internal === !!b.internal
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Client"
                          error={!!clientError}
                          helperText={
                            clientError ||
                            (isEdit
                              ? 'Fixed: the document ID was issued for this client.'
                              : 'Who the employee is offered for. The document ID is issued from this when you save.')
                          }
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth select label="Contract Type" {...register('contractType')}>
                      {CONTRACT_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      {...register('startDate', { required: 'Start date is required' })}
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Contract Duration (months)"
                      {...register('contractDuration', {
                        required: 'Contract duration is required',
                      })}
                      error={!!errors.contractDuration}
                      helperText={errors.contractDuration?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Probation Period (days)"
                      {...register('probationPeriod')}
                      error={!!errors.probationPeriod}
                      helperText={errors.probationPeriod?.message}
                    />
                  </Grid>
                </Grid>
              </Card>

              {/* Offer letter terms */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Offer Letter Terms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  The parts of the IOTA offer letter that differ per employee. Leave a field empty
                  to leave it out of the letter.
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      select
                      label="Title"
                      value={watch('terms.title') || 'Mr.'}
                      {...register('terms.title')}
                    >
                      {TITLES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth label="Grade" {...register('terms.grade')} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Government ID (Iqama / National ID)"
                      {...register('terms.governmentId')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Reports to"
                      placeholder="Default: the IOTA Delivery Manager responsible for the client's account"
                      InputLabelProps={{ shrink: true }}
                      {...register('terms.reportsTo')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Offer valid until"
                      InputLabelProps={{ shrink: true }}
                      {...register('terms.offerValidUntil')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="Duties (clause 1.5)"
                      placeholder="e.g. L2/L3 support of the Customer's IBM software and infrastructure estate (as specified in the assignment statement of work)"
                      InputLabelProps={{ shrink: true }}
                      {...register('terms.duties')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Medical insurance class"
                      {...register('terms.insuranceClass')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Dependants covered"
                      helperText="Insurance and air tickets; 0 for the employee only"
                      {...register('terms.dependantsCovered')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Air ticket cap per person (${currency})`}
                      helperText="0 leaves the air ticket clause out"
                      {...register('terms.airTicketCap')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Training cost recovery (${currency})`}
                      helperText="Repayable if they leave within 12 months; 0 leaves the clause out"
                      {...register('terms.trainingCostRecovery')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack>
                      <FormControlLabel
                        control={<Checkbox {...register('terms.eosIncludesAllowances')} />}
                        label="End-of-service on basic + housing + transportation"
                      />
                      <FormControlLabel
                        control={<Checkbox {...register('terms.dependantsIqamaCovered')} />}
                        label="Company pays dependants' Iqama"
                      />
                      {client && !client.internal ? (
                        <FormControlLabel
                          control={<Checkbox {...register('terms.regulatedFinancialCustomer')} />}
                          label="Client is a SAMA-regulated financial institution"
                        />
                      ) : null}
                    </Stack>
                  </Grid>
                </Grid>
              </Card>

              {/* Salary Information */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Salary Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      select
                      label="Currency"
                      defaultValue="SAR"
                      {...register('currency')}
                    >
                      {CURRENCIES.map((c) => (
                        <MenuItem key={c.code} value={c.code}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Basic Salary (${currency})`}
                      {...register('basicSalary', { required: 'Basic salary is required' })}
                      error={!!errors.basicSalary}
                      helperText={errors.basicSalary?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Housing Allowance (${currency})`}
                      {...register('housingAllowance')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Transportation Allowance (${currency})`}
                      {...register('transportationAllowance')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Other Allowances (${currency})`}
                      {...register('otherAllowances')}
                    />
                  </Grid>
                </Grid>
              </Card>

              {/* Employment Terms */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Employment Terms
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Working Hours/Day"
                      {...register('workingHours')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Annual Leave Days"
                      {...register('annualLeaveDays')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Notice Period (days)"
                      {...register('noticePeriod')}
                    />
                  </Grid>
                </Grid>
              </Card>

              {/* ── IOTA Signatories ──────────────────────────────────── */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  IOTA Signatories
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Who signs the letter for IOTA, from the approved list. They are emailed in order
                  once the offer is approved and sent for signing.
                </Typography>
                <SignatoryPicker value={iotaSignatories} onChange={setIotaSignatories} />
              </Card>

              {letterSource === 'generated' && (
                <Alert severity="info" icon={<Iconify icon="solar:pen-new-square-bold" />}>
                  Signature zones are placed after approval, on the offer&apos;s page — on the
                  actual pages of the letter that will be signed.
                </Alert>
              )}

              {/* ── Addendum clauses ─────────────────────────────────────── */}
              <OfferClauses
                clauses={clauses}
                setClauses={setClauses}
                clientName={client && !client.internal ? client.name : ''}
                nationality={watch('nationality')}
                contractType={watch('contractType')}
                country={COUNTRY_OF_WORK}
                contractTypes={CONTRACT_TYPES}
              />
            </Stack>
          </Grid>

          {/* Summary Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Salary Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Basic Salary:
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {currency} {basicSalary.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Housing Allowance:
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {currency} {housingAllowance.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Transportation:
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {currency} {transportationAllowance.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Other Allowances:
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {currency} {otherAllowances.toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Total Monthly Salary:</Typography>
                    <Typography variant="subtitle1" color="primary" fontWeight="700">
                      {currency} {totalSalary.toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </Card>

              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<Iconify icon="eva:eye-fill" />}
                    onClick={handlePreviewPDF}
                  >
                    Preview PDF
                  </Button>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() =>
                      router.push(
                        isEdit
                          ? paths.dashboard.hr.offerManagement.details(editId)
                          : paths.dashboard.hr.offerManagement.root
                      )
                    }
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    fullWidth
                    type="submit"
                    variant="contained"
                    loading={loading}
                    startIcon={<Iconify icon="eva:save-fill" />}
                  >
                    {isEdit ? 'Save and submit' : 'Save'}
                  </LoadingButton>
                </Stack>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </form>

      {/* PDF Preview Dialog */}
      <Dialog open={previewOpen} onClose={handleClosePreview} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Offer Letter Preview</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={previewKind}
                onChange={(e, v) => v && setPreviewKind(v)}
              >
                <ToggleButton value="one_page">For signature (one page)</ToggleButton>
                <ToggleButton value="detailed">Detailed (GOSI)</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {formData && (
              <PDFDownloadLink
                key={previewKind}
                document={
                  previewKind === 'one_page' ? (
                    <OfferLetterOnePagePDF offer={formData} />
                  ) : (
                    <OfferLetterPDF offer={formData} />
                  )
                }
                fileName={`Offer_Letter_${formData.candidateName?.replace(/\s+/g, '_')}_${previewKind === 'one_page' ? 'draft' : 'GOSI_draft'}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading, error: pdfError }) =>
                  // The viewer below shows a blank page when the letter cannot
                  // be laid out; this says why instead.
                  pdfError ? (
                    <Typography variant="body2" color="error.main" sx={{ maxWidth: 420 }}>
                      The letter could not be generated: {pdfError.message || String(pdfError)}
                    </Typography>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon="eva:download-fill" />}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Generating...' : 'Download PDF'}
                    </Button>
                  )
                }
              </PDFDownloadLink>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {formData && (
            <Box sx={{ height: '70vh', width: '100%' }}>
              <PDFViewer key={previewKind} width="100%" height="100%">
                {previewKind === 'one_page' ? (
                  <OfferLetterOnePagePDF offer={formData} />
                ) : (
                  <OfferLetterPDF offer={formData} />
                )}
              </PDFViewer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
