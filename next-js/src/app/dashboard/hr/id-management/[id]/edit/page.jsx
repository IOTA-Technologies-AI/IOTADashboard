'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { uploadDocument, updateEmployeeId, getEmployeeIdRecord } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const IdRecordSchema = z.object({
  iqamaNumber: z.string().optional(),
  iqamaStatus: z.enum(['active', 'expired', 'under_renewal', 'cancelled']).optional(),
  iqamaExpiryDate: z.string().optional(),
  visaIssueDate: z.string().optional(),
  visaExpiryDate: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  emiratesId: z.string().optional(),
  emiratesIdExpiryDate: z.string().optional(),
  nationality: z.string().optional(),
  country: z.enum(['KSA', 'UAE', 'OTHER']).optional(),
  // Renewal fee tracking
  renewalFee: z.coerce.number().optional(),
  renewalApprovedBy: z.string().optional(),
  renewalApprovalDate: z.string().optional(),
  // UAE medical/biometric
  medicalRequirementsStatus: z.string().optional(),
  biometricSubmittedDate: z.string().optional(),
  // Visa cancellation/transfer
  visaCancellationDate: z.string().optional(),
  visaTransferDate: z.string().optional(),
  visaTransferStatus: z.string().optional(),
});

export default function IdManagementEditPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [emiratesIdFile, setEmiratesIdFile] = useState(null);
  const [iqamaFile, setIqamaFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const emiratesIdRef = useRef(null);
  const iqamaRef = useRef(null);
  const passportRef = useRef(null);

  useEffect(() => {
    getEmployeeIdRecord(id)
      .then((data) => setEmployee(data.employee))
      .catch((e) => console.error('Failed to load employee ID record:', e));
  }, [id]);

  const defaultValues = useMemo(
    () => ({
      iqamaNumber: employee?.iqamaNumber || '',
      iqamaStatus: employee?.iqamaStatus || 'active',
      iqamaExpiryDate: employee?.iqamaExpiryDate || '',
      visaIssueDate: employee?.visaIssueDate || '',
      visaExpiryDate: employee?.visaExpiryDate || '',
      passportNumber: employee?.passportNumber || '',
      passportExpiryDate: employee?.passportExpiryDate || '',
      emiratesId: employee?.emiratesId || '',
      emiratesIdExpiryDate: employee?.emiratesIdExpiryDate || '',
      nationality: employee?.nationality || '',
      country: employee?.country || 'KSA',
      renewalFee: employee?.renewalFee ?? '',
      renewalApprovedBy: employee?.renewalApprovedBy || '',
      renewalApprovalDate: employee?.renewalApprovalDate || '',
      medicalRequirementsStatus: employee?.medicalRequirementsStatus || '',
      biometricSubmittedDate: employee?.biometricSubmittedDate || '',
      visaCancellationDate: employee?.visaCancellationDate || '',
      visaTransferDate: employee?.visaTransferDate || '',
      visaTransferStatus: employee?.visaTransferStatus || '',
    }),
    [employee]
  );

  const methods = useForm({ resolver: zodResolver(IdRecordSchema), defaultValues });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (employee) reset(defaultValues);
  }, [employee, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setUploading(true);

      let emiratesIdCopyUrl = employee?.emiratesIdCopyUrl;
      let iqamaCopyUrl;
      let passportCopyUrl;

      if (emiratesIdFile) {
        const base64 = await fileToBase64(emiratesIdFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: emiratesIdFile.name,
          mimeType: emiratesIdFile.type,
          folder: 'id-documents',
        });
        emiratesIdCopyUrl = upload.url;
      }

      if (iqamaFile) {
        const base64 = await fileToBase64(iqamaFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: iqamaFile.name,
          mimeType: iqamaFile.type,
          folder: 'id-documents',
        });
        iqamaCopyUrl = upload.url;
      }

      if (passportFile) {
        const base64 = await fileToBase64(passportFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: passportFile.name,
          mimeType: passportFile.type,
          folder: 'id-documents',
        });
        passportCopyUrl = upload.url;
      }

      setUploading(false);

      await updateEmployeeId(id, {
        ...data,
        emiratesIdCopyUrl,
        ...(iqamaCopyUrl && { iqamaCopyUrl }),
        ...(passportCopyUrl && { passportCopyUrl }),
      });

      toast.success('Employee ID record updated!');
      router.push(paths.dashboard.hr.idManagement.details(id));
    } catch {
      setUploading(false);
      toast.error('Something went wrong.');
    }
  });

  if (!employee) return null;

  const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Edit — ${fullName}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'ID Management', href: paths.dashboard.hr.idManagement.root },
          { name: fullName, href: paths.dashboard.hr.idManagement.details(id) },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Select name="country" label="Country">
                  {['KSA', 'UAE', 'OTHER'].map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Text name="nationality" label="Nationality" />
                <Field.Text name="iqamaNumber" label="Iqama Number" />

                <Field.Select name="iqamaStatus" label="Iqama Status">
                  {['active', 'expired', 'under_renewal', 'cancelled'].map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Text
                  name="iqamaExpiryDate"
                  label="Iqama Expiry Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text
                  name="visaIssueDate"
                  label="Visa Issue Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text
                  name="visaExpiryDate"
                  label="Visa Expiry Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text name="passportNumber" label="Passport Number" />
                <Field.Text
                  name="passportExpiryDate"
                  label="Passport Expiry Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text name="emiratesId" label="Emirates ID" />
                <Field.Text
                  name="emiratesIdExpiryDate"
                  label="Emirates ID Expiry"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* Renewal Fee Tracking */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Renewal Fee Tracking
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Text name="renewalFee" label="Renewal Fee (SAR/AED)" type="number" />
                <Field.Text name="renewalApprovedBy" label="Approved By" />
                <Field.Text
                  name="renewalApprovalDate"
                  label="Approval Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* UAE Medical / Biometric */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                UAE Medical & Biometric
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Select name="medicalRequirementsStatus" label="Medical Requirements Status">
                  {['pending', 'completed', 'waived'].map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Text
                  name="biometricSubmittedDate"
                  label="Biometric Submitted Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* Visa Cancellation / Transfer */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Visa Cancellation / Transfer
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Text
                  name="visaCancellationDate"
                  label="Visa Cancellation Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text
                  name="visaTransferDate"
                  label="Visa Transfer Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Select name="visaTransferStatus" label="Visa Transfer Status">
                  {['not_applicable', 'in_progress', 'completed', 'cancelled'].map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Box>

              {/* Iqama Copy */}
              <Stack spacing={1} sx={{ mt: 3 }}>
                <Typography variant="subtitle2">Iqama Copy (optional)</Typography>
                <input
                  type="file"
                  ref={iqamaRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => setIqamaFile(e.target.files?.[0] ?? null)}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="mingcute:upload-line" />}
                    onClick={() => iqamaRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {iqamaFile ? iqamaFile.name : 'No file chosen'}
                  </Typography>
                </Stack>
              </Stack>

              {/* Passport Copy */}
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Passport Copy (optional)</Typography>
                <input
                  type="file"
                  ref={passportRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="mingcute:upload-line" />}
                    onClick={() => passportRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {passportFile
                      ? passportFile.name
                      : employee?.passportCopyUrl
                        ? 'Existing file uploaded'
                        : 'No file chosen'}
                  </Typography>
                </Stack>
              </Stack>

              {/* Emirates ID Copy */}
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Emirates ID Copy (optional)</Typography>
                <input
                  type="file"
                  ref={emiratesIdRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => setEmiratesIdFile(e.target.files?.[0] ?? null)}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="mingcute:upload-line" />}
                    onClick={() => emiratesIdRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {emiratesIdFile
                      ? emiratesIdFile.name
                      : employee?.emiratesIdCopyUrl
                        ? 'Existing file uploaded'
                        : 'No file chosen'}
                  </Typography>
                </Stack>
              </Stack>

              <Stack alignItems="flex-end" sx={{ mt: 3 }}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting || uploading}
                >
                  Save Changes
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>
    </DashboardContent>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
