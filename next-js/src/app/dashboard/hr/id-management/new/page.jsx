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

import { getEmployees, uploadDocument, updateEmployeeId } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const IdRecordSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
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
  notes: z.string().optional(),
});

export default function IdManagementNewPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [emiratesIdFile, setEmiratesIdFile] = useState(null);
  const [iqamaFile, setIqamaFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const emiratesIdRef = useRef(null);
  const iqamaRef = useRef(null);
  const passportRef = useRef(null);

  useEffect(() => {
    getEmployees()
      .then((emps) => setEmployees(emps || []))
      .catch((e) => console.error('Failed to load employees:', e));
  }, []);

  const defaultValues = useMemo(
    () => ({
      employeeId: '',
      iqamaNumber: '',
      iqamaStatus: 'active',
      iqamaExpiryDate: '',
      visaIssueDate: '',
      visaExpiryDate: '',
      passportNumber: '',
      passportExpiryDate: '',
      emiratesId: '',
      emiratesIdExpiryDate: '',
      nationality: '',
      country: 'KSA',
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(IdRecordSchema), defaultValues });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setUploading(true);

      let emiratesIdCopyUrl;
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

      const { employeeId, ...rest } = data;
      await updateEmployeeId(employeeId, {
        ...rest,
        ...(emiratesIdCopyUrl && { emiratesIdCopyUrl }),
        ...(iqamaCopyUrl && { iqamaCopyUrl }),
        ...(passportCopyUrl && { passportCopyUrl }),
      });

      toast.success('Employee ID record saved!');
      router.push(paths.dashboard.hr.idManagement.root);
    } catch {
      setUploading(false);
      toast.error('Something went wrong.');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New ID Record"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'ID Management', href: paths.dashboard.hr.idManagement.root },
          { name: 'New Record' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                <Field.Select name="employeeId" label="Employee" sx={{ gridColumn: '1 / -1' }}>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()} ({e.employeeId})
                    </MenuItem>
                  ))}
                </Field.Select>

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

              {/* Iqama Copy Upload */}
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
                  {iqamaFile && (
                    <Typography variant="caption" color="text.secondary">
                      {iqamaFile.name}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Passport Copy Upload */}
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
                  {passportFile && (
                    <Typography variant="caption" color="text.secondary">
                      {passportFile.name}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Emirates ID Copy Upload */}
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
                  {emiratesIdFile && (
                    <Typography variant="caption" color="text.secondary">
                      {emiratesIdFile.name}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              <Stack alignItems="flex-end" sx={{ mt: 3 }}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting || uploading}
                >
                  Save Record
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
