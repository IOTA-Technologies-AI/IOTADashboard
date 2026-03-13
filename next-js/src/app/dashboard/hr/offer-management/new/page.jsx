'use client';

import { useForm } from 'react-hook-form';
import { useState, useCallback } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';

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

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { createOffer } from 'src/utils/apiHelper';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { OfferLetterPDF, OfferLetterHTML } from 'src/components/offer-letter';

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

export default function OfferManagementNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [formData, setFormData] = useState(null);

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
              <OfferLetterHTML data={formData} />
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
