'use client';

import * as z from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { apiHelper } from 'src/utils/apiHelper';
import {
  DEFAULT_CURRENCY,
  ALLOWED_CURRENCIES,
  VENDOR_STATUS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from 'src/utils/constants/enums';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

// Schema for CREATE - all required fields
// Schema for CREATE - only Basic Info and Contact Person required
const VendorCreateSchema = z.object({
  // BASIC INFORMATION - Required
  vendorCode: z.string().min(1, { message: 'Vendor code is required!' }),
  vendorName: z.string().min(1, { message: 'Vendor name is required!' }),
  email: z.string().email({ message: 'Email must be a valid email address!' }),
  phoneNumber: z.string().min(1, { message: 'Phone number is required!' }),
  status: z.string().min(6, { message: 'Status is required!' }),
  currencyCode: z.string(),
  // CONTACT PERSON - Required
  contactPerson: z.string().min(1, { message: 'Contact person is required!' }),
  contactEmail: z.string().email({ message: 'Contact email must be a valid email address!' }),
  contactPhone: z.string().min(1, { message: 'Contact phone is required!' }),

  // ALL OTHER FIELDS - Optional
  website: z.string().optional(),
  vatNumber: z.string().optional(),
  taxId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSwiftCode: z.string().optional(),
  iban: z.string().optional(),
});

// Schema for EDIT - all fields optional (only validate if filled)
const VendorEditSchema = z.object({
  vendorCode: z.string().optional(),
  vendorName: z.string().optional(),
  email: z
    .string()
    .email({ message: 'Email must be a valid email address!' })
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string().optional(),
  website: z.string().optional(),
  status: z.string().optional(),
  currencyCode: z.string().optional(),
  vatNumber: z.string().optional(),
  taxId: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z
    .string()
    .email({ message: 'Contact email must be a valid email address!' })
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSwiftCode: z.string().optional(),
  iban: z.string().optional(),
});

// ----------------------------------------------------------------------

export function VendorCreateEditForm({ currentVendor }) {
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      vendorCode: currentVendor?.vendorCode || '',
      vendorName: currentVendor?.vendorName || '',
      email: currentVendor?.email || '',
      phoneNumber: currentVendor?.phoneNumber || '',
      website: currentVendor?.website || '',
      status: currentVendor?.status || 'active',
      currencyCode: currentVendor?.currencyCode || DEFAULT_CURRENCY,
      vatNumber: currentVendor?.vatNumber || '',
      taxId: currentVendor?.taxId || '',
      contactPerson: currentVendor?.contactPerson || '',
      contactEmail: currentVendor?.contactEmail || '',
      contactPhone: currentVendor?.contactPhone || '',
      addressLine1: currentVendor?.addressLine1 || '',
      addressLine2: currentVendor?.addressLine2 || '',
      city: currentVendor?.city || '',
      state: currentVendor?.state || '',
      postalCode: currentVendor?.postalCode || '',
      country: currentVendor?.country || 'UAE',
      paymentTerms: currentVendor?.paymentTerms || 'net-30',
      bankName: currentVendor?.bankName || '',
      bankAccountNumber: currentVendor?.bankAccountNumber || '',
      bankSwiftCode: currentVendor?.bankSwiftCode || '',
      iban: currentVendor?.iban || '',
    }),
    [currentVendor]
  );

  const methods = useForm({
    resolver: zodResolver(currentVendor ? VendorEditSchema : VendorCreateSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (currentVendor) {
        // EDIT: Send all fields including cleared ones
        const updateData = {};

        // Include all fields - send null for empty values
        Object.keys(data).forEach((key) => {
          const value = data[key];
          // ✅ Include empty strings as null to clear the field
          if (value === '' || value === null || value === undefined) {
            updateData[key] = null; // Send null to clear the field
          } else {
            updateData[key] = value;
          }
        });

        // Map frontend field names to backend database names
        if (updateData.phoneNumber !== undefined) {
          updateData.phone = updateData.phoneNumber;
          delete updateData.phoneNumber;
        }
        if (updateData.contactPerson !== undefined) {
          updateData.primaryContactName = updateData.contactPerson;
          delete updateData.contactPerson;
        }
        if (updateData.bankSwiftCode !== undefined) {
          updateData.swiftCode = updateData.bankSwiftCode;
          delete updateData.bankSwiftCode;
        }

        // Add metadata
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = 'current-user-id';

        console.log('📤 Sending update data:', updateData);

        await apiHelper.updateVendor(currentVendor.id, updateData);
        toast.success('Vendor updated successfully!');
      } else {
        // CREATE: Send all data with field mapping
        const createData = {};

        // Include all fields
        Object.keys(data).forEach((key) => {
          const value = data[key];
          if (value === '' || value === null || value === undefined) {
            createData[key] = null;
          } else {
            createData[key] = value;
          }
        });
        createData.status = createData.status || 'ACTIVE';
        createData.legalName = createData.vendorName || 'N/A';
        createData.addressLine1 = createData.addressLine1 || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.addressLine2 = createData.addressLine2 || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.city = createData.city || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.state = createData.state || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.country = createData.country || 'KSA';
        createData.currencyCode = createData.currencyCode || DEFAULT_CURRENCY;
        createData.billingAddressLine1 = createData.addressLine1 || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.billingAddressLine2 = createData.addressLine2 || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.billingCity = createData.city || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.billingState = createData.state || 'N/A'; // ⚠️ Change from '' to 'N/A'
        createData.billingCountry = createData.country || 'KSA';
        createData.associatedIOTAOffice = 'KINGDOM OF SAUDI ARABIA'; // Default value
        createData.isVatRegistered = false;
        createData.isPreferredVendor = false;
        createData.totalAmountPaid = 0;
        createData.outstandingBalance = 0;

        // Add metadata
        createData.createdAt = new Date().toISOString();
        createData.updatedBy = 'current-user-id'; // TODO: Get from auth context

        console.log('📤 Sending create data:', createData);

        await apiHelper.createVendor(createData);
        toast.success('Vendor created successfully!');
      }
      router.push(paths.dashboard.vendor.root);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(currentVendor ? 'Failed to update vendor' : 'Failed to create vendor');
    }
  });

  // ... rest of your render functions remain the same ...

  const renderInfo = () => (
    <Card>
      <CardHeader
        title="Basic Information"
        subheader="Vendor identification and status"
        sx={{ mb: 3 }}
      />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Field.Text name="vendorCode" label="Vendor Code" />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Field.Select name="status" label="Status">
              {VENDOR_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Field.Select>
          </Grid>
        </Grid>

        <Field.Text name="vendorName" label="Vendor Name" />
        <Field.Text name="email" label="Email" />
        <Field.Text name="phoneNumber" label="Phone Number" />
        <Field.Text name="website" label="Website" />
      </Stack>
    </Card>
  );

  const renderContact = () => (
    <Card>
      <CardHeader title="Contact Person" subheader="Primary contact details" sx={{ mb: 3 }} />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Field.Text name="contactPerson" label="Contact Person Name" />
        <Field.Text name="contactEmail" label="Contact Email" />
        <Field.Text name="contactPhone" label="Contact Phone" />
      </Stack>
    </Card>
  );

  const renderTax = () => (
    <Card>
      <CardHeader title="Tax Information" subheader="VAT and tax identification" sx={{ mb: 3 }} />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Field.Text name="vatNumber" label="VAT Number" />
        <Field.Text name="taxId" label="Tax ID" />
      </Stack>
    </Card>
  );

  const renderAddress = () => (
    <Card>
      <CardHeader title="Address" subheader="Vendor location details" sx={{ mb: 3 }} />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Field.Text name="addressLine1" label="Address Line 1" />
        <Field.Text name="addressLine2" label="Address Line 2" />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Field.Text name="city" label="City" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Field.Text name="state" label="State/Province" />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Field.Text name="postalCode" label="Postal Code" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Field.CountrySelect name="country" label="Country" placeholder="Choose a country" />
          </Grid>
        </Grid>
      </Stack>
    </Card>
  );

  const renderPayment = () => (
    <Card>
      <CardHeader
        title="Payment Information"
        subheader="Payment and banking details"
        sx={{ mb: 3 }}
      />

      <Stack spacing={3} sx={{ p: 3 }}>
        {/* ✅ ADD CURRENCY DROPDOWN HERE - AT THE TOP */}
        <Field.Select name="currencyCode" label="Currency">
          {ALLOWED_CURRENCIES.map((currency) => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Select name="paymentTerms" label="Payment Terms">
          {PAYMENT_TERMS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text name="bankName" label="Bank Name" />
        <Field.Text name="bankAccountNumber" label="Bank Account Number" />
        <Field.Text name="bankSwiftCode" label="SWIFT/BIC Code" />
        <Field.Text name="iban" label="IBAN" />
      </Stack>
    </Card>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {renderInfo()}
            {renderContact()}
            {renderAddress()}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {renderTax()}
            {renderPayment()}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => router.push(paths.dashboard.vendor.root)}>
              Cancel
            </Button>
            <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
              {currentVendor ? 'Update Vendor' : 'Create Vendor'}
            </LoadingButton>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}
