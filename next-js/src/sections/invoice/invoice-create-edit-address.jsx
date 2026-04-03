import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { getCustomers, createCustomer } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { AddressListDialog } from '../address';

// ----------------------------------------------------------------------

// IOTA office addresses
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
    bankDetails: {
      accountName: 'IOTA Information Technology Services',
      iban: 'SA1105000068204000188000',
      bank: 'Al Rajhi Bank',
      city: 'Riyadh, Saudi Arabia',
    },
  },
  {
    id: 'iota-uae',
    name: 'IOTA UAE',
    fullAddress: 'Office 1215, ETA Star AlManara, Business Bay, Dubai, UAE',
    phoneNumber: '+971 54 37 44220',
    email: 'accounts@iotatechnologies.ai',
    vatNumber: '310000165800003',
    registrationNumber: '1100858',
    currency: 'AED',
    country: 'UAE',
    businessType: 'Information Technology Services',
    isIOTAOffice: true,
    bankDetails: {
      accountName: 'IOTA Information Technology Services.',
      iban: 'AE480260001015933487201',
      bank: 'Emirates NBD',
      city: 'Dubai, United Arab Emirates',
    },
  },
  {
    id: 'iota-india',
    name: 'IOTA India',
    fullAddress: 'India',
    phoneNumber: '+91 00 0000 0000',
    email: 'invoice@iotatechnologies.ai',
    vatNumber: '',
    registrationNumber: '',
    currency: 'INR',
    country: 'India',
    businessType: 'Information Technology Services',
    isIOTAOffice: true,
    bankDetails: {
      accountName: 'IOTA Information Technology Services',
      iban: '',
      bank: '',
      city: 'India',
    },
  },
  {
    id: 'iota-uk',
    name: 'IOTA UK',
    fullAddress: 'United Kingdom',
    phoneNumber: '+44 00 0000 0000',
    email: 'invoice@iotatechnologies.ai',
    vatNumber: '',
    registrationNumber: '',
    currency: 'GBP',
    country: 'UK',
    businessType: 'Information Technology Services',
    isIOTAOffice: true,
    bankDetails: {
      accountName: 'IOTA Information Technology Services',
      iban: '',
      bank: '',
      city: 'United Kingdom',
    },
  },
];

// ----------------------------------------------------------------------

const BILLING_CURRENCIES = ['SAR', 'AED', 'INR', 'GBP', 'USD', 'EUR'];
const BILLING_COUNTRIES = ['KSA', 'UAE', 'India', 'UK', 'USA', 'Other'];

const EMPTY_CUSTOMER_FORM = {
  customernameen: '',
  customernamear: '',
  customernameofbusiness: '',
  customerbillingcountrycode: 'KSA',
  customerbillingcurrencycode: 'SAR',
  VAT: '',
  addressline1: '',
  addressline2: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  phone: '',
};

function AddCustomerDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.customernameen.trim()) {
      toast.error('Customer name (EN) is required');
      return;
    }
    if (!form.addressline1.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error('Address line 1, city, and country are required');
      return;
    }
    setSaving(true);
    try {
      const newCustomer = await createCustomer({
        customernameen: form.customernameen.trim(),
        customernamear: form.customernamear.trim() || undefined,
        customernameofbusiness: form.customernameofbusiness.trim() || undefined,
        customerbillingcountrycode: form.customerbillingcountrycode,
        customerbillingcurrencycode: form.customerbillingcurrencycode,
        VAT: form.VAT.trim() || undefined,
        addressline1: form.addressline1.trim(),
        addressline2: form.addressline2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: form.country.trim(),
        zipcode: form.zipcode.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success('Customer created successfully');
      setForm(EMPTY_CUSTOMER_FORM);
      onCreated(newCustomer);
      onClose();
    } catch (err) {
      toast.error(`Failed to create customer: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Customer</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Customer Info
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Customer Name (EN) *"
              value={form.customernameen}
              onChange={handleChange('customernameen')}
              fullWidth
            />
            <TextField
              label="Customer Name (AR)"
              value={form.customernamear}
              onChange={handleChange('customernamear')}
              fullWidth
              inputProps={{ dir: 'rtl' }}
            />
          </Stack>

          <TextField
            label="Business / Company Name"
            value={form.customernameofbusiness}
            onChange={handleChange('customernameofbusiness')}
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Billing Country"
              value={form.customerbillingcountrycode}
              onChange={handleChange('customerbillingcountrycode')}
              fullWidth
            >
              {BILLING_COUNTRIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Billing Currency"
              value={form.customerbillingcurrencycode}
              onChange={handleChange('customerbillingcurrencycode')}
              fullWidth
            >
              {BILLING_CURRENCIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField label="VAT Number" value={form.VAT} onChange={handleChange('VAT')} fullWidth />

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Address
          </Typography>

          <TextField
            label="Address Line 1 *"
            value={form.addressline1}
            onChange={handleChange('addressline1')}
            fullWidth
          />
          <TextField
            label="Address Line 2"
            value={form.addressline2}
            onChange={handleChange('addressline2')}
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="City *" value={form.city} onChange={handleChange('city')} fullWidth />
            <TextField
              label="State / Province"
              value={form.state}
              onChange={handleChange('state')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Country *"
              value={form.country}
              onChange={handleChange('country')}
              fullWidth
            />
            <TextField
              label="ZIP / Postal Code"
              value={form.zipcode}
              onChange={handleChange('zipcode')}
              fullWidth
            />
          </Stack>

          <TextField label="Phone" value={form.phone} onChange={handleChange('phone')} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          Create Customer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

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
  const addCustomerDialog = useBoolean();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { invoiceFrom, invoiceTo } = values;

  const transformCustomer = (customer) => {
    const name = customer.customernameen || customer.customerNameEn || `Customer ${customer.id}`;
    let fullAddress = '';
    let phoneNumber = 'Phone not available';

    const addr = customer.addresses;
    if (addr) {
      const addressParts = [];
      if (addr.addressline1 || addr.addressLine1)
        addressParts.push(addr.addressline1 || addr.addressLine1);
      if (addr.addressline2 || addr.addressLine2)
        addressParts.push(addr.addressline2 || addr.addressLine2);
      if (addr.city) addressParts.push(addr.city);
      if (addr.state && addr.state !== addr.city) addressParts.push(addr.state);
      if (addr.zipcode || addr.zipCode) addressParts.push(addr.zipcode || addr.zipCode);
      if (addr.country) addressParts.push(addr.country);
      fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
      phoneNumber = addr.phone || addr.fax || 'Phone not available';
    } else {
      const addressParts = [];
      const bizName = customer.customernameofbusiness || customer.customerNameOfBusiness;
      if (bizName) addressParts.push(bizName);
      const countryCode =
        customer.customerbillingcountrycode || customer.customerBillingCountryCode;
      if (countryCode) addressParts.push(countryCode === 'KSA' ? 'Saudi Arabia' : countryCode);
      fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
      phoneNumber = customer.phone || customer.mobile || 'Phone not available';
    }

    return {
      id: customer.id,
      name,
      fullAddress,
      phoneNumber,
      email: customer.email || 'Email not available',
      vatNumber: customer.VAT || customer['VAT#'] || 'VAT not provided',
      registrationNumber: customer['companyRegistration#'] || 'Registration not provided',
      currency:
        customer.customerbillingcurrencycode || customer.customerBillingCurrencyCode || 'SAR',
      country: customer.customerbillingcountrycode || customer.customerBillingCountryCode || 'KSA',
      businessType: customer.customernameofbusiness || customer.customerNameOfBusiness || '',
      nameAr: customer.customernamear || customer.customerNameAr || '',
      status: customer.customerstatus ?? customer.customerStatus,
      _originalData: customer,
    };
  };

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomersData = async () => {
      setLoading(true);
      try {
        const apiResponse = await getCustomers();
        const customerList = apiResponse || [];
        setCustomers(customerList.map(transformCustomer));
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomerCreated = (newCustomer) => {
    const formatted = transformCustomer(newCustomer);
    setCustomers((prev) => [...prev, formatted]);
    setValue('invoiceTo', formatted);
  };

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
            onClick={addCustomerDialog.onTrue}
          >
            Add Customer
          </Button>
        }
      />

      <AddCustomerDialog
        open={addCustomerDialog.value}
        onClose={addCustomerDialog.onFalse}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
