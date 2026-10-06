'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { DetailsCard } from 'src/components/details-card';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const STATUS_COLOR = {
  Active: 'success',
  Probation: 'info',
  NoticePeriod: 'warning',
  Terminated: 'error',
  Resigned: 'default',
};

const money = (value, currency) =>
  value === null || value === undefined || value === ''
    ? null
    : fCurrency(value, { currency: currency || 'SAR' });

const date = (value) => (value ? fDate(value) : null);

/** Read-only view of an employee record. Editing stays on the edit page. */
export function EmployeeDetailsView({ employee }) {
  const fullName = [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(' ');
  const currency = employee.currencyCode || 'SAR';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={fullName || employee.employeeId}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employees', href: paths.dashboard.hr.employee.root },
          { name: fullName || employee.employeeId },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.employee.edit(employee.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <DetailsCard
          title="Employment"
          columns={3}
          fields={[
            { label: 'Employee ID', value: employee.employeeId },
            {
              label: 'Status',
              value: (
                <Label variant="soft" color={STATUS_COLOR[employee.employmentStatus] || 'default'}>
                  {employee.employmentStatus || '—'}
                </Label>
              ),
            },
            { label: 'Type', value: employee.employeeType },
            { label: 'Designation', value: employee.designation },
            { label: 'Department', value: employee.department },
            { label: 'Joining date', value: date(employee.joiningDate) },
            { label: 'Probation ends', value: date(employee.probationEndDate) },
            { label: 'Contract start', value: date(employee.contractStartDate) },
            { label: 'Contract end', value: date(employee.contractEndDate) },
          ]}
        />

        <DetailsCard
          title="Personal"
          columns={3}
          fields={[
            { label: 'Full name', value: fullName },
            { label: 'Name (Arabic)', value: employee.nameArabic },
            { label: 'Date of birth', value: date(employee.dateOfBirth) },
            { label: 'Gender', value: employee.gender },
            { label: 'Nationality', value: employee.nationality },
            { label: 'Marital status', value: employee.maritalStatus },
          ]}
        />

        <DetailsCard
          title="Contact"
          columns={3}
          fields={[
            { label: 'Email', value: employee.email },
            { label: 'Phone', value: employee.phone },
            { label: 'Mobile', value: employee.mobile },
            { label: 'Emergency contact', value: employee.emergencyContactName },
            { label: 'Emergency phone', value: employee.emergencyContactPhone },
            { label: 'Current address', value: employee.currentAddress },
            { label: 'Permanent address', value: employee.permanentAddress },
          ]}
        />

        <DetailsCard
          title="Identity & visa"
          columns={3}
          fields={[
            { label: 'National ID', value: employee.nationalId },
            { label: 'Passport number', value: employee.passportNumber },
            { label: 'Passport issued', value: date(employee.passportIssueDate) },
            { label: 'Passport expires', value: date(employee.passportExpiryDate) },
            { label: 'Iqama number', value: employee.iqamaNumber },
            { label: 'Iqama issued', value: date(employee.iqamaIssueDate) },
            { label: 'Iqama expires', value: date(employee.iqamaExpiryDate) },
            { label: 'Visa number', value: employee.visaNumber },
            { label: 'Visa type', value: employee.visaType },
            { label: 'Sponsor', value: employee.sponsorName },
          ]}
        />

        <DetailsCard
          title="Salary"
          columns={3}
          fields={[
            { label: 'Basic salary', value: money(employee.basicSalary, currency) },
            { label: 'Housing allowance', value: money(employee.housingAllowance, currency) },
            {
              label: 'Transport allowance',
              value: money(
                employee.transportAllowance ?? employee.transportationAllowance,
                currency
              ),
            },
            { label: 'Other allowances', value: money(employee.otherAllowances, currency) },
            { label: 'Currency', value: currency },
            { label: 'GOSI number', value: employee.gosiNumber },
            { label: 'GOSI deduction', value: money(employee.gosiDeduction, currency) },
          ]}
        />

        <DetailsCard
          title="Bank"
          columns={3}
          fields={[
            { label: 'Bank', value: employee.bankName },
            { label: 'Account number', value: employee.bankAccountNumber },
            { label: 'IBAN', value: employee.iban },
          ]}
        />

        <DetailsCard
          title="Documents"
          columns={4}
          fields={[
            {
              label: 'Profile photo',
              value: employee.profilePhotoUrl ? 'Open' : null,
              href: employee.profilePhotoUrl,
            },
            {
              label: 'Passport copy',
              value: employee.passportCopyUrl ? 'Open' : null,
              href: employee.passportCopyUrl,
            },
            {
              label: 'Iqama copy',
              value: employee.iqamaCopyUrl ? 'Open' : null,
              href: employee.iqamaCopyUrl,
            },
            {
              label: 'Contract copy',
              value: employee.contractCopyUrl ? 'Open' : null,
              href: employee.contractCopyUrl,
            },
          ]}
        />
      </Stack>
    </DashboardContent>
  );
}
