export const PAYMENT_TERMS = {
  NET_7: 'net-7',
  NET_15: 'net-15',
  NET_30: 'net-30',
  NET_45: 'net-45',
  NET_60: 'net-60',
  NET_90: 'net-90',
  DUE_ON_RECEIPT: 'due-on-receipt',
  CASH_ON_DELIVERY: 'cash-on-delivery',
  PREPAYMENT: 'prepayment',
  TWO_TEN_NET_30: '2-10-net-30',
  END_OF_MONTH: 'end-of-month',
};

export const PAYMENT_TERMS_OPTIONS = [
  { value: PAYMENT_TERMS.NET_7, label: 'Net 7' },
  { value: PAYMENT_TERMS.NET_15, label: 'Net 15' },
  { value: PAYMENT_TERMS.NET_30, label: 'Net 30' },
  { value: PAYMENT_TERMS.NET_45, label: 'Net 45' },
  { value: PAYMENT_TERMS.NET_60, label: 'Net 60' },
  { value: PAYMENT_TERMS.NET_90, label: 'Net 90' },
  { value: PAYMENT_TERMS.DUE_ON_RECEIPT, label: 'Due on Receipt' },
  { value: PAYMENT_TERMS.CASH_ON_DELIVERY, label: 'Cash on Delivery (COD)' },
  { value: PAYMENT_TERMS.PREPAYMENT, label: 'Prepayment' },
  { value: PAYMENT_TERMS.TWO_TEN_NET_30, label: '2/10 Net 30' },
  { value: PAYMENT_TERMS.END_OF_MONTH, label: 'End of Month (EOM)' },
];

export const VENDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
};

export const VENDOR_STATUS_OPTIONS = [
  { value: VENDOR_STATUS.ACTIVE, label: 'Active' },
  { value: VENDOR_STATUS.INACTIVE, label: 'Inactive' },
  { value: VENDOR_STATUS.PENDING, label: 'Pending' },
  { value: VENDOR_STATUS.SUSPENDED, label: 'Suspended' },
];

export const DEFAULT_VENDOR_STATUS = VENDOR_STATUS.INACTIVE;

export const ALLOWED_CURRENCIES = ['INR', 'AED', 'USD', 'EUR', 'GBP', 'SAR', 'KWD', 'OMR', 'QAR'];

export const DEFAULT_CURRENCY = 'SAR';

export const DEFAULT_PAYMENT_TERM = PAYMENT_TERMS.NET_30;

// ============================================================================
// Expense Constants
// ============================================================================

// Expense Types (from your database)
export const EXPENSE_TYPES = [
  { id: 1, label: 'Company Establishment', isEmployeeRelated: false },
  { id: 2, label: 'Infrastructure Charges', isEmployeeRelated: false },
  { id: 3, label: 'Company Registration Charges - India', isEmployeeRelated: false },
  { id: 4, label: 'Employee Immigration Expenses', isEmployeeRelated: true },
  { id: 5, label: 'Company Registration Charges - KSA', isEmployeeRelated: false },
  { id: 6, label: 'Visa Issuance Charges KSA', isEmployeeRelated: true },
  { id: 7, label: 'Qiwa Charges', isEmployeeRelated: true },
  { id: 8, label: 'Office Rent', isEmployeeRelated: false },
  { id: 9, label: 'Company Renewal Charges - KSA', isEmployeeRelated: false },
  { id: 10, label: 'Company Renewal Charges - UAE', isEmployeeRelated: false },
  { id: 11, label: 'Company Renewal Charges - IND', isEmployeeRelated: false },
  { id: 12, label: 'Company Renewal Charges - UK', isEmployeeRelated: false },
  { id: 13, label: 'Office Stationary', isEmployeeRelated: false },
  { id: 14, label: 'Office Maintenance', isEmployeeRelated: false },
  { id: 15, label: 'Office Cleaning Equipments', isEmployeeRelated: false },
  { id: 16, label: 'Office Furniture', isEmployeeRelated: false },
  { id: 17, label: 'Bank Charges', isEmployeeRelated: false },
  { id: 18, label: 'Invoice Against Invoice', isEmployeeRelated: false },
];

// Expense Approval Status
export const EXPENSE_APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const EXPENSE_APPROVAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const DEFAULT_EXPENSE_STATUS = 'pending';

// Expense Currencies (define ALLOWED_CURRENCIES first if not already defined above)
// If ALLOWED_CURRENCIES is already defined in vendor section above, you can reference it
// Otherwise, define EXPENSE_CURRENCIES directly:
export const EXPENSE_CURRENCIES = ['INR', 'AED', 'USD', 'EUR', 'GBP', 'SAR', 'KWD', 'OMR', 'QAR'];
export const DEFAULT_EXPENSE_CURRENCY = 'SAR';
