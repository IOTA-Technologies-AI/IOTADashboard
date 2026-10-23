/**
 * Labels, colours and formatting shared by the Accounting (FAH) screens.
 * Labels are English defaults; screens pass them through t() so Arabic comes
 * from src/locales/langs/ar/fah.json.
 */

export const JOURNAL_STATUS = {
  DRAFT: { label: 'Draft', color: 'default', icon: 'solar:pen-bold' },
  SUBMITTED: { label: 'Awaiting approval', color: 'warning', icon: 'solar:clock-circle-bold' },
  APPROVED: { label: 'Approved', color: 'info', icon: 'solar:check-circle-bold' },
  POSTED: { label: 'Posted', color: 'success', icon: 'solar:verified-check-bold' },
  REVERSED: { label: 'Reversed', color: 'secondary', icon: 'solar:restart-bold' },
  REJECTED: { label: 'Rejected', color: 'error', icon: 'solar:close-circle-bold' },
};
export const JOURNAL_STATUS_ORDER = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'POSTED',
  'REVERSED',
  'REJECTED',
];

export const JOURNAL_TYPE = {
  GENERAL: 'General',
  OPENING: 'Opening balances',
  REVERSAL: 'Reversal',
  SUBLEDGER: 'From the ERP',
  ALLOCATION: 'Allocation',
  INTER_PRACTICE: 'Inter-practice',
  PROFIT_SHARE: 'Profit share',
  REVALUATION: 'FX revaluation',
  CLOSING: 'Year-end closing',
  EXTERNAL: 'External',
};

export const APPROVAL_LEVEL = {
  ACCOUNTANT: 'An accountant',
  CONTROLLER: 'A finance controller',
  CFO: 'A controller, then the CFO',
};

export const ACCOUNT_CLASS = {
  ASSET: { label: 'Assets', range: '1000–1999' },
  LIABILITY: { label: 'Liabilities', range: '2000–2999' },
  EQUITY: { label: 'Equity', range: '3000–3999' },
  REVENUE: { label: 'Revenue', range: '4000–4999' },
  COST_OF_REVENUE: { label: 'Cost of revenue', range: '5000–5999' },
  OPEX: { label: 'Operating expenses', range: '6000–6999' },
  OTHER: { label: 'Other income and expense', range: '7000–7999' },
  TAX_INTERNAL: { label: 'Tax and eliminations', range: '8000–8999' },
  STATISTICAL: { label: 'Statistical', range: '9000–9999' },
};
export const ACCOUNT_CLASS_ORDER = Object.keys(ACCOUNT_CLASS);

export const NORMAL_BALANCE = { DEBIT: 'Debit', CREDIT: 'Credit', EITHER: 'Either', NONE: 'None' };

export const CONTROL_SUBLEDGER = {
  AR: 'Accounts receivable',
  AP: 'Accounts payable',
  AP2: 'Employee reimbursements',
  PAYROLL: 'Payroll',
  VAT: 'VAT',
  BANK: 'Bank',
  WALLET: 'Employee wallets',
  IC: 'Inter-entity',
};

export const PERIOD_STATUS = {
  FUTURE: { label: 'Future', color: 'default', icon: 'solar:clock-circle-outline' },
  OPEN: { label: 'Open', color: 'success', icon: 'solar:check-circle-bold' },
  SOFT_CLOSED: { label: 'Soft-closed', color: 'warning', icon: 'solar:lock-password-outline' },
  HARD_CLOSED: { label: 'Hard-closed', color: 'error', icon: 'solar:shield-check-bold' },
};

export const FAH_ROLE = {
  'finance.viewer': { label: 'Viewer', help: 'Reads the ledger and reports.' },
  'finance.accountant': { label: 'Accountant', help: 'Prepares, approves small journals, posts.' },
  'finance.controller': {
    label: 'Controller',
    help: 'Master data, periods, rates, reversals, control-account overrides.',
  },
  'finance.cfo': { label: 'CFO', help: 'Everything, second approvals and finance roles.' },
  'practice.lead': { label: 'Practice lead', help: 'Reads the ledger for their practice.' },
  auditor: { label: 'Auditor', help: 'Read-only.' },
  'fah.integration': { label: 'Integration', help: 'For external systems (later phases).' },
};

/** 1,234.50 and (1,234.50) for negatives (FR-REP-3); blank for null. */
export function fAmount(value, { blankZero = false } = {}) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (blankZero && n === 0) return '';
  const s = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${s})` : s;
}

/** Western digits, ISO date: 2026-10-23. */
export const today = () => new Date().toISOString().slice(0, 10);
