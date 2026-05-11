'use client';

import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';

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
} from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['draft', 'submitted', 'approved', 'rejected'];

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
  const { data: rcData, isLoading: rcLoading } = useSWR(
    isEdit ? `profile/resource-calculations/${id}` : null,
    () => getResourceCalculation(id)
  );
  const { data: tplData } = useSWR('profile/rc-templates', getResourceCalculationTemplates);
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

  // ── Resume upload state ───────────────────────────────────────────────────
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState('');

  // ── Seed form from existing record or from templates ─────────────────────
  useEffect(() => {
    if (initialized) return;

    if (isEdit) {
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
      setInitialized(true);
    } else {
      const items = tplData?.items;
      if (!items) return;
      setLineItems(items);
      setInitialized(true);
    }
  }, [isEdit, rcData, tplData, initialized]);

  // ── Auto-recompute formula items when baseSalary changes ─────────────────
  // On new forms, if templates are loaded but line items haven't been seeded yet with
  // a real salary, we seed them now so all computed rows populate immediately.
  const handleBaseSalaryChange = (val) => {
    const num = Number(val) || 0;
    setBaseSalary(num);
    setLineItems((prev) => {
      // Seed salary line item value
      const withSalary = prev.map((item) =>
        item.category === 'salary' ? { ...item, monthly: num, annual: num * 12 } : item
      );
      return recompute(withSalary, num, Number(dependentsCount) || 0);
    });
  };

  const handleDependentsCountChange = (val) => {
    const num = Number(val) || 0;
    setDependentsCount(num);
    setLineItems((prev) => recompute(prev, baseSalary, num));
  };

  // ── Line-item helpers ─────────────────────────────────────────────────────
  const handleLineItemChange = useCallback((idx, field, val) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: val };
      if (field === 'monthly') {
        item.annual = Number(val) * 12;
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
      const customers = customersData || [];
      const selectedCustomer = customers.find((c) => c.id === customerId || c.name === customerId);
      const payload = {
        title: title.trim(),
        jdId: jdId || undefined,
        candidateId: candidateId || undefined,
        nationality: nationality.trim(),
        positionCode: selectedCustomer?.name || customerId || '',
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
      } else {
        await createResourceCalculation(payload);
      }
      router.push(paths.dashboard.profile.resourceCalculation.root);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
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

              <TextField
                label="Nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Egyptian"
                fullWidth
                required
              />

              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerId}
                  label="Customer"
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {customerList.map((c) => (
                    <MenuItem key={c.id || c.name} value={c.id || c.name}>
                      {c.name}
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
                      customerList.find((c) => (c.id || c.name) === customerId)?.name || customerId,
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
                type="number"
                value={baseSalary}
                onChange={(e) => handleBaseSalaryChange(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                inputProps={{ step: 100, min: 0 }}
                size="small"
                sx={{ width: 260 }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>Expenses</TableCell>
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
                            onChange={(e) => handleLineItemChange(idx, 'label', e.target.value)}
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
                        {item.isComputed ? (
                          <Typography variant="body2" fontWeight={500}>
                            {fmtNumber(item.monthly)}
                          </Typography>
                        ) : (
                          <TextField
                            type="number"
                            value={item.monthly}
                            onChange={(e) =>
                              handleLineItemChange(idx, 'monthly', Number(e.target.value))
                            }
                            size="small"
                            variant="standard"
                            inputProps={{ step: 100, min: 0, style: { textAlign: 'right' } }}
                            sx={{ width: 110 }}
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
                                  handleLineItemChange(idx, 'isActive', e.target.checked)
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

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => router.push(paths.dashboard.profile.resourceCalculation.root)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={
                  saving ? <CircularProgress size={16} /> : <Iconify icon="mingcute:save-line" />
                }
              >
                {isEdit ? 'Save Changes' : 'Create Calculation'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
