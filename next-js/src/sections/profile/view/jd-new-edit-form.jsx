'use client';

import useSWR from 'swr';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  getJobDescription,
  createJobDescription,
  updateJobDescription,
  generateJobDescription,
} from 'src/utils/apiHelper';

import { useAuthContext } from 'src/auth/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'remote'];
const STATUSES = ['draft', 'published', 'archived'];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().min(1, 'Department is required'),
  experienceYears: z.coerce.number().min(0),
  location: z.string().min(1, 'Location is required'),
  budgetMin: z.coerce.number().min(0),
  budgetMax: z.coerce.number().min(0),
  employmentType: z.string(),
  status: z.string(),
});

// ----------------------------------------------------------------------

/** Chip-based tag input for skills / certs */
function TagInput({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const tag = input.trim().replace(/,$/, '');
      if (tag && !value.includes(tag)) onChange([...value, tag]);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 48,
          alignItems: 'center',
        }}
      >
        {value.map((tag) => (
          <Chip
            key={tag}
            size="small"
            label={tag}
            onDelete={() => onChange(value.filter((t) => t !== tag))}
          />
        ))}
        <Box
          component="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          sx={{
            border: 'none',
            outline: 'none',
            flexGrow: 1,
            minWidth: 120,
            fontSize: 14,
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Press Enter or comma to add
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function JDNewEditForm({ id }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const isEdit = Boolean(id);

  const { data, isLoading } = useSWR(isEdit ? `profile/jd/${id}` : null, () =>
    getJobDescription(id)
  );

  const existing = data?.data;

  const [mandatorySkills, setMandatorySkills] = useState([]);
  const [optionalSkills, setOptionalSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Generate dialog state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiInputs, setAiInputs] = useState({
    title: '',
    department: '',
    experienceYears: 0,
    employmentType: 'full-time',
    context: '',
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      department: '',
      experienceYears: 0,
      location: '',
      budgetMin: 0,
      budgetMax: 0,
      employmentType: 'full-time',
      status: 'draft',
    },
  });

  // Populate form when editing
  useMemo(() => {
    if (existing && !initialized) {
      reset({
        title: existing.title,
        department: existing.department,
        experienceYears: existing.experienceYears,
        location: existing.location,
        budgetMin: existing.budgetMin,
        budgetMax: existing.budgetMax,
        employmentType: existing.employmentType,
        status: existing.status,
      });
      setMandatorySkills(existing.mandatorySkills || []);
      setOptionalSkills(existing.optionalSkills || []);
      setCertifications(existing.certifications || []);
      setInitialized(true);
    }
  }, [existing, initialized, reset]);

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await generateJobDescription({
        title: aiInputs.title,
        department: aiInputs.department,
        experienceYears: Number(aiInputs.experienceYears),
        employmentType: aiInputs.employmentType,
        context: aiInputs.context || undefined,
      });
      const suggestion = res.data;
      // Pre-fill tag arrays
      setMandatorySkills(suggestion.mandatorySkills || []);
      setOptionalSkills(suggestion.optionalSkills || []);
      setCertifications(suggestion.certifications || []);
      // Pre-fill form fields if the user hasn't typed them yet
      reset((prev) => ({
        ...prev,
        title: prev.title || aiInputs.title,
        department: prev.department || aiInputs.department,
        experienceYears: prev.experienceYears || aiInputs.experienceYears,
        employmentType: aiInputs.employmentType,
        budgetMin: suggestion.budgetMin || prev.budgetMin,
        budgetMax: suggestion.budgetMax || prev.budgetMax,
      }));
      setAiOpen(false);
    } catch (err) {
      setAiError(err?.response?.data?.message || err.message || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        mandatorySkills,
        optionalSkills,
        certifications,
        createdBy: user?.email || '',
      };
      if (isEdit) {
        await updateJobDescription(id, payload);
      } else {
        await createJobDescription(payload);
      }
      router.push(paths.dashboard.profile.jd.root);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button startIcon={<Iconify icon="eva:arrow-back-fill" />} onClick={() => router.back()}>
            Back
          </Button>
          <Typography variant="h4">
            {isEdit ? 'Edit Job Description' : 'New Job Description'}
          </Typography>
        </Stack>
        {!isEdit && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
            onClick={() => setAiOpen(true)}
          >
            Generate with AI
          </Button>
        )}
      </Stack>

      {/* AI Generate Dialog */}
      <Dialog open={aiOpen} onClose={() => setAiOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Job Description with AI</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Provide a few details and AI will suggest skills, certifications, and salary range.
            </Typography>
            {aiError && <Alert severity="error">{aiError}</Alert>}
            <TextField
              fullWidth
              label="Job Title"
              value={aiInputs.title}
              onChange={(e) => setAiInputs((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Department"
              value={aiInputs.department}
              onChange={(e) => setAiInputs((p) => ({ ...p, department: e.target.value }))}
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Years of Experience"
                value={aiInputs.experienceYears}
                onChange={(e) => setAiInputs((p) => ({ ...p, experienceYears: e.target.value }))}
              />
              <TextField
                select
                fullWidth
                label="Employment Type"
                value={aiInputs.employmentType}
                onChange={(e) => setAiInputs((p) => ({ ...p, employmentType: e.target.value }))}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Additional context (optional)"
              placeholder="e.g. startup environment, must have fintech experience, remote-first team…"
              value={aiInputs.context}
              onChange={(e) => setAiInputs((p) => ({ ...p, context: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAiGenerate}
            disabled={aiGenerating || !aiInputs.title || !aiInputs.department}
            startIcon={
              aiGenerating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="solar:magic-stick-3-bold" />
              )
            }
          >
            {aiGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    {...register('title')}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    {...register('department')}
                    error={!!errors.department}
                    helperText={errors.department?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Location"
                    {...register('location')}
                    error={!!errors.location}
                    helperText={errors.location?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Experience Required (years)"
                    {...register('experienceYears')}
                    error={!!errors.experienceYears}
                    helperText={errors.experienceYears?.message}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({ field }) => (
                      <TextField select fullWidth label="Employment Type" {...field}>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                            {t}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Budget Min"
                    {...register('budgetMin')}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Budget Max"
                    {...register('budgetMax')}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <TextField select fullWidth label="Status" {...field}>
                        {STATUSES.map((s) => (
                          <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                            {s}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Skills */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Skills & Requirements
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TagInput
                    label="Mandatory Skills *"
                    value={mandatorySkills}
                    onChange={setMandatorySkills}
                    placeholder="e.g. React, Node.js…"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TagInput
                    label="Optional Skills"
                    value={optionalSkills}
                    onChange={setOptionalSkills}
                    placeholder="e.g. GraphQL, Docker…"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TagInput
                    label="Required Certifications"
                    value={certifications}
                    onChange={setCertifications}
                    placeholder="e.g. AWS Solutions Architect…"
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Submit */}
          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button variant="outlined" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create JD'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </DashboardContent>
  );
}
