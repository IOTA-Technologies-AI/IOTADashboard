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
  approved: 'success',
  completed: 'success',
  pending: 'warning',
  in_progress: 'info',
  rejected: 'error',
  cancelled: 'default',
};

const money = (value, currency) =>
  value === null || value === undefined || value === ''
    ? null
    : fCurrency(value, { currency: currency || 'SAR' });

const date = (value) => (value ? fDate(value) : null);

const doc = (label, url) => ({ label, value: url ? 'Open' : null, href: url });

/** Read-only view of a business visa request. Editing stays on the edit page. */
export function BusinessVisaDetailsView({ request }) {
  const currency = request.currencyCode || 'SAR';
  const status = String(request.status || '').toLowerCase();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={request.requestNumber || 'Business Visa Request'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Business Visa Requests', href: paths.dashboard.hr.businessVisa.root },
          { name: request.requestNumber || 'Details' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.businessVisa.edit(request.id)}
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
          title="Request"
          columns={3}
          fields={[
            { label: 'Request number', value: request.requestNumber },
            {
              label: 'Status',
              value: (
                <Label variant="soft" color={STATUS_COLOR[status] || 'default'}>
                  {request.status || '—'}
                </Label>
              ),
            },
            { label: 'Requested on', value: date(request.requestedDate) },
            { label: 'Expected arrival', value: date(request.expectedArrivalDate) },
            { label: 'Assigned to', value: request.assignedTo },
            { label: 'Invoice', value: request.invoiceId },
          ]}
        />

        <DetailsCard
          title="Applicant"
          columns={3}
          fields={[
            { label: 'Name', value: request.applicantName },
            { label: 'Company', value: request.applicantCompany },
            { label: 'Nationality', value: request.nationality },
            { label: 'Passport number', value: request.passportNumber },
            { label: 'Passport expires', value: date(request.passportExpiryDate) },
          ]}
        />

        <DetailsCard
          title="Visa"
          columns={3}
          fields={[
            { label: 'Purpose', value: request.purpose },
            {
              label: 'Duration',
              value: request.durationDays ? `${request.durationDays} days` : null,
            },
            { label: 'Visa fee', value: money(request.visaFee, currency) },
            { label: 'Processing fee', value: money(request.processingFee, currency) },
            { label: 'Total', value: money(request.totalAmount, currency) },
            { label: 'Currency', value: currency },
          ]}
        />

        <DetailsCard
          title="Documents"
          columns={4}
          fields={[
            doc('Passport copy', request.passportCopyUrl),
            doc('Letter of intent', request.letterOfIntentUrl),
            doc('Company CR', request.companyCrUrl),
            doc('Invitation letter', request.invitationLetterUrl),
          ]}
        />

        <DetailsCard
          title="Remarks"
          columns={1}
          fields={[{ label: 'Remarks', value: request.remarks }]}
        />
      </Stack>
    </DashboardContent>
  );
}
