'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  getResourceCalculation,
  getResourceCalculationTemplates,
  createResourceCalculation,
  updateResourceCalculation,
  listCandidates,
  listJobDescriptions,
  uploadResume,
  getCustomers,
  submitRCForApproval,
  forwardRC,
  approveRC,
} from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['draft', 'submitted', 'approved', 'rejected'];

const NATIONALITY_OPTIONS = [
  'Indian',
  'Pakistani',
  'Egyptian',
  'Saudi Arabian',
  'Filipino',
  'Sri Lankan',
  'Sudanese',
  'American',
  'British',
];

const IOTA_OFFICE_OPTIONS = [
  {
    value: 'KSA',
    label: 'IOTA Office - Saudi Arabia',
    countryCode: 'KSA',
    currency: 'SAR',
    taxRate: 0.15,
    taxLabel: 'VAT',
  },
  {
    value: 'India',
    label: 'IOTA Office - India',
    countryCode: 'India',
    currency: 'INR',
    taxRate: 0.18,
    taxLabel: 'GST',
  },
];

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
};

const CATEGORY_LABELS = {
  salary: 'Salary',
  statutory: 'Statutory',
  insurance: 'Insurance',
  government: 'Government',
  service: 'Service',
  custom: 'Custom',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve {factor} and {dependents} placeholders in line item labels. */
function resolveLabel(label, insurancePremiumFactor, dependentsCount) {
  return label
    .replace(/\{factor\}/g, insurancePremiumFactor)
    .replace(/\{dependents\}/g, dependentsCount);
}

/** Evaluate simple formula expressions with baseSalary and dependentsCount context. */
function evalFormula(formula, baseSalary, dependentsCount) {
  if (!formula) return 0;
  try {
    const safe = formula
      .replace(/baseSalary/g, String(Number(baseSalary) || 0))
      .replace(/dependentsCount/g, String(Number(dependentsCount) || 0));
    if (!/^[\d\s+\-*/().]+$/.test(safe)) return 0;
    // eslint-disable-next-line no-new-func
    const result = Number(Function('"use strict"; return (' + safe + ')')());
    return isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/** Recompute all computed line items and totals. */
function recompute(items, baseSalary, dependentsCount) {
  return items.map((item) => {
    if (item.isComputed && item.formula) {
      const monthly = evalFormula(item.formula, baseSalary, dependentsCount);
      return { ...item, monthly, annual: monthly * 12 };
    }
    return { ...item, annual: item.annual || item.monthly * 12 };
  });
}

function fmtNumber(val) {
  return Number(val || 0).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getUserEmail() {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.email || '';
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResourceCalculationFormView({ id }) {
  const router = useRouter();
  const isEdit = Boolean(id);

  // ── Remote data ──────────────────────────────────────────────────────────
  const {
    data: rcData,
    isLoading: rcLoading,
    mutate: mutateRC,
  } = useSWR(isEdit ? `profile/resource-calculations/${id}` : null, () =>
    getResourceCalculation(id)
  );
  const [iotaOffice, setIotaOffice] = useState('KSA');
  const { data: tplData } = useSWR(['profile/rc-templates', iotaOffice], () =>
    getResourceCalculationTemplates(iotaOffice)
  );
  const { data: jdListData } = useSWR('profile/jd', listJobDescriptions);
  const { data: candidatesData } = useSWR('profile/candidates', listCandidates);
  const { data: customersData } = useSWR('customers', getCustomers);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [jdId, setJdId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [nationality, setNationality] = useState('');
  const [insurancePremiumFactor, setInsurancePremiumFactor] = useState(1.0);
  const [dependentsCount, setDependentsCount] = useState(0);
  const [baseSalary, setBaseSalary] = useState(0);
  const [currency, setCurrency] = useState('SAR');
  const [lineItems, setLineItems] = useState([]);
  const [status, setStatus] = useState('draft');
  const [resumeUrl, setResumeUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // ── Approval workflow state ───────────────────────────────────────────────
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState('');

  // ── Resume upload state ───────────────────────────────────────────────────
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState('');

  // ── Refs so callbacks always see the latest baseSalary / dependentsCount ─
  const baseSalaryRef = useRef(baseSalary);
  const dependentsCountRef = useRef(dependentsCount);
  useEffect(() => {
    baseSalaryRef.current = baseSalary;
  }, [baseSalary]);
  useEffect(() => {
    dependentsCountRef.current = dependentsCount;
  }, [dependentsCount]);

  // ── Seed form from existing record ────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || initialized) return;

    const rc = rcData?.data;
    if (!rc) return;
    setTitle(rc.title);
    setJdId(rc.jdId || '');
    setCandidateId(rc.candidateId || '');
    setNationality(rc.nationality);
    setCustomerId(rc.positionCode || '');
    setInsurancePremiumFactor(rc.insurancePremiumFactor);
    setDependentsCount(rc.dependentsCount);
    setBaseSalary(rc.baseSalary);
    setCurrency(rc.currency);
    setLineItems(rc.lineItems || []);
    setStatus(rc.status);
    setResumeUrl(rc.resumeUrl || '');
    setNotes(rc.notes || '');
    const officeFromRecord = rc.iotaOffice || (rc.currency === 'INR' ? 'India' : 'KSA');
    setIotaOffice(officeFromRecord);
    setInitialized(true);
  }, [isEdit, rcData, initialized]);

  // ── Seed/refresh create-mode templates when country changes ───────────────
  useEffect(() => {
    if (isEdit) return;
    const items = tplData?.items;
    if (!items) return;

    const countryMeta =
      IOTA_OFFICE_OPTIONS.find((c) => c.value === iotaOffice) || IOTA_OFFICE_OPTIONS[0];

    setCurrency(countryMeta.currency);
    setLineItems(
      recompute(items, Number(baseSalaryRef.current) || 0, Number(dependentsCountRef.current) || 0)
    );
    if (!initialized) setInitialized(true);
  }, [isEdit, tplData, iotaOffice, initialized]);

  // ── Auto-recompute formula items when baseSalary changes ─────────────────
  // On new forms, if templates are loaded but line items haven't been seeded yet with
  // a real salary, we seed them now so all computed rows populate immediately.
  const handleBaseSalaryChange = (val) => {
    const num = Number(String(val).replace(/,/g, '')) || 0;
    setBaseSalary(num);
    setLineItems((prev) => {
      const seeded = prev.map((item) => {
        if (item.category === 'salary') {
          return { ...item, monthly: num, annual: num * 12 };
        }
        // Editable items with formulas (e.g. End of Service) auto-fill from salary
        if (
          !item.isComputed &&
          item.isEditable &&
          item.formula &&
          item.formula.includes('baseSalary')
        ) {
          const monthly = evalFormula(item.formula, num, Number(dependentsCount) || 0);
          return { ...item, monthly, annual: monthly * 12 };
        }
        return item;
      });
      return recompute(seeded, num, Number(dependentsCount) || 0);
    });
  };

  const handleDependentsCountChange = (val) => {
    const num = Number(val) || 0;
    setDependentsCount(num);
    setLineItems((prev) => recompute(prev, baseSalary, num));
  };

  const handleIotaOfficeChange = (nextOffice) => {
    setIotaOffice(nextOffice);
    const countryMeta = IOTA_OFFICE_OPTIONS.find((c) => c.value === nextOffice);
    if (countryMeta) {
      setCurrency(countryMeta.currency);
    }
  };

  // ── Line-item helpers ─────────────────────────────────────────────────────
  const handleLineItemChange = useCallback((idx, field, val, category) => {
    if (field === 'monthly' && category === 'salary') {
      // Salary row edited directly — sync top field and recompute
      const num = Number(String(val).replace(/,/g, '')) || 0;
      setBaseSalary(num);
      setLineItems((prev) => {
        const seeded = prev.map((item, i) =>
          i === idx ? { ...item, monthly: num, annual: num * 12 } : item
        );
        return recompute(seeded, num, dependentsCountRef.current);
      });
      return;
    }
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: val };
      if (field === 'monthly') {
        item.annual = Number(String(val).replace(/,/g, '')) * 12;
      }
      updated[idx] = item;
      return updated;
    });
  }, []);

  const handleAddLineItem = () => {
    const now = Date.now();
    const newId = '4682572' + String(Math.floor(now / 1000) % 1000).padStart(3, '0');
    setLineItems((prev) => [
      ...prev,
      {
        id: newId,
        label: 'Custom Item',
        category: 'custom',
        monthly: 0,
        annual: 0,
        isComputed: false,
        formula: '',
        order: prev.length + 1,
        isActive: true,
        isEditable: true,
      },
    ]);
  };

  const handleRemoveLineItem = (idx) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Resume file upload ────────────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    setResumeUploadError('');
    try {
      const userEmail = getUserEmail();
      const result = await uploadResume(file, userEmail);
      if (result?.data?.fileUrl) {
        setResumeUrl(result.data.fileUrl);
        if (!candidateId && result.data.id) {
          setCandidateId(result.data.id);
        }
      }
    } catch (err) {
      setResumeUploadError(err.response?.data?.message || err.message || 'Resume upload failed');
    } finally {
      setResumeUploading(false);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const activeItems = lineItems.filter((i) => i.isActive);
  const totalMonthly = activeItems.reduce((s, i) => s + (Number(i.monthly) || 0), 0);
  const totalAnnual = activeItems.reduce(
    (s, i) => s + (Number(i.annual) || i.monthly * 12 || 0),
    0
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!nationality.trim()) {
      setError('Nationality is required');
      return;
    }

    setSaving(true);
    try {
      // Resolve customer name from id for positionCode storage
      const selectedCustomer = customerList.find((c) => String(c.id) === String(customerId));
      const customerDisplayName =
        selectedCustomer?.customerNameEn || selectedCustomer?.customerNameAr || customerId || '';
      const payload = {
        title: title.trim(),
        jdId: jdId || undefined,
        candidateId: candidateId || undefined,
        iotaOffice,
        nationality: nationality.trim(),
        positionCode: String(customerDisplayName),
        insurancePremiumFactor: Number(insurancePremiumFactor) || 1,
        dependentsCount: Number(dependentsCount) || 0,
        baseSalary: Number(baseSalary) || 0,
        currency,
        lineItems,
        status,
        resumeUrl,
        notes,
        createdBy: getUserEmail(),
      };

      if (isEdit) {
        await updateResourceCalculation(id, payload);
        mutateRC();
      } else {
        const result = await createResourceCalculation(payload);
        const newId = result?.data?.id;
        if (newId) {
          // Auto-submit for approval on create
          submitRCForApproval(newId).catch(console.error);
          router.push(paths.dashboard.profile.resourceCalculation.details(newId));
        } else {
          router.push(paths.dashboard.profile.resourceCalculation.root);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Approval workflow handlers ─────────────────────────────────────────────
  const handleSubmitForApproval = async () => {
    setSubmittingForApproval(true);
    try {
      await submitRCForApproval(id);
      await mutateRC();
      setStatus('submitted');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const handleForward = async () => {
    if (!forwardEmail.trim()) return;
    setForwarding(true);
    try {
      await forwardRC(id, {
        toEmail: forwardEmail.trim(),
        fromEmail: getUserEmail(),
        notes: forwardNotes.trim() || undefined,
      });
      await mutateRC();
      setForwardDialogOpen(false);
      setForwardEmail('');
      setForwardNotes('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Forward failed');
    } finally {
      setForwarding(false);
    }
  };

  const handleApproveReject = async (decision) => {
    setApprovalActionLoading(decision);
    try {
      await approveRC(id, { approverEmail: getUserEmail(), decision });
      await mutateRC();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setApprovalActionLoading('');
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isEdit && rcLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  const jdList = jdListData?.data || [];
  const candidateList = candidatesData?.data || [];
  const customerList = Array.isArray(customersData)
    ? customersData
    : customersData?.customers || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => router.push(paths.dashboard.profile.resourceCalculation.root)}>
            <Iconify icon="eva:arrow-back-fill" />
          </IconButton>
          <Typography variant="h4">
            {isEdit ? 'Edit Resource Calculation' : 'New Resource Calculation'}
          </Typography>
        </Stack>
        {isEdit && (
          <Chip
            label={status}
            color={STATUS_COLORS[status] || 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Left column: metadata ─────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
              Proposal Details
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Egyptian National – 2.1 Insurance – RB"
                fullWidth
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Nationality</InputLabel>
                <Select
                  value={nationality}
                  label="Nationality"
                  onChange={(e) => setNationality(e.target.value)}
                >
                  <MenuItem value="">— Select —</MenuItem>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>IOTA Office</InputLabel>
                <Select
                  value={iotaOffice}
                  label="IOTA Office"
                  onChange={(e) => handleIotaOfficeChange(e.target.value)}
                >
                  {IOTA_OFFICE_OPTIONS.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerId}
                  label="Customer"
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {customerList.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.customerNameEn || c.customerNameAr || String(c.id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Bupa Insurance Premium Factor"
                type="number"
                value={insurancePremiumFactor}
                onChange={(e) => setInsurancePremiumFactor(e.target.value)}
                inputProps={{ step: 0.1, min: 1 }}
                helperText="e.g. 2.1 for Bupa Premium 2.1 plan"
                fullWidth
              />

              <TextField
                label="Dependents Count"
                type="number"
                value={dependentsCount}
                onChange={(e) => handleDependentsCountChange(e.target.value)}
                inputProps={{ step: 1, min: 0 }}
                helperText="Included in insurance & ticket calculations"
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Linked Job Description</InputLabel>
                <Select
                  value={jdId}
                  label="Linked Job Description"
                  onChange={(e) => setJdId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {jdList.map((jd) => (
                    <MenuItem key={jd.id} value={jd.id}>
                      {jd.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Linked Candidate</InputLabel>
                <Select
                  value={candidateId}
                  label="Linked Candidate"
                  onChange={(e) => setCandidateId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {candidateList.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `(${c.email})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Resume attachment */}
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  Attach Resume (optional — uploads to OneDrive)
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={
                      resumeUploading ? (
                        <CircularProgress size={14} />
                      ) : (
                        <Iconify icon="solar:upload-bold" />
                      )
                    }
                    disabled={resumeUploading}
                  >
                    Upload Resume
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.docx,.doc"
                      onChange={handleResumeUpload}
                    />
                  </Button>
                  {resumeUrl && (
                    <Typography
                      component="a"
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      color="primary"
                    >
                      View
                    </Typography>
                  )}
                </Stack>
                {resumeUploadError && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {resumeUploadError}
                  </Typography>
                )}
              </Box>

              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />

              {isEdit && (
                <TextField
                  label="Calculation ID"
                  value={id}
                  InputProps={{ readOnly: true }}
                  size="small"
                  fullWidth
                  sx={{ fontFamily: 'monospace' }}
                />
              )}
            </Stack>
          </Card>
        </Grid>

        {/* ── Right column: cost breakdown table ───────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            {/* Proposal preview header — mirrors the image */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {title || 'Resource Calculation'}
                </Typography>
                {(nationality || customerId) && (
                  <Typography variant="caption" color="text.secondary">
                    {[
                      nationality,
                      (() => {
                        const c = customerList.find((cu) => String(cu.id) === String(customerId));
                        return c?.customerNameEn || c?.customerNameAr || customerId || null;
                      })(),
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                    {Number(insurancePremiumFactor) > 1 ? ` — Bupa ${insurancePremiumFactor}` : ''}
                    {Number(dependentsCount) > 0 ? ` — ${dependentsCount} dependents` : ''}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleAddLineItem}
              >
                Add Line
              </Button>
            </Stack>

            {/* Base salary — top-level input */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Base Monthly Salary"
                type="text"
                inputMode="numeric"
                value={Number(baseSalary || 0).toLocaleString('en-SA')}
                onChange={(e) => handleBaseSalaryChange(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                inputProps={{ style: { textAlign: 'right' } }}
                size="small"
                sx={{ width: 280 }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>
                      Employee Calculation
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Monthly
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Annual
                    </TableCell>
                    <TableCell sx={{ width: 32 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <TextField
                            value={resolveLabel(
                              item.label,
                              insurancePremiumFactor,
                              dependentsCount
                            )}
                            onChange={(e) =>
                              handleLineItemChange(idx, 'label', e.target.value, item.category)
                            }
                            size="small"
                            variant="standard"
                            InputProps={{
                              disableUnderline: !item.isEditable,
                              readOnly: !item.isEditable,
                            }}
                            sx={{ '& input': { fontSize: 13 } }}
                          />
                          <Chip
                            label={CATEGORY_LABELS[item.category] || item.category}
                            size="small"
                            variant="outlined"
                            sx={{ width: 'fit-content', height: 18, fontSize: 10 }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {item.isComputed && !item.isEditable ? (
                          <Typography variant="body2" fontWeight={500}>
                            {fmtNumber(item.monthly)}
                          </Typography>
                        ) : (
                          <TextField
                            type="text"
                            inputMode="numeric"
                            value={Number(item.monthly || 0).toLocaleString('en-SA')}
                            onChange={(e) => {
                              const raw = Number(String(e.target.value).replace(/,/g, '')) || 0;
                              handleLineItemChange(idx, 'monthly', raw, item.category);
                            }}
                            size="small"
                            variant="standard"
                            inputProps={{ style: { textAlign: 'right' } }}
                            sx={{ width: 120 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {fmtNumber(item.annual || item.monthly * 12)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0} alignItems="center">
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={item.isActive}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    idx,
                                    'isActive',
                                    e.target.checked,
                                    item.category
                                  )
                                }
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLineItem(idx)}
                            disabled={item.category === 'salary'}
                          >
                            <Iconify icon="solar:trash-bin-minimalistic-bold" width={14} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        12 Monthly Billing
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmtNumber(totalMonthly)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmtNumber(totalAnnual)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => router.push(paths.dashboard.profile.resourceCalculation.root)}
                disabled={saving}
              >
                Cancel
              </Button>
              {isEdit && status === 'draft' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleSubmitForApproval}
                  disabled={submittingForApproval}
                  startIcon={
                    submittingForApproval ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Iconify icon="solar:send-bold" />
                    )
                  }
                >
                  Submit for Approval
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={
                  saving ? <CircularProgress size={16} /> : <Iconify icon="mingcute:save-line" />
                }
              >
                {isEdit ? 'Save Changes' : 'Create & Submit for Approval'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ── Quotation Summary Section ─────────────────────────────────────── */}
      {(() => {
        const countryMeta =
          IOTA_OFFICE_OPTIONS.find((c) => c.value === iotaOffice) || IOTA_OFFICE_OPTIONS[0];
        const VAT_RATE = countryMeta.taxRate;
        const TAX_LABEL = countryMeta.taxLabel;
        const subtotal = totalAnnual;
        const vatAmount = subtotal * VAT_RATE;
        const grandTotal = subtotal + vatAmount;

        // Build description bullets from active line items
        const insuranceItems = activeItems.filter((i) => i.category === 'insurance');
        const hasEOS = activeItems.some(
          (i) => i.category === 'statutory' && i.label.toLowerCase().includes('end of service')
        );
        const hasStandardBenefits = activeItems.some(
          (i) =>
            (i.category === 'statutory' && !i.label.toLowerCase().includes('end of service')) ||
            i.category === 'service'
        );
        const hasTravel = activeItems.some(
          (i) => i.category === 'government' && i.label.toLowerCase().includes('ticket')
        );
        const otherGovtItems = activeItems.filter(
          (i) => i.category === 'government' && !i.label.toLowerCase().includes('ticket')
        );

        const customerObj = customerList.find((cu) => String(cu.id) === String(customerId));
        const customerName = customerObj?.customerNameEn || customerObj?.customerNameAr || '';

        return (
          <Card sx={{ mt: 3, overflow: 'hidden' }}>
            {/* Card header */}
            <Box
              sx={{
                backgroundColor: '#0B5E41',
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="subtitle1" color="white" fontWeight={700} letterSpacing={0.5}>
                Quotation Summary
              </Typography>
              {customerName && (
                <Typography variant="caption" color="rgba(255,255,255,0.75)">
                  {customerName}
                </Typography>
              )}
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#E8F3EF' }}>
                    <TableCell
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        width: '52%',
                        borderBottom: 'none',
                        py: 1.5,
                      }}
                    >
                      Description
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: '24%',
                        borderBottom: 'none',
                        lineHeight: 1.4,
                        py: 1.5,
                      }}
                    >
                      Monthly Charges
                      <br />
                      (Excl. {TAX_LABEL})
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: '#111111',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: '24%',
                        borderBottom: 'none',
                        lineHeight: 1.4,
                        py: 1.5,
                      }}
                    >
                      Annual Charges
                      <br />
                      (12 Months)
                      <br />
                      (Excl. {TAX_LABEL})
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ verticalAlign: 'top', py: 2.5, borderBottom: 'none' }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {nationality ? `${nationality} Employee` : 'Employee'}
                      </Typography>
                      <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0 }}>
                        {Number(dependentsCount) > 0 && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            Family with {dependentsCount} Dependent
                            {Number(dependentsCount) !== 1 ? 's' : ''}
                          </Typography>
                        )}
                        {insuranceItems.map((item, i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                            {resolveLabel(item.label, insurancePremiumFactor, dependentsCount)}
                          </Typography>
                        ))}
                        {hasStandardBenefits && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            Standard Employee Benefits
                          </Typography>
                        )}
                        {hasEOS && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            End of Service Benefits
                          </Typography>
                        )}
                        {hasTravel && (
                          <Typography component="li" variant="body2" sx={{ mb: 0.3 }}>
                            Annual Travel Benefits
                          </Typography>
                        )}
                        {otherGovtItems.map((item, i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.3 }}>
                            {resolveLabel(item.label, insurancePremiumFactor, dependentsCount)}
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {currency} {fmtNumber(totalMonthly)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ verticalAlign: 'middle', py: 2.5, borderBottom: 'none' }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {currency} {fmtNumber(totalAnnual)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            {/* Footer: contact note + subtotal/VAT/total */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: 2,
                px: 3,
                py: 2.5,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 340, lineHeight: 1.6 }}
              >
                If you have any questions concerning this quotation,
                <br />
                please contact us at{' '}
                <Box component="strong" sx={{ color: 'text.primary' }}>
                  accounts@iotatechnologies.ai
                </Box>
                .
              </Typography>

              <Stack spacing={0.75} sx={{ minWidth: 300 }}>
                {[
                  { label: 'SUBTOTAL:', value: subtotal },
                  { label: `${TAX_LABEL} (${(VAT_RATE * 100).toFixed(0)}%):`, value: vatAmount },
                  { label: 'OTHERS:', value: 0 },
                ].map(({ label, value }) => (
                  <Stack key={label} direction="row" justifyContent="space-between" spacing={4}>
                    <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {currency} {fmtNumber(value)}
                    </Typography>
                  </Stack>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between" spacing={4}>
                  <Typography variant="body1" fontWeight={800} sx={{ letterSpacing: 0.3 }}>
                    TOTAL:
                  </Typography>
                  <Typography variant="body1" fontWeight={800} color="success.dark">
                    {currency} {fmtNumber(grandTotal)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Card>
        );
      })()}

      {/* ── Approval Workflow Section ─────────────────────────────────────── */}
      {isEdit &&
        (() => {
          const approvals = rcData?.data?.approvals || [];
          const currentUserEmail = getUserEmail();
          const myPending = approvals.find(
            (a) => a.approverEmail === currentUserEmail && a.decision === 'pending'
          );
          return (
            <Card sx={{ p: 3, mt: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Approval Workflow
                </Typography>
                <Stack direction="row" spacing={1}>
                  {myPending && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={approvalActionLoading === 'approved'}
                        onClick={() => handleApproveReject('approved')}
                        startIcon={
                          approvalActionLoading === 'approved' ? (
                            <CircularProgress size={14} />
                          ) : (
                            <Iconify icon="solar:check-circle-bold" />
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={approvalActionLoading === 'rejected'}
                        onClick={() => handleApproveReject('rejected')}
                        startIcon={
                          approvalActionLoading === 'rejected' ? (
                            <CircularProgress size={14} />
                          ) : (
                            <Iconify icon="solar:close-circle-bold" />
                          )
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {(status === 'submitted' || status === 'approved') && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:forward-bold" />}
                      onClick={() => setForwardDialogOpen(true)}
                    >
                      Forward to User
                    </Button>
                  )}
                </Stack>
              </Stack>

              {approvals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No approval activity yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {approvals.map((a, i) => (
                    <Box
                      key={a.id || i}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor:
                          a.decision === 'approved'
                            ? 'success.lighter'
                            : a.decision === 'rejected'
                              ? 'error.lighter'
                              : 'background.neutral',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Chip
                          label={
                            a.type === 'submit'
                              ? 'Submitted'
                              : a.type === 'forward'
                                ? 'Forwarded'
                                : 'Decision'
                          }
                          size="small"
                          color={
                            a.type === 'submit'
                              ? 'info'
                              : a.type === 'forward'
                                ? 'warning'
                                : 'default'
                          }
                          variant="outlined"
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {a.approverEmail}
                        </Typography>
                        <Chip
                          label={a.decision.charAt(0).toUpperCase() + a.decision.slice(1)}
                          size="small"
                          color={
                            a.decision === 'approved'
                              ? 'success'
                              : a.decision === 'rejected'
                                ? 'error'
                                : 'default'
                          }
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {new Date(a.decidedAt || a.createdAt).toLocaleString('en-GB')}
                        </Typography>
                      </Stack>
                      {a.notes && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5, ml: 0.5 }}
                        >
                          {a.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
          );
        })()}

      {/* ── Forward to User Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={forwardDialogOpen}
        onClose={() => setForwardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Forward for Approval</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Recipient Email"
              type="email"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              placeholder="colleague@iotatechnologies.ai"
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Message (optional)"
              value={forwardNotes}
              onChange={(e) => setForwardNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialogOpen(false)} disabled={forwarding}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleForward}
            disabled={forwarding || !forwardEmail.trim()}
            startIcon={
              forwarding ? <CircularProgress size={16} /> : <Iconify icon="solar:send-bold" />
            }
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
