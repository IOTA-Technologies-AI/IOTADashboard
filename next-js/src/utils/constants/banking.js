// Banking constants and enums

// Supported countries/regions
export const BANK_REGIONS = {
  UAE: 'UAE',
  KSA: 'KSA',
};

// Supported banks by region
export const SUPPORTED_BANKS = {
  UAE: [
    { id: 'emirates_nbd', name: 'Emirates NBD', code: 'EBILAEAD' },
    { id: 'adcb', name: 'Abu Dhabi Commercial Bank', code: 'ADCBAEAA' },
    { id: 'fab', name: 'First Abu Dhabi Bank', code: 'NBADORJX' },
    { id: 'mashreq', name: 'Mashreq Bank', code: 'BOMLAEAD' },
    { id: 'dib', name: 'Dubai Islamic Bank', code: 'DUIBAEAD' },
    { id: 'rakbank', name: 'RAK Bank', code: 'NABORJX' },
    { id: 'cbd', name: 'Commercial Bank of Dubai', code: 'CBDUAEAD' },
  ],
  KSA: [
    { id: 'al_rajhi', name: 'Al Rajhi Bank', code: 'RJHISARI' },
    { id: 'snb', name: 'Saudi National Bank', code: 'NCBKSAJE' },
    { id: 'sab', name: 'Saudi Awwal Bank', code: 'SABBSARI' },
    { id: 'riyad_bank', name: 'Riyad Bank', code: 'RIBLSARI' },
    { id: 'alinma', name: 'Alinma Bank', code: 'INMASARI' },
    { id: 'bsf', name: 'Banque Saudi Fransi', code: 'BSFRSARI' },
  ],
};

// Currency codes
export const CURRENCIES = {
  UAE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  KSA: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
};

// Transaction types
export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
};

// Transaction categories
export const TRANSACTION_CATEGORIES = [
  { id: 'income', label: 'Income', type: 'credit' },
  { id: 'customer_payment', label: 'Customer Payment', type: 'credit' },
  { id: 'refund', label: 'Refund', type: 'credit' },
  { id: 'transfer_in', label: 'Transfer In', type: 'credit' },
  { id: 'bank_fees', label: 'Bank Fees', type: 'debit' },
  { id: 'vat', label: 'VAT', type: 'debit' },
  { id: 'salary', label: 'Salary Payment', type: 'debit' },
  { id: 'rent', label: 'Rent', type: 'debit' },
  { id: 'utilities', label: 'Utilities', type: 'debit' },
  { id: 'vendor_payment', label: 'Vendor Payment', type: 'debit' },
  { id: 'transfer_out', label: 'Transfer Out', type: 'debit' },
  { id: 'maintenance_fee', label: 'Maintenance Fee', type: 'debit' },
  { id: 'other', label: 'Other', type: 'both' },
];

// Get bank by ID
export function getBankById(bankId, region = null) {
  if (region) {
    return SUPPORTED_BANKS[region]?.find((bank) => bank.id === bankId);
  }
  for (const banks of Object.values(SUPPORTED_BANKS)) {
    const found = banks.find((bank) => bank.id === bankId);
    if (found) return found;
  }
  return null;
}

// Get all banks as flat array
export function getAllBanks() {
  return [
    ...SUPPORTED_BANKS.UAE.map((bank) => ({ ...bank, region: 'UAE' })),
    ...SUPPORTED_BANKS.KSA.map((bank) => ({ ...bank, region: 'KSA' })),
  ];
}

// Generate unique transaction number
export function generateTransactionNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

// Get currency by region
export function getCurrencyByRegion(region) {
  return CURRENCIES[region] || CURRENCIES.UAE;
}

// Auto-detect category from description
export function detectCategory(description) {
  const desc = description.toLowerCase();

  if (desc.includes('maintenance') || desc.includes('min bal fee')) {
    return 'maintenance_fee';
  }
  if (desc.includes('vat') || desc.includes('tax')) {
    return 'vat';
  }
  if (desc.includes('salary') || desc.includes('payroll')) {
    return 'salary';
  }
  if (desc.includes('rent')) {
    return 'rent';
  }
  if (desc.includes('transfer') && desc.includes('in')) {
    return 'transfer_in';
  }
  if (desc.includes('transfer') && desc.includes('out')) {
    return 'transfer_out';
  }
  if (desc.includes('ipp') || desc.includes('customer credit') || desc.includes('payment received')) {
    return 'customer_payment';
  }
  if (desc.includes('refund')) {
    return 'refund';
  }

  return 'other';
}
