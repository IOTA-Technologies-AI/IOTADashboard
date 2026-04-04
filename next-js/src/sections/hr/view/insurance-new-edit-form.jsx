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

import {
  getEmployees,
  uploadDocument,
  createInsuranceRecord,
  updateInsuranceRecord,
  listInsuranceProviders,
} from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

const InsuranceSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  policyNumber: z.string().min(1, { message: 'Policy number is required!' }),
  providerId: z.coerce.number().optional(),
  policyClass: z.enum(['VIP', 'A', 'B', 'C']),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  networkCoverageDetails: z.string().optional(),
  status: z.enum(['active', 'expired', 'pending_renewal', 'cancelled']),
  notes: z.string().optional(),
});

export function InsuranceNewEditForm({ currentRecord }) {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [providers, setProviders] = useState([]);
  const [insuranceCardFile, setInsuranceCardFile] = useState(null);
  const [policyDocFile, setPolicyDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const insuranceCardRef = useRef(null);
  const policyDocRef = useRef(null);

  useEffect(() => {
    Promise.all([getEmployees(), listInsuranceProviders(true)]).then(([emps, provs]) => {
      setEmployees(emps || []);
      setProviders(provs || []);
    });
  }, []);

  const defaultValues = useMemo(
    () => ({
      employeeId: currentRecord?.employeeId || '',
      policyNumber: currentRecord?.policyNumber || '',
      providerId: currentRecord?.providerId || '',
      policyClass: currentRecord?.policyClass || 'A',
      startDate: currentRecord?.startDate || '',
      expiryDate: currentRecord?.expiryDate || '',
      networkCoverageDetails: currentRecord?.networkCoverageDetails || '',
      status: currentRecord?.status || 'active',
      notes: currentRecord?.notes || '',
    }),
    [currentRecord]
  );

  const methods = useForm({
    resolver: zodResolver(InsuranceSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentRecord) reset(defaultValues);
  }, [currentRecord, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setUploading(true);

      let insuranceCardUrl = currentRecord?.insuranceCardUrl;
      let policyDocumentUrl = currentRecord?.policyDocumentUrl;

      if (insuranceCardFile) {
        const base64 = await fileToBase64(insuranceCardFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: insuranceCardFile.name,
          mimeType: insuranceCardFile.type,
          folder: 'insurance-cards',
        });
        insuranceCardUrl = upload.url;
      }

      if (policyDocFile) {
        const base64 = await fileToBase64(policyDocFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: policyDocFile.name,
          mimeType: policyDocFile.type,
          folder: 'insurance-policies',
        });
        policyDocumentUrl = upload.url;
      }

      setUploading(false);

      const payload = { ...data, insuranceCardUrl, policyDocumentUrl };

      if (currentRecord?.id) {
        await updateInsuranceRecord(currentRecord.id, payload);
        toast.success('Insurance record updated!');
      } else {
        await createInsuranceRecord(payload);
        toast.success('Insurance record created!');
      }
      router.push(paths.dashboard.hr.insurance.root);
    } catch {
      setUploading(false);
      toast.error('Something went wrong.');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <Field.Select name="employeeId" label="Employee">
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()} ({e.employeeId})
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text name="policyNumber" label="Policy Number" />

              <Field.Select name="providerId" label="Provider (optional)">
                <MenuItem value="">— None —</MenuItem>
                {providers.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Select name="policyClass" label="Policy Class">
                {['VIP', 'A', 'B', 'C'].map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.DatePicker name="startDate" label="Start Date" />
              <Field.DatePicker name="expiryDate" label="Expiry Date" />

              <Field.Select name="status" label="Status">
                {['active', 'expired', 'pending_renewal', 'cancelled'].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>

            <Field.Text
              name="networkCoverageDetails"
              label="Network Coverage Details"
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
            <Field.Text name="notes" label="Notes" multiline rows={3} sx={{ mt: 2 }} />

            {/* Insurance Card Upload */}
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Insurance Card (optional)</Typography>
              <input
                type="file"
                ref={insuranceCardRef}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => setInsuranceCardFile(e.target.files?.[0] ?? null)}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="mingcute:upload-line" />}
                  onClick={() => insuranceCardRef.current?.click()}
                >
                  Choose File
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {insuranceCardFile
                    ? insuranceCardFile.name
                    : currentRecord?.insuranceCardUrl
                      ? 'Existing file uploaded'
                      : 'No file chosen'}
                </Typography>
              </Stack>
            </Stack>

            {/* Policy Document Upload */}
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Policy Document (optional)</Typography>
              <input
                type="file"
                ref={policyDocRef}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => setPolicyDocFile(e.target.files?.[0] ?? null)}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="mingcute:upload-line" />}
                  onClick={() => policyDocRef.current?.click()}
                >
                  Choose File
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {policyDocFile
                    ? policyDocFile.name
                    : currentRecord?.policyDocumentUrl
                      ? 'Existing file uploaded'
                      : 'No file chosen'}
                </Typography>
              </Stack>
            </Stack>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting || uploading}>
                {currentRecord ? 'Save Changes' : 'Create Record'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
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
