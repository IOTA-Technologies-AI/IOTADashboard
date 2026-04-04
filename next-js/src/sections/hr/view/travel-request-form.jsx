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

import { getEmployees, uploadDocument, createTravelRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

const TRAVEL_REQUEST_TYPES = ['Annual Travel Ticket', 'Family Travel Ticket'];

const TravelRequestSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  requestType: z.string().min(1, { message: 'Request type is required!' }),
  travelDestination: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  numberOfTravelers: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
});

export function TravelRequestForm() {
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
      travelDestination: '',
      departureDate: '',
      returnDate: '',
      numberOfTravelers: 1,
      notes: '',
    }),
    []
  );

  const methods = useForm({ resolver: zodResolver(TravelRequestSchema), defaultValues });

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
          folder: 'travel-requests',
        });
        attachmentUrl = upload.url;
        setUploading(false);
      }
      await createTravelRequest({ ...data, attachmentUrl });
      toast.success('Travel ticket request submitted!');
      router.push(paths.dashboard.hr.employeeRequests.travel.root);
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

              <Field.Select name="requestType" label="Request Type">
                {TRAVEL_REQUEST_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text name="travelDestination" label="Travel Destination" />

              <Field.Text
                name="numberOfTravelers"
                label="Number of Travelers"
                type="number"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field.Text
                name="departureDate"
                label="Departure Date"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field.Text
                name="returnDate"
                label="Return Date"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <Field.Text name="notes" label="Notes" multiline rows={3} sx={{ mt: 2 }} />

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
