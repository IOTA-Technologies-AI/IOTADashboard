'use client';

import { pdf, PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { useForm } from 'react-hook-form';
import { useRef, useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { createOffer } from 'src/utils/apiHelper';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  OfferLetterPDF,
  OfferLetterHTML,
  OfferLetterHtmlTemplate,
} from 'src/components/offer-letter';

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

const SIG_ZONE_COLORS = [
  { border: '#1565c0', bg: 'rgba(21,101,192,0.12)' },
  { border: '#2e7d32', bg: 'rgba(46,125,50,0.12)' },
  { border: '#6a1b9a', bg: 'rgba(106,27,154,0.12)' },
  { border: '#e65100', bg: 'rgba(230,81,0,0.12)' },
  { border: '#00838f', bg: 'rgba(0,131,143,0.12)' },
  { border: '#558b2f', bg: 'rgba(85,139,47,0.12)' },
];
const EMP_ZONE_COLOR = { border: '#f57c00', bg: 'rgba(245,124,0,0.13)' };

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

export default function OfferManagementNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [formData, setFormData] = useState(null);

  // IOTA Signatories
  const [iotaSignatories, setIotaSignatories] = useState([{ name: '', email: '', title: '' }]);

  // Additional clauses
  const [clauses, setClauses] = useState([]);

  // Signature zones
  const [signatureZones, setSignatureZones] = useState([]);
  const [draggingSigZone, setDraggingSigZone] = useState(null);
  const [selectedSigZoneSignatory, setSelectedSigZoneSignatory] = useState(0);
  const [selectedZoneIsEmployee, setSelectedZoneIsEmployee] = useState(false);
  const [showHtmlZonePreview, setShowHtmlZonePreview] = useState(false);
  const [zonePreviewOffer, setZonePreviewOffer] = useState(null);
  const sigZonePreviewRef = useRef(null);
  const sigZoneDragMovedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
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
      contractNumber: '',
      contractType: 'Limited',
      startDate: '',
      contractDuration: '',
      probationPeriod: '6',

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

  // Calculate total salary
  const basicSalary = parseFloat(watch('basicSalary')) || 0;
  const housingAllowance = parseFloat(watch('housingAllowance')) || 0;
  const transportationAllowance = parseFloat(watch('transportationAllowance')) || 0;
  const otherAllowances = parseFloat(watch('otherAllowances')) || 0;
  const totalSalary = basicSalary + housingAllowance + transportationAllowance + otherAllowances;

  const onSubmit = handleSubmit(async (data) => {
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
        contractNumber: data.contractNumber,
        contractType: data.contractType,
        startDate: data.startDate,
        contractDuration: data.contractDuration ? Number(data.contractDuration) : undefined,
        probationPeriod: data.probationPeriod ? Number(data.probationPeriod) : undefined,
        currency: data.currency || 'SAR',
        basicSalary: Number(data.basicSalary) || 0,
        housingAllowance: Number(data.housingAllowance) || 0,
        transportationAllowance: Number(data.transportationAllowance) || 0,
        otherAllowances: Number(data.otherAllowances) || 0,
        totalSalary,
        workingHours: data.workingHours ? Number(data.workingHours) : undefined,
        annualLeaveDays: data.annualLeaveDays ? Number(data.annualLeaveDays) : undefined,
        noticePeriod: data.noticePeriod ? Number(data.noticePeriod) : undefined,
      };

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
      if (signatureZones.length > 0) {
        offerPayload.signatureZones = signatureZones;
      }

      const validClauses = clauses.filter((c) => c.title.trim() || c.content.trim());
      if (validClauses.length > 0) {
        offerPayload.clauses = validClauses;
      }

      await createOffer(offerPayload);

      toast.success('Offer created! Admins have been notified for approval.');
      router.push(paths.dashboard.hr.offerManagement.root);
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Failed to create offer');
    } finally {
      setLoading(false);
    }
  });

  const handlePreviewPDF = useCallback(() => {
    const data = getValues();
    setFormData({ ...data, totalSalary });
    setPreviewOpen(true);
  }, [getValues, totalSalary]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const handlePreviewHTML = useCallback(() => {
    const data = getValues();
    setFormData({ ...data, totalSalary });
    setHtmlPreviewOpen(true);
  }, [getValues, totalSalary]);

  const handleCloseHTMLPreview = useCallback(() => {
    setHtmlPreviewOpen(false);
  }, []);

  // Drag zone
  useEffect(() => {
    if (!draggingSigZone) return;
    const onMove = (e) => {
      sigZoneDragMovedRef.current = true;
      if (!sigZonePreviewRef.current) return;
      const rect = sigZonePreviewRef.current.getBoundingClientRect();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const xPct = ((x - rect.left) / rect.width) * 100 - 7;
      const yPct = ((y - rect.top) / rect.height) * 100 - 3;
      setSignatureZones((prev) =>
        prev.map((z) =>
          z.id === draggingSigZone
            ? { ...z, xPct: Math.max(0, Math.min(86, xPct)), yPct: Math.max(0, Math.min(94, yPct)) }
            : z
        )
      );
    };
    const onUp = () => {
      setDraggingSigZone(null);
      setTimeout(() => {
        sigZoneDragMovedRef.current = false;
      }, 0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingSigZone]);

  const handleLoadZonePreview = useCallback(() => {
    const data = getValues();
    const cal =
      (parseFloat(data.basicSalary) || 0) +
      (parseFloat(data.housingAllowance) || 0) +
      (parseFloat(data.transportationAllowance) || 0) +
      (parseFloat(data.otherAllowances) || 0);
    setZonePreviewOffer({
      contractNumber: data.contractNumber || '—',
      candidateName: data.employeeName || '',
      passportNumber: data.passportNumber || null,
      position: data.position || '',
      department: data.department || '',
      startDate: data.startDate || null,
      probationPeriod: data.probationPeriod ? Number(data.probationPeriod) : null,
      currency: data.currency || 'SAR',
      basicSalary: parseFloat(data.basicSalary) || 0,
      housingAllowance: parseFloat(data.housingAllowance) || 0,
      transportationAllowance: parseFloat(data.transportationAllowance) || 0,
      otherAllowances: parseFloat(data.otherAllowances) || 0,
      totalSalary: cal,
      workingHours: data.workingHours ? Number(data.workingHours) : null,
      annualLeaveDays: data.annualLeaveDays ? Number(data.annualLeaveDays) : null,
      noticePeriod: data.noticePeriod ? Number(data.noticePeriod) : null,
      iotaSignatories: iotaSignatories.filter((s) => s.name.trim() && s.email.trim()),
      clauses: clauses.filter((c) => c.title.trim() || c.content.trim()),
      auditLog: [],
    });
    setShowHtmlZonePreview(true);
  }, [getValues, iotaSignatories, clauses]);

  const handleSigZonePreviewClick = useCallback(
    (e) => {
      if (sigZoneDragMovedRef.current) return;
      if (!sigZonePreviewRef.current) return;
      const rect = sigZonePreviewRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100 - 7;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100 - 3;
      const validSignatories = iotaSignatories.filter((s) => s.name.trim() || s.email.trim());
      const newZone = {
        id: `zone-${Date.now()}`,
        page: 1,
        xPct: Math.max(0, Math.min(86, xPct)),
        yPct: Math.max(0, Math.min(94, yPct)),
        widthPct: 14,
        heightPct: 6,
        iotaSignatoryIndex: selectedZoneIsEmployee ? null : selectedSigZoneSignatory,
        isEmployee: selectedZoneIsEmployee,
        label: selectedZoneIsEmployee
          ? 'Employee'
          : validSignatories[selectedSigZoneSignatory]?.name ||
            `Signatory ${selectedSigZoneSignatory + 1}`,
      };
      setSignatureZones((prev) => [...prev, newZone]);
    },
    [selectedSigZoneSignatory, selectedZoneIsEmployee, iotaSignatories]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create New Offer Letter"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Offer Management', href: paths.dashboard.hr.offerManagement.root },
          { name: 'New Offer' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <form onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
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
                      {...register('nationality', { required: 'Nationality is required' })}
                      error={!!errors.nationality}
                      helperText={errors.nationality?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Position/Designation"
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
                    <TextField
                      fullWidth
                      label="Contract Number"
                      {...register('contractNumber', { required: 'Contract number is required' })}
                      error={!!errors.contractNumber}
                      helperText={errors.contractNumber?.message}
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
                      label="Probation Period (months)"
                      {...register('probationPeriod')}
                      error={!!errors.probationPeriod}
                      helperText={errors.probationPeriod?.message}
                    />
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
                  Optional — pre-configure who from IOTA must sign this offer letter. They will be
                  emailed in order once the offer is approved and sent for signing.
                </Typography>
                <Stack spacing={1.5}>
                  {iotaSignatories.map((s, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        label="Full Name"
                        value={s.name}
                        onChange={(e) =>
                          setIotaSignatories((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                          )
                        }
                        sx={{ flex: 2 }}
                      />
                      <TextField
                        size="small"
                        label="Email"
                        type="email"
                        value={s.email}
                        onChange={(e) =>
                          setIotaSignatories((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x))
                          )
                        }
                        sx={{ flex: 2 }}
                      />
                      <TextField
                        size="small"
                        label="Title / Role"
                        value={s.title}
                        onChange={(e) =>
                          setIotaSignatories((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                          )
                        }
                        sx={{ flex: 1.5 }}
                      />
                      {iotaSignatories.length > 1 && (
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setIotaSignatories((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            <Iconify icon="eva:close-fill" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  ))}
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() =>
                      setIotaSignatories((prev) => [...prev, { name: '', email: '', title: '' }])
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Signatory
                  </Button>
                </Stack>
              </Card>

              {/* ── Signature Zone Placement ──────────────────────────── */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Signature Zone Placement
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Optional — click the document to mark where each party&apos;s signature should
                  appear. First load a PDF preview, then click to place zones. Drag to reposition.
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                  onClick={handleLoadZonePreview}
                  sx={{ mb: 2 }}
                >
                  {showHtmlZonePreview ? 'Refresh Preview' : 'Load Preview'}
                </Button>

                {showHtmlZonePreview && (
                  <>
                    {/* Signatory selector */
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
                      <Chip
                        label="Employee"
                        size="small"
                        variant={selectedZoneIsEmployee ? 'filled' : 'outlined'}
                        sx={{
                          borderColor: EMP_ZONE_COLOR.border,
                          color: selectedZoneIsEmployee ? 'common.white' : EMP_ZONE_COLOR.border,
                          bgcolor: selectedZoneIsEmployee ? EMP_ZONE_COLOR.border : undefined,
                        }}
                        onClick={() => setSelectedZoneIsEmployee(true)}
                      />
                      {iotaSignatories
                        .filter((s) => s.name.trim() || s.email.trim())
                        .map((s, i) => (
                          <Chip
                            key={i}
                            size="small"
                            label={s.name || `Signatory ${i + 1}`}
                            variant={
                              !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                                ? 'filled'
                                : 'outlined'
                            }
                            sx={{
                              borderColor: SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border,
                              color:
                                !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                                  ? 'common.white'
                                  : SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border,
                              bgcolor:
                                !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                                  ? SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border
                                  : undefined,
                            }}
                            onClick={() => {
                              setSelectedZoneIsEmployee(false);
                              setSelectedSigZoneSignatory(i);
                            }}
                          />
                        ))}
                    </Stack>

                    {/* Scrollable HTML template preview with zone overlays */}
                    <Box
                      sx={{
                        width: '100%',
                        maxHeight: 640,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        boxShadow: 2,
                        bgcolor: 'grey.200',
                        mb: 1,
                      }}
                    >
                      <Box
                        ref={sigZonePreviewRef}
                        onClick={handleSigZonePreviewClick}
                        sx={{ position: 'relative', cursor: 'crosshair' }}
                      >
                        <OfferLetterHtmlTemplate
                          offer={zonePreviewOffer}
                          showSignatures={false}
                          showAuditTrail={false}
                        />
                        {signatureZones.map((zone) => {
                          const isEmp = zone.isEmployee;
                          const color = isEmp
                            ? EMP_ZONE_COLOR
                            : SIG_ZONE_COLORS[
                                (zone.iotaSignatoryIndex ?? 0) % SIG_ZONE_COLORS.length
                              ];
                          return (
                            <Box
                              key={zone.id}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                sigZoneDragMovedRef.current = false;
                                setDraggingSigZone(zone.id);
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                sigZoneDragMovedRef.current = false;
                                setDraggingSigZone(zone.id);
                              }}
                              sx={{
                                position: 'absolute',
                                left: `${zone.xPct}%`,
                                top: `${zone.yPct}%`,
                                width: `${zone.widthPct}%`,
                                height: `${zone.heightPct}%`,
                                border: '2px dashed',
                                borderColor: color.border,
                                bgcolor: color.bg,
                                borderRadius: 0.5,
                                cursor: 'move',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.55rem',
                                  fontWeight: 700,
                                  color: color.border,
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {zone.label}
                              </Typography>
                              <Tooltip title="Remove">
                                <IconButton
                                  size="small"
                                  sx={{ p: 0, minWidth: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSignatureZones((prev) =>
                                      prev.filter((z) => z.id !== zone.id)
                                    );
                                  }}
                                >
                                  <Iconify
                                    icon="eva:close-fill"
                                    width={12}
                                    sx={{ color: color.border }}
                                  />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    {signatureZones.length > 0 && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {signatureZones.length} zone{signatureZones.length !== 1 ? 's' : ''}{' '}
                          placed
                        </Typography>
                        <Button size="small" color="error" onClick={() => setSignatureZones([])}>
                          Clear All
                        </Button>
                      </Stack>
                    )}
                  </>
                )}
              </Card>

              {/* ── Additional Clauses ──────────────────────────────────── */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Additional Clauses
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Optional — add custom or country-specific terms that will appear in the offer
                  letter before the signature pages.
                </Typography>

                <Stack spacing={2}>
                  {clauses.map((clause, i) => (
                    <Box
                      key={i}
                      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="subtitle2">Clause {i + 1}</Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setClauses((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Iconify icon="eva:close-fill" />
                        </IconButton>
                      </Stack>
                      <TextField
                        label="Clause Title"
                        size="small"
                        fullWidth
                        value={clause.title}
                        onChange={(e) =>
                          setClauses((prev) =>
                            prev.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c))
                          )
                        }
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Clause Content"
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        value={clause.content}
                        onChange={(e) =>
                          setClauses((prev) =>
                            prev.map((c, idx) =>
                              idx === i ? { ...c, content: e.target.value } : c
                            )
                          )
                        }
                      />
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => setClauses((prev) => [...prev, { title: '', content: '' }])}
                  >
                    Add Clause
                  </Button>
                </Stack>
              </Card>
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
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    startIcon={<Iconify icon="eva:monitor-fill" />}
                    onClick={handlePreviewHTML}
                  >
                    View in Browser
                  </Button>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push(paths.dashboard.hr.offerManagement.root)}
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
                    Save
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
            <Typography variant="h6">Offer Letter Preview</Typography>
            {formData && (
              <PDFDownloadLink
                document={<OfferLetterPDF data={formData} />}
                fileName={`Offer_Letter_${formData.employeeName?.replace(/\s+/g, '_')}_${formData.contractNumber}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="eva:download-fill" />}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Generating...' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {formData && (
            <Box sx={{ height: '70vh', width: '100%' }}>
              <PDFViewer width="100%" height="100%">
                <OfferLetterPDF data={formData} />
              </PDFViewer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* HTML Preview Dialog */}
      <Dialog open={htmlPreviewOpen} onClose={handleCloseHTMLPreview} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Offer Letter - Browser View</Typography>
            <Button
              variant="text"
              startIcon={<Iconify icon="eva:printer-fill" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {formData && (
            <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              <OfferLetterHtmlTemplate
                offer={{
                  contractNumber: formData.contractNumber || '—',
                  candidateName: formData.employeeName || '',
                  candidateEmail: formData.candidateEmail || '',
                  passportNumber: formData.passportNumber || null,
                  dateOfBirth: formData.dateOfBirth || null,
                  nationality: formData.nationality || null,
                  position: formData.position || '',
                  department: formData.department || '',
                  contractType: formData.contractType || 'Limited',
                  startDate: formData.startDate || null,
                  contractDuration: formData.contractDuration
                    ? Number(formData.contractDuration)
                    : null,
                  probationPeriod: formData.probationPeriod
                    ? Number(formData.probationPeriod)
                    : null,
                  currency: formData.currency || 'SAR',
                  basicSalary: Number(formData.basicSalary) || 0,
                  housingAllowance: Number(formData.housingAllowance) || 0,
                  transportationAllowance: Number(formData.transportationAllowance) || 0,
                  otherAllowances: Number(formData.otherAllowances) || 0,
                  totalSalary: formData.totalSalary || 0,
                  workingHours: formData.workingHours ? Number(formData.workingHours) : null,
                  annualLeaveDays: formData.annualLeaveDays
                    ? Number(formData.annualLeaveDays)
                    : null,
                  noticePeriod: formData.noticePeriod ? Number(formData.noticePeriod) : null,
                  iotaSignatories: iotaSignatories.filter((s) => s.name.trim() && s.email.trim()),
                  clauses: clauses.filter((c) => c.title.trim() || c.content.trim()),
                  auditLog: [],
                }}
                showSignatures={false}
                showAuditTrail={false}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHTMLPreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
