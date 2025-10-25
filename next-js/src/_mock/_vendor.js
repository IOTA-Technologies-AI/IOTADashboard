import { _mock } from './_mock';

// ----------------------------------------------------------------------

export const VENDOR_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const _vendors = Array.from({ length: 20 }, (_, index) => ({
  id: _mock.id(index),
  vendorCode: `VEN-${1000 + index}`,
  vendorName: _mock.companyNames(index),
  vatNumber: `VAT${_mock.number.nativeS(index)}`,
  taxId: `TAX${_mock.number.nativeS(index + 5)}`,
  email: _mock.email(index),
  phoneNumber: _mock.phoneNumber(index),
  website: _mock.fullAddress(index).split(',')[0] + '.com',
  status: index % 3 === 0 ? 'active' : index % 3 === 1 ? 'inactive' : 'suspended',
  contactPerson: _mock.fullName(index),
  contactEmail: _mock.email(index + 1),
  contactPhone: _mock.phoneNumber(index + 1),
  addressLine1: _mock.fullAddress(index),
  addressLine2: _mock.fullAddress(index + 1),
  city: _mock.fullAddress(index).split(',')[1] || 'Dubai',
  state: 'Dubai',
  postalCode: _mock.number.nativeS(index),
  country: 'UAE',
  paymentTerms: index % 3 === 0 ? 'Net 30' : index % 3 === 1 ? 'Net 60' : 'Due on Receipt',
  bankName: _mock.companyNames(index + 5),
  bankAccountNumber: `ACCT${_mock.number.nativeL(index)}`,
  bankSwiftCode: `SWIFT${_mock.number.nativeS(index)}`,
  iban: `AE${_mock.number.nativeL(index)}`,
  createdAt: _mock.time(index),
  updatedAt: _mock.time(index + 1),
}));
