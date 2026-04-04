'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

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

import { getEmployees, createLetterRequest, uploadDocument } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

const LETTER_REQUEST_TYPES = [
  'Chamber of Commerce Letter',
  'Salary Certificate',
  'Experience Letter',
  'Employment Verification Letter',
  'Bank Letter',
  'Other',
];

const DELIVERY_METHODS = [
  { label: 'Email', value: 'email' },
  { label: 'Hard Copy', value: 'hard_copy' },
  { label: 'Both', value: 'both' },
];

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Arabic', value: 'Arabic' },
  { label: 'Both', value: 'Both' },
];

const LetterRequestSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  requestType: z.string().min(1, { message: 'Letter type is required!' }),
  purposeOfLetter: z.string().optional(),
  addressedTo: z.string().optional(),
  deliveryMethod: z.string().optional(),
  numberOfCopies: z.coerce.number().min(1).optional(),
  languageRequired: z.string().optional(),
  notes: z.string().optional(),
});

export function LetterRequestForm() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getEmployees()
      .then((emps) => setEmployees(emps || []))
      .catch((e) => console.error('Failed to load employees:', e));
  }, []);

  const defaultValues = useMemo(
    () => ({
      employeeId: '',
      requestType: '',
      purposeOfLetter: '',
      addressedTo: '',
      deliveryMethod: 'email',
      numberOfCopies: 1,
      languageRequired: 'English',
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(LetterRequestSchema), defaultValues });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      let attachmentUrl;
      if (selectedFile) {
        setUploading(true);
        const base64 = await fileToBase64(selectedFile);
        const upload = await uploadDocument({
          fileBase64: base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          folder: 'letter-requests',
        });
        attachmentUrl = upload.url;
        setUploading(false);
      }
      await createLetterRequest({ ...data, attachmentUrl });
      toast.success('Letter request submitted!');
      router.push(paths.dashboard.hr.employeeRequests.letter.root);
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

              <Field.Select name="requestType" label="Letter Type">
                {LETTER_REQUEST_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text name="addressedTo" label="Addressed To" />

              <Field.Select name="deliveryMethod" label="Delivery Method">
                {DELIVERY_METHODS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text
                name="numberOfCopies"
                label="Number of Copies"
                type="number"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field.Select name="languageRequired" label="Language Required">
                {LANGUAGES.map((l) => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>

            <Field.Text
              name="purposeOfLetter"
              label="Purpose of Letter"
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />

            <Field.Text name="notes" label="Additional Notes" multiline rows={3} sx={{ mt: 2 }} />

            {/* Attachment Upload */}
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Supporting Document (optional)</Typography>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="mingcute:upload-line" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                {selectedFile && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedFile.name}
                  </Typography>
                )}
              </Stack>
            </Stack>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting || uploading}>
                Submit Request
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
