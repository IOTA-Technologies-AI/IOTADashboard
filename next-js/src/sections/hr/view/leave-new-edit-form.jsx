'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getEmployees, createLeaveRequest, updateLeaveRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

const LeaveSchema = z.object({
  employeeId: z.coerce.number().min(1, { message: 'Employee is required!' }),
  requestNumber: z.string().optional(), // DB generates on create
  leaveType: z.enum(['Annual', 'Sick', 'Emergency', 'Unpaid', 'Maternity', 'Hajj']),
  fromDate: z.string().min(1, { message: 'From date is required!' }),
  toDate: z.string().min(1, { message: 'To date is required!' }),
  daysCount: z.coerce.number().min(1, { message: 'Days must be at least 1!' }),
  reason: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']),
  approvedBy: z.string().optional(),
  approvedDate: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const normalizeDate = (v) => {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  try {
    const d = v instanceof Date ? v : new Date(v);
    return d.toISOString().split('T')[0];
  } catch {
    return String(v);
  }
};

export function LeaveNewEditForm({ currentRequest }) {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);

  const defaultValues = useMemo(
    () => ({
      employeeId: currentRequest?.employeeId || '',
      requestNumber: currentRequest?.requestNumber || '',
      leaveType: currentRequest?.leaveType || 'Annual',
      fromDate: currentRequest?.fromDate || '',
      toDate: currentRequest?.toDate || '',
      daysCount: currentRequest?.daysCount || 1,
      reason: currentRequest?.reason || '',
      status: currentRequest?.status || 'Pending',
      approvedBy: currentRequest?.approvedBy || '',
      approvedDate: currentRequest?.approvedDate || '',
      rejectionReason: currentRequest?.rejectionReason || '',
    }),
    [currentRequest]
  );

  const methods = useForm({
    resolver: zodResolver(LeaveSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  const fromDate = watch('fromDate');
  const toDate = watch('toDate');

  // Load employees for selector
  useEffect(() => {
    getEmployees()
      .then((list) => setEmployees(list || []))
      .catch((e) => {
        console.error('Failed to load employees:', e);
        setEmployees([]);
      });
  }, []);

  // Recompute daysCount when dates change (inclusive)
  useEffect(() => {
    const f = fromDate ? new Date(fromDate) : null;
    const t = toDate ? new Date(toDate) : null;
    if (f && t && !isNaN(f) && !isNaN(t)) {
      const diffMs = t.getTime() - f.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      setValue('daysCount', Math.max(1, days), { shouldDirty: false, shouldValidate: true });
    }
  }, [fromDate, toDate, setValue]);

  useEffect(() => {
    if (currentRequest) {
      reset(defaultValues);
    }
  }, [currentRequest, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        employeeId: Number(data.employeeId),
        leaveType: data.leaveType,
        fromDate: normalizeDate(data.fromDate),
        toDate: normalizeDate(data.toDate),
        daysCount: data.daysCount,
        reason: data.reason?.trim() || undefined,
        status: data.status,
      };

      // Optional approval fields
      if (data.approvedBy?.trim()) payload.approvedBy = data.approvedBy.trim();
      if (data.approvedDate) payload.approvedDate = normalizeDate(data.approvedDate);
      if (data.rejectionReason?.trim()) payload.rejectionReason = data.rejectionReason.trim();

      // requestNumber only on edit (DB generates on create)
      if (currentRequest?.requestNumber) payload.requestNumber = currentRequest.requestNumber;

      if (currentRequest) {
        await updateLeaveRequest(currentRequest.id, payload);
        toast.success('Leave request updated successfully!');
      } else {
        await createLeaveRequest(payload);
        toast.success('Leave request created successfully!');
      }

      router.push(paths.dashboard.hr.leave.root);
    } catch (error) {
      console.error('Error saving leave request:', error);
      toast.error(
        currentRequest ? 'Failed to update leave request' : 'Failed to create leave request'
      );
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Leave Information
              </Typography>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Select name="employeeId" label="Employee" required>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Select name="leaveType" label="Leave Type" required>
                  <MenuItem value="Annual">Annual</MenuItem>
                  <MenuItem value="Sick">Sick</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Maternity">Maternity</MenuItem>
                  <MenuItem value="Hajj">Hajj</MenuItem>
                </Field.Select>

                <Field.DatePicker name="fromDate" label="From Date" required />
                <Field.DatePicker name="toDate" label="To Date" required />
                <Field.Text
                  name="daysCount"
                  label="Days"
                  type="number"
                  required
                  InputProps={{ readOnly: true }}
                />
                <Field.Select name="status" label="Status" required>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Field.Select>

                <Field.Text name="approvedBy" label="Approved By" />
                <Field.DatePicker name="approvedDate" label="Approved Date" />
                <Field.Text name="rejectionReason" label="Rejection Reason" />
              </Box>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Reason
              </Typography>
              <Field.Text name="reason" label="Reason" multiline rows={4} />
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <LoadingButton
                type="submit"
                variant="contained"
                size="large"
                loading={isSubmitting}
                disabled={currentRequest ? !isDirty : false}
              >
                {currentRequest ? 'Update Request' : 'Create Request'}
              </LoadingButton>
              <LoadingButton
                variant="outlined"
                size="large"
                onClick={() => router.push(paths.dashboard.hr.leave.root)}
              >
                Cancel
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
