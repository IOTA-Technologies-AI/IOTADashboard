import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function VendorDetails({ vendor }) {
  const renderInfo = () => (
    <Card>
      <CardHeader
        title="Vendor Information"
        action={
          <IconButton>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        }
      />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Vendor Code
          </Box>
          <Box component="span" sx={{ fontWeight: 'fontWeightMedium' }}>
            {vendor?.vendorCode}
          </Box>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Vendor Name
          </Box>
          {vendor?.vendorName}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Status
          </Box>
          <Label
            variant="soft"
            color={
              (vendor?.status === 'active' && 'success') ||
              (vendor?.status === 'suspended' && 'warning') ||
              (vendor?.status === 'inactive' && 'error') ||
              'default'
            }
          >
            {vendor?.status}
          </Label>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Email
          </Box>
          {vendor?.email}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Phone
          </Box>
          {vendor?.phoneNumber}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Website
          </Box>
          {vendor?.website}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Created At
          </Box>
          {fDate(vendor?.createdAt)}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Updated At
          </Box>
          {fDate(vendor?.updatedAt)}
        </Box>
      </Stack>
    </Card>
  );

  const renderContact = () => (
    <Card>
      <CardHeader title="Contact Person" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Name
          </Box>
          {vendor?.contactPerson}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Email
          </Box>
          {vendor?.contactEmail}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Phone
          </Box>
          {vendor?.contactPhone}
        </Box>
      </Stack>
    </Card>
  );

  const renderAddress = () => (
    <Card>
      <CardHeader
        title="Address"
        action={
          <IconButton>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        }
      />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Address Line 1
          </Box>
          {vendor?.addressLine1}
        </Box>

        {vendor?.addressLine2 && (
          <Box sx={{ display: 'flex' }}>
            <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
              Address Line 2
            </Box>
            {vendor?.addressLine2}
          </Box>
        )}

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            City
          </Box>
          {vendor?.city}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            State
          </Box>
          {vendor?.state}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Postal Code
          </Box>
          {vendor?.postalCode}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Country
          </Box>
          {vendor?.country}
        </Box>
      </Stack>
    </Card>
  );

  const renderTaxInfo = () => (
    <Card>
      <CardHeader title="Tax Information" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            VAT Number
          </Box>
          <Box component="span" sx={{ fontWeight: 'fontWeightMedium' }}>
            {vendor?.vatNumber}
          </Box>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Tax ID
          </Box>
          {vendor?.taxId}
        </Box>
      </Stack>
    </Card>
  );

  const renderPayment = () => (
    <Card>
      <CardHeader title="Payment & Banking" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Payment Terms
          </Box>
          {vendor?.paymentTerms}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Bank Name
          </Box>
          {vendor?.bankName}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Account Number
          </Box>
          {vendor?.bankAccountNumber}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            SWIFT Code
          </Box>
          {vendor?.bankSwiftCode}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            IBAN
          </Box>
          {vendor?.iban}
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={3}>
          {renderInfo()}
          {renderTaxInfo()}
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={3}>
          {renderContact()}
          {renderAddress()}
          {renderPayment()}
        </Stack>
      </Grid>
    </Grid>
  );
}
