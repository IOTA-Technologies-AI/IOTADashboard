'use client';

import { useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createNda, uploadExternalNdaDocument } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';

// ----------------------------------------------------------------------

export default function NdaNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [documentSource, setDocumentSource] = useState('iota_generated');
  const [partnerSigningMethod, setPartnerSigningMethod] = useState('digital');
  const [uploadedFile, setUploadedFile] = useState(null); // { name, base64 }
  const newDocFileRef = useRef(null);

  const { users: msUsers, loading: msUsersLoading } = useMicrosoftUsers();

  const handleNewDocFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, DOCX and DOC files are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setUploadedFile({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: 'Non-Disclosure Agreement',
      purpose: '',
      partnerCompanyName: '',
      partnerAddress: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      durationYears: 2,
      isPerpetual: false,
      clauses: [],
      iotaSignatories: [{ name: '', email: '', jobTitle: '' }],
      partnerSignatories: [{ name: '', email: '', jobTitle: '' }],
    },
  });

  const {
    fields: iotaFields,
    append: appendIota,
    remove: removeIota,
  } = useFieldArray({ control, name: 'iotaSignatories' });

  const {
    fields: partnerFields,
    append: appendPartner,
    remove: removePartner,
  } = useFieldArray({ control, name: 'partnerSignatories' });

  const {
    fields: clauseFields,
    append: appendClause,
    remove: removeClause,
  } = useFieldArray({ control, name: 'clauses' });

  const isPerpetual = watch('isPerpetual');

  const onSubmit = async (data) => {
    if (documentSource === 'iota_generated') {
      const incompleteIota = data.iotaSignatories?.some((s) => !s.name || !s.email);
      if (incompleteIota) {
        toast.error('Please select all IOTA signatories from the Microsoft user list');
        return;
      }
    }
    if (documentSource === 'external_upload' && !uploadedFile) {
      toast.error('Please upload a document file before creating the NDA');
      return;
    }
    try {
      setSubmitting(true);
      const user =
        typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

      // Step 1: create the NDA record without the file payload (avoids Encore body size limit)
      const nda = await createNda({
        ...data,
        isPerpetual: data.isPerpetual === 'true' || data.isPerpetual === true,
        durationYears: Number(data.durationYears),
        createdBy: user?.email || 'unknown',
        documentSource,
        partnerSigningMethod,
      });

      // Step 2: if an external file was selected, upload it in a separate request
      if (documentSource === 'external_upload' && uploadedFile) {
        await uploadExternalNdaDocument(nda.id, uploadedFile.name, uploadedFile.base64);
      }

      toast.success(`NDA ${nda.ndaNumber} created`);
      router.push(paths.dashboard.hr.ndaManagement.details(nda.id));
    } catch (err) {
      console.error('Failed to create NDA:', err);
      toast.error('Failed to create NDA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New NDA"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'NDA Management', href: paths.dashboard.hr.ndaManagement.root },
          { name: 'New NDA' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* ── Agreement Type ── */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Agreement Type
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Choose whether to generate a new agreement using our template or upload an existing
                document (PDF, DOCX, DOC) from your partner for signing.
              </Typography>
              <ToggleButtonGroup
                value={documentSource}
                exclusive
                onChange={(_, val) => {
                  if (val) setDocumentSource(val);
                }}
                size="small"
              >
                <ToggleButton value="iota_generated">
                  <Iconify icon="solar:document-bold" sx={{ mr: 1 }} />
                  Generate from Template
                </ToggleButton>
                <ToggleButton value="external_upload">
                  <Iconify icon="solar:upload-bold" sx={{ mr: 1 }} />
                  Upload External Document
                </ToggleButton>
              </ToggleButtonGroup>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                Partner Signing Method
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Digital sends the partner a secure signing link by email. Manual means IOTA will
                share the finalized PDF for a wet or offline signature.
              </Typography>
              <ToggleButtonGroup
                value={partnerSigningMethod}
                exclusive
                onChange={(_, val) => {
                  if (val) setPartnerSigningMethod(val);
                }}
                size="small"
              >
                <ToggleButton value="digital">
                  <Iconify icon="solar:letter-bold" sx={{ mr: 1 }} />
                  Digital (Email Link)
                </ToggleButton>
                <ToggleButton value="manual">
                  <Iconify icon="solar:pen-new-round-bold" sx={{ mr: 1 }} />
                  Manual (Wet Signature)
                </ToggleButton>
              </ToggleButtonGroup>

              {documentSource === 'external_upload' && (
                <Box sx={{ mt: 2.5 }}>
                  <input
                    ref={newDocFileRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    style={{ display: 'none' }}
                    onChange={handleNewDocFileChange}
                  />
                  {uploadedFile ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:file-text-bold" sx={{ color: 'primary.main' }} />
                      <Typography variant="body2">{uploadedFile.name}</Typography>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                          setUploadedFile(null);
                          newDocFileRef.current.value = '';
                        }}
                      >
                        Remove
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Button
                        variant="outlined"
                        startIcon={<Iconify icon="solar:upload-bold" />}
                        onClick={() => newDocFileRef.current?.click()}
                      >
                        Select File (PDF / DOCX / DOC)
                      </Button>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        The partner document will be stored securely. You can add IOTA stamp
                        placements and collect signatures on the detail page after creation.
                      </Alert>
                    </Stack>
                  )}
                </Box>
              )}
            </Card>
          </Grid>

          {/* ── Agreement Details ── */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Agreement Details
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Agreement Title"
                  fullWidth
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
                <TextField
                  label="Purpose / Scope (optional)"
                  fullWidth
                  multiline
                  rows={3}
                  {...register('purpose')}
                  placeholder="e.g. Exploration of potential partnership for software development services"
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Partner Details
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Partner Company Name (optional)"
                  fullWidth
                  {...register('partnerCompanyName')}
                />
                <TextField
                  label="Partner Address (optional)"
                  fullWidth
                  {...register('partnerAddress')}
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* ── IOTA Signatories ── */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">IOTA Signatories</Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => appendIota({ name: '', email: '', jobTitle: '' })}
                >
                  Add Signatory
                </Button>
              </Stack>

              <Stack spacing={2}>
                {iotaFields.map((field, i) => {
                  const watchedEmail = watch(`iotaSignatories.${i}.email`);
                  const selectedUser = msUsers.find((u) => u.email === watchedEmail) || null;
                  return (
                    <Box key={field.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Autocomplete
                          options={msUsers}
                          loading={msUsersLoading}
                          getOptionLabel={(opt) => opt?.name || ''}
                          isOptionEqualToValue={(opt, val) => opt?.email === val?.email}
                          value={selectedUser}
                          onChange={(_, selected) => {
                            setValue(`iotaSignatories.${i}.name`, selected?.name || '', {
                              shouldValidate: true,
                            });
                            setValue(`iotaSignatories.${i}.email`, selected?.email || '', {
                              shouldValidate: true,
                            });
                            setValue(`iotaSignatories.${i}.jobTitle`, selected?.role || '');
                          }}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              key={option.email}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
                            >
                              <Avatar sx={{ width: 30, height: 30, fontSize: 13 }}>
                                {option.name?.[0]?.toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {option.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.email}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select IOTA Signatory"
                              size="small"
                              fullWidth
                              error={!!errors.iotaSignatories?.[i]?.email}
                              helperText={errors.iotaSignatories?.[i]?.email?.message}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {msUsersLoading ? <CircularProgress size={16} /> : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                        {selectedUser && (
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}
                          >
                            <Chip
                              label={selectedUser.email}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 11 }}
                            />
                            {selectedUser.role && (
                              <Chip
                                label={selectedUser.role}
                                size="small"
                                color="default"
                                sx={{ fontSize: 11 }}
                              />
                            )}
                          </Stack>
                        )}
                      </Box>
                      {iotaFields.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeIota(i)}
                          sx={{ mt: 0.5 }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* ── Partner Signatories ── */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">Partner Signatories</Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => appendPartner({ name: '', email: '', jobTitle: '' })}
                >
                  Add Signatory
                </Button>
              </Stack>

              <Stack spacing={2}>
                {partnerFields.map((field, i) => (
                  <Box key={field.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Grid container spacing={1} sx={{ flex: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          size="small"
                          {...register(`partnerSignatories.${i}.name`)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Email"
                          fullWidth
                          size="small"
                          type="email"
                          {...register(`partnerSignatories.${i}.email`)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Job Title"
                          fullWidth
                          size="small"
                          {...register(`partnerSignatories.${i}.jobTitle`)}
                        />
                      </Grid>
                    </Grid>
                    {partnerFields.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removePartner(i)}
                        sx={{ mt: 0.5 }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* ── Additional Clauses ── */}
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1">Additional Clauses</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Optional custom provisions specific to this NDA
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => appendClause({ title: '', content: '' })}
                >
                  Add Clause
                </Button>
              </Stack>

              {clauseFields.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No additional clauses. Click &quot;Add Clause&quot; to include custom provisions.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {clauseFields.map((field, i) => (
                    <Box
                      key={field.id}
                      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                      >
                        <Typography variant="subtitle2">Clause {i + 1}</Typography>
                        <IconButton size="small" color="error" onClick={() => removeClause(i)}>
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Clause Title"
                          fullWidth
                          size="small"
                          placeholder="e.g. Non-Solicitation, Special Jurisdiction, Exclusivity"
                          {...register(`clauses.${i}.title`, { required: 'Required' })}
                          error={!!errors.clauses?.[i]?.title}
                          helperText={errors.clauses?.[i]?.title?.message}
                        />
                        <TextField
                          label="Clause Content"
                          fullWidth
                          size="small"
                          multiline
                          rows={3}
                          {...register(`clauses.${i}.content`, { required: 'Required' })}
                          error={!!errors.clauses?.[i]?.content}
                          helperText={errors.clauses?.[i]?.content?.message}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid>

          {/* ── Duration sidebar ── */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Duration
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Effective Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register('effectiveDate', { required: 'Required' })}
                  error={!!errors.effectiveDate}
                  helperText={errors.effectiveDate?.message}
                />
                <TextField
                  select
                  label="Duration"
                  fullWidth
                  defaultValue="false"
                  {...register('isPerpetual')}
                >
                  <MenuItem value="false">Fixed term</MenuItem>
                  <MenuItem value="true">Perpetual</MenuItem>
                </TextField>

                {!isPerpetual && (
                  <TextField
                    label="Duration (years)"
                    type="number"
                    fullWidth
                    InputProps={{ inputProps: { min: 1, max: 20 } }}
                    {...register('durationYears', { min: 1 })}
                    helperText="Default: 2 years"
                  />
                )}
              </Stack>

              <Box sx={{ mt: 4 }}>
                <LoadingButton type="submit" variant="contained" fullWidth loading={submitting}>
                  Create NDA
                </LoadingButton>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </form>
    </DashboardContent>
  );
}
