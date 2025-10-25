import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { getCustomers } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

import { AddressListDialog } from '../address';

// ----------------------------------------------------------------------

// IOTA office addresses - you can expand this later with multiple offices
export const IOTA_OFFICES = [
  {
    id: 'iota-saudi',
    name: 'IOTA Saudi Arabia',
    fullAddress: '2885, Office #9, 1st Floor, Jarir Street, Al Malaz, Riyadh - 12836, Saudi Arabia',
    phoneNumber: '+966 50 534 0573',
    email: 'invoice@iotatechnologies.ai',
    vatNumber: '313081317100003',
    registrationNumber: '7050457477',
    currency: 'SAR',
    country: 'KSA',
    businessType: 'Information Technology Services',
    isIOTAOffice: true,
  },
];

export function InvoiceCreateEditAddress() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const values = watch();

  const addressTo = useBoolean();
  const addressFrom = useBoolean(); // Renamed from addressForm for clarity

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { invoiceFrom, invoiceTo } = values;

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomersData = async () => {
      setLoading(true);
      try {
        const apiResponse = await getCustomers();
        console.log('API Response:', apiResponse);

        // The API returns an array directly, not an object with customers property
        const customerList = apiResponse || [];

        // Transform API data to match AddressListDialog format
        const formattedCustomers = customerList.map((customer) => {
          // Use customerNameEn as the primary name
          const name = customer.customerNameEn || `Customer ${customer.id}`;

          // Build address from nested addresses object or fallback
          let fullAddress = '';
          let phoneNumber = 'Phone not available';

          if (customer.addresses) {
            // Use nested addresses object
            const addr = customer.addresses;
            const addressParts = [];

            if (addr.addressLine1) addressParts.push(addr.addressLine1);
            if (addr.addressLine2) addressParts.push(addr.addressLine2);
            if (addr.city) addressParts.push(addr.city);
            if (addr.state && addr.state !== addr.city) addressParts.push(addr.state);
            if (addr.zipCode) addressParts.push(addr.zipCode);
            if (addr.country) addressParts.push(addr.country);

            fullAddress =
              addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
            phoneNumber = addr.phone || addr.fax || 'Phone not available';
          } else {
            // Fallback to business name and country
            const addressParts = [];
            if (customer.customerNameOfBusiness) {
              addressParts.push(customer.customerNameOfBusiness);
            }
            if (customer.customerBillingCountryCode) {
              const countryName =
                customer.customerBillingCountryCode === 'KSA'
                  ? 'Saudi Arabia'
                  : customer.customerBillingCountryCode;
              addressParts.push(countryName);
            }
            fullAddress =
              addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
            phoneNumber = customer.phone || customer.mobile || 'Phone not available';
          }

          return {
            id: customer.id,
            name,
            fullAddress,
            phoneNumber,
            email: customer.email || 'Email not available',
            // Additional useful fields for display
            vatNumber: customer['VAT#'] || 'VAT not provided',
            registrationNumber: customer['companyRegistration#'] || 'Registration not provided',
            currency: customer.customerBillingCurrencyCode || 'SAR',
            country: customer.customerBillingCountryCode || 'KSA',
            businessType: customer.customerNameOfBusiness || '',
            nameAr: customer.customerNameAr || '',
            status: customer.customerStatus,
            // Keep original data for reference
            _originalData: customer,
          };
        });

        console.log('Formatted customers:', formattedCustomers);
        setCustomers(formattedCustomers);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomersData();
  }, []);

  return (
    <>
      <Stack
        divider={
          <Divider
            flexItem
            orientation={mdUp ? 'vertical' : 'horizontal'}
            sx={{ borderStyle: 'dashed' }}
          />
        }
        sx={{ p: 3, gap: { xs: 3, md: 5 }, flexDirection: { xs: 'column', md: 'row' } }}
      >
        {/* FROM Section - IOTA Offices */}
        <Stack sx={{ width: 1 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.disabled', flexGrow: 1 }}>
              From (IOTA Office):
            </Typography>

            <IconButton onClick={addressFrom.onTrue}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Box>

          <Stack spacing={1}>
            <Typography variant="subtitle2">{invoiceFrom?.name}</Typography>
            <Typography variant="body2">{invoiceFrom?.fullAddress}</Typography>
            <Typography variant="body2">{invoiceFrom?.phoneNumber}</Typography>
            {invoiceFrom?.vatNumber && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                VAT: {invoiceFrom.vatNumber}
              </Typography>
            )}
          </Stack>
        </Stack>

        {/* TO Section - API Customers */}
        <Stack sx={{ width: 1 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.disabled', flexGrow: 1 }}>
              To (Customer):
            </Typography>

            <IconButton onClick={addressTo.onTrue} disabled={loading}>
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Iconify icon={invoiceTo ? 'solar:pen-bold' : 'mingcute:add-line'} />
              )}
            </IconButton>
          </Box>

          {invoiceTo ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{invoiceTo?.name}</Typography>
              <Typography variant="body2">{invoiceTo?.fullAddress}</Typography>
              <Typography variant="body2">{invoiceTo?.phoneNumber}</Typography>
              {invoiceTo?.vatNumber && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  VAT: {invoiceTo.vatNumber}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography typography="caption" sx={{ color: 'error.main' }}>
              {errors.invoiceTo?.message || 'Click + to select a customer'}
            </Typography>
          )}
        </Stack>
      </Stack>

      {/* IOTA Offices Dialog - For FROM field */}
      <AddressListDialog
        title="IOTA Offices"
        open={addressFrom.value}
        onClose={addressFrom.onFalse}
        selected={(selectedId) => invoiceFrom?.id === selectedId}
        onSelect={(address) => setValue('invoiceFrom', address)}
        list={IOTA_OFFICES}
        action={
          <Button
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ alignSelf: 'flex-end' }}
          >
            Add Office
          </Button>
        }
      />

      {/* Customers Dialog - For TO field */}
      <AddressListDialog
        title="Select Customer"
        open={addressTo.value}
        onClose={addressTo.onFalse}
        selected={(selectedId) => invoiceTo?.id === selectedId}
        onSelect={(address) => setValue('invoiceTo', address)}
        list={customers}
        action={
          <Button
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ alignSelf: 'flex-end' }}
          >
            Add Customer
          </Button>
        }
      />
    </>
  );
}
