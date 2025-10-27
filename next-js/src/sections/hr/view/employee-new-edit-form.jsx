'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useEffect } from 'react';
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

import { createEmployee, updateEmployee } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const EmployeeSchema = z.object({
  employeeId: z.string().min(1, { message: 'Employee ID is required!' }),
  firstName: z.string().min(1, { message: 'First name is required!' }),
  lastName: z.string().min(1, { message: 'Last name is required!' }),
  currencyCode: z.string().min(1, { message: 'Currency is required!' }),
  nameArabic: z.string().optional(),
  employeeType: z.enum(['Permanent', 'Temporary'], {
    message: 'Employee type is required!',
  }),
  passportNumber: z.string().optional(),
  iqamaNumber: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Invalid email address!' }).optional().or(z.literal('')),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
  employmentStartDate: z.string().optional(),
  employmentEndDate: z.string().optional(),
  basicSalary: z.number().min(0).optional(),
  housingAllowance: z.number().min(0).optional(),
  transportationAllowance: z.number().min(0).optional(),
  otherAllowances: z.number().min(0).optional(),
  employmentStatus: z.enum(['Active', 'Inactive', 'Terminated', 'On Leave']).optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  iban: z.string().optional(),
});

// ----------------------------------------------------------------------

export function EmployeeNewEditForm({ currentEmployee }) {
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      employeeId: currentEmployee?.employeeId || '',
      firstName: currentEmployee?.firstName || '',
      lastName: currentEmployee?.lastName || '',
      currencyCode: currentEmployee?.currencyCode || 'SAR',
      nameArabic: currentEmployee?.nameArabic || '',
      employeeType: currentEmployee?.employeeType || 'Permanent',
      passportNumber: currentEmployee?.passportNumber || '',
      iqamaNumber: currentEmployee?.iqamaNumber || '',
      nationality: currentEmployee?.nationality || '',
      dateOfBirth: currentEmployee?.dateOfBirth || '',
      gender: currentEmployee?.gender || 'Male',
      maritalStatus: currentEmployee?.maritalStatus || 'Single',
      phone: currentEmployee?.phone || '',
      email: currentEmployee?.email || '',
      designation: currentEmployee?.designation || '',
      department: currentEmployee?.department || '',
      joiningDate: currentEmployee?.joiningDate || '',
      employmentStartDate: currentEmployee?.employmentStartDate || '',
      employmentEndDate: currentEmployee?.employmentEndDate || '',
      basicSalary: currentEmployee?.basicSalary || 0,
      housingAllowance: currentEmployee?.housingAllowance || 0,
      transportationAllowance: currentEmployee?.transportationAllowance || 0,
      otherAllowances: currentEmployee?.otherAllowances || 0,
      employmentStatus: currentEmployee?.employmentStatus || 'Active',
      bankName: currentEmployee?.bankName || '',
      bankAccountNumber: currentEmployee?.bankAccountNumber || '',
      iban: currentEmployee?.iban || '',
    }),
    [currentEmployee]
  );

  const methods = useForm({
    resolver: zodResolver(EmployeeSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentEmployee) {
      reset(defaultValues);
    }
  }, [currentEmployee, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const employeeData = {
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        currencyCode: data.currencyCode,
        employeeType: data.employeeType,
      };

      // Only add optional fields if they have values
      if (data.nameArabic?.trim()) employeeData.nameArabic = data.nameArabic.trim();
      if (data.passportNumber?.trim()) employeeData.passportNumber = data.passportNumber.trim();
      if (data.iqamaNumber?.trim()) employeeData.iqamaNumber = data.iqamaNumber.trim();
      if (data.nationality?.trim()) employeeData.nationality = data.nationality.trim();
      if (data.dateOfBirth?.trim()) employeeData.dateOfBirth = data.dateOfBirth.trim();
      if (data.gender) employeeData.gender = data.gender;
      if (data.maritalStatus) employeeData.maritalStatus = data.maritalStatus;
      if (data.phone?.trim()) employeeData.phone = data.phone.trim();
      if (data.email?.trim()) employeeData.email = data.email.trim();
      if (data.designation?.trim()) employeeData.designation = data.designation.trim();
      if (data.department?.trim()) employeeData.department = data.department.trim();
      if (data.joiningDate?.trim()) employeeData.joiningDate = data.joiningDate.trim();
      if (data.employmentStartDate?.trim())
        employeeData.employmentStartDate = data.employmentStartDate.trim();
      if (data.employmentEndDate?.trim())
        employeeData.employmentEndDate = data.employmentEndDate.trim();
      if (data.basicSalary) employeeData.basicSalary = Number(data.basicSalary);
      if (data.housingAllowance) employeeData.housingAllowance = Number(data.housingAllowance);
      if (data.transportationAllowance)
        employeeData.transportationAllowance = Number(data.transportationAllowance);
      if (data.otherAllowances) employeeData.otherAllowances = Number(data.otherAllowances);
      if (data.employmentStatus) employeeData.employmentStatus = data.employmentStatus;
      if (data.bankName?.trim()) employeeData.bankName = data.bankName.trim();
      if (data.bankAccountNumber?.trim())
        employeeData.bankAccountNumber = data.bankAccountNumber.trim();
      if (data.iban?.trim()) employeeData.iban = data.iban.trim();

      if (currentEmployee) {
        await updateEmployee(currentEmployee.id, employeeData);
        toast.success('Employee updated successfully!');
      } else {
        await createEmployee(employeeData);
        toast.success('Employee created successfully!');
      }

      router.push(paths.dashboard.hr.employee.root);
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(currentEmployee ? 'Failed to update employee' : 'Failed to create employee');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Personal Information */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Personal Information
              </Typography>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Text name="employeeId" label="Employee ID" required />
                <Field.Select name="employeeType" label="Employee Type" required>
                  <MenuItem value="Permanent">Permanent</MenuItem>
                  <MenuItem value="Temporary">Temporary</MenuItem>
                </Field.Select>
                <Field.Text name="firstName" label="First Name" required />
                <Field.Text name="lastName" label="Last Name" required />
                <Field.Text name="nameArabic" label="Name (Arabic)" />
                <Field.Text name="passportNumber" label="Passport Number" />
                <Field.Text name="iqamaNumber" label="Iqama Number" />
                <Field.Text name="nationality" label="Nationality" />
                <Field.DatePicker name="dateOfBirth" label="Date of Birth" />
                <Field.Select name="gender" label="Gender">
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Field.Select>
                <Field.Select name="maritalStatus" label="Marital Status">
                  <MenuItem value="Single">Single</MenuItem>
                  <MenuItem value="Married">Married</MenuItem>
                  <MenuItem value="Divorced">Divorced</MenuItem>
                  <MenuItem value="Widowed">Widowed</MenuItem>
                </Field.Select>
                <Field.Text name="phone" label="Phone Number" />
                <Field.Text name="email" label="Email Address" type="email" />
              </Box>
            </Card>

            {/* Employment Details */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Employment Details
              </Typography>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Text name="designation" label="Designation" />
                <Field.Text name="department" label="Department" />
                <Field.DatePicker name="joiningDate" label="Joining Date" />
                <Field.DatePicker name="employmentStartDate" label="Employment Start Date" />
                <Field.DatePicker name="employmentEndDate" label="Employment End Date" />
                <Field.Select name="employmentStatus" label="Status">
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Terminated">Terminated</MenuItem>
                </Field.Select>
              </Box>
            </Card>

            {/* Salary & Bank Details */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Salary & Bank Details
              </Typography>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Text name="basicSalary" label="Basic Salary" type="number" />
                <Field.Text name="housingAllowance" label="Housing Allowance" type="number" />
                <Field.Text
                  name="transportationAllowance"
                  label="Transportation Allowance"
                  type="number"
                />
                <Field.Text name="otherAllowances" label="Other Allowances" type="number" />
                <Field.Text name="bankName" label="Bank Name" />
                <Field.Text name="bankAccountNumber" label="Bank Account Number" />
                <Field.Text name="iban" label="IBAN" />
                <Field.Text name="currencyCode" label="Currency Code" required />
              </Box>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Leave Balance */}

            {/* Actions */}
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={isSubmitting}
                >
                  {currentEmployee ? 'Update Employee' : 'Create Employee'}
                </LoadingButton>
                <LoadingButton
                  variant="outlined"
                  size="large"
                  onClick={() => router.push(paths.dashboard.hr.employee.root)}
                >
                  Cancel
                </LoadingButton>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
