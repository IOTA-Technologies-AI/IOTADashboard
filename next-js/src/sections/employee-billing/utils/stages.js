/**
 * Collection pipeline stages for employee-billing invoices.
 *
 * `invoices.status` (draft → pending → approved | rejected → paid) is the
 * Invoice module's own machine and is untouched. After internal approval the
 * backend folds `collectionStage` into an EFFECTIVE stage, which is what every
 * screen here shows. The backend validates every transition; this file only
 * describes them for the UI.
 */

export const STAGES = {
  draft: { label: 'Draft', short: 'Draft', color: 'default' },
  awaiting_approval: {
    label: 'Awaiting internal approval',
    short: 'Awaiting approval',
    color: 'warning',
  },
  rejected: { label: 'Rejected internally', short: 'Rejected', color: 'error' },
  ready_to_send: { label: 'Approved — ready to send', short: 'Ready to send', color: 'info' },
  sent_to_customer: { label: 'Sent to customer', short: 'Sent', color: 'primary' },
  customer_queried: { label: 'Customer raised a query', short: 'Queried', color: 'warning' },
  customer_approved: {
    label: 'Approved by customer',
    short: 'Customer approved',
    color: 'secondary',
  },
  receipt_requested: {
    label: 'Receipt requested from Finance',
    short: 'Receipt requested',
    color: 'info',
  },
  paid: { label: 'Paid', short: 'Paid', color: 'success' },
};

export const STAGE_ORDER = [
  'draft',
  'awaiting_approval',
  'rejected',
  'ready_to_send',
  'sent_to_customer',
  'customer_queried',
  'customer_approved',
  'receipt_requested',
  'paid',
];

/** Stages that still owe IOTA money. */
export const OPEN_STAGES = [
  'awaiting_approval',
  'ready_to_send',
  'sent_to_customer',
  'customer_queried',
  'customer_approved',
  'receipt_requested',
];

/**
 * What a user can do next from each effective stage.
 * kind: 'send'  → email the PDF (moves to sent_to_customer)
 *       'stage' → plain transition with a note
 *       'paid'  → transition that also marks the invoice paid (admin+)
 */
export const NEXT_ACTIONS = {
  ready_to_send: [
    {
      kind: 'send',
      stage: 'sent_to_customer',
      label: 'Send to customer',
      icon: 'eva:paper-plane-fill',
    },
    {
      kind: 'stage',
      stage: 'sent_to_customer',
      label: 'Mark as sent (sent outside the system)',
      icon: 'eva:checkmark-fill',
    },
  ],
  sent_to_customer: [
    {
      kind: 'stage',
      stage: 'customer_approved',
      label: 'Customer approved',
      icon: 'eva:checkmark-circle-2-fill',
    },
    {
      kind: 'stage',
      stage: 'customer_queried',
      label: 'Customer raised a query',
      icon: 'eva:question-mark-circle-fill',
    },
    {
      kind: 'send',
      stage: 'sent_to_customer',
      label: 'Resend to customer',
      icon: 'eva:refresh-fill',
    },
  ],
  customer_queried: [
    {
      kind: 'send',
      stage: 'sent_to_customer',
      label: 'Resend to customer',
      icon: 'eva:paper-plane-fill',
    },
    {
      kind: 'stage',
      stage: 'customer_approved',
      label: 'Customer approved',
      icon: 'eva:checkmark-circle-2-fill',
    },
  ],
  customer_approved: [
    {
      kind: 'stage',
      stage: 'receipt_requested',
      label: 'Receipt requested from Finance',
      icon: 'eva:file-text-fill',
    },
  ],
  receipt_requested: [
    {
      kind: 'paid',
      stage: 'paid',
      label: 'Payment received — mark as paid',
      icon: 'eva:credit-card-fill',
    },
  ],
};

export function stageMeta(stage) {
  return STAGES[stage] || { label: stage || '—', short: stage || '—', color: 'default' };
}

export function isOpenStage(stage) {
  return OPEN_STAGES.includes(stage);
}

/** YYYY-MM for the current month, the default billing period. */
export function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function periodLabel(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || '';
  const [y, m] = period.split('-');
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// ─── Customer contacts and submission channel ────────────────────────────────

export const CONTACT_ROLES = {
  approver: 'Approver (department / employee manager)',
  delegate: 'Delegate (acts for an approver)',
  finance: 'Finance (raises the payment receipt)',
  cc: 'Copied on every invoice',
};

export const SUBMISSION_CHANNELS = {
  email: 'Email to the contacts below',
  portal: 'Customer portal (Oracle Cloud, SAP Ariba…)',
  manual: 'Handed over another way',
};

export const PORTAL_SYSTEMS = {
  oracle_cloud: 'Oracle Cloud',
  sap_ariba: 'SAP Ariba',
  coupa: 'Coupa',
  other: 'Customer portal',
};

export function portalLabel(system) {
  return PORTAL_SYSTEMS[system] || 'customer portal';
}

/**
 * The actions offered for an invoice. A contract that is submitted through the
 * customer's own system has no one to email, so "send" becomes "record the
 * submission" with the reference the portal returned.
 */
export function actionsFor(row) {
  const base = NEXT_ACTIONS[row?.effectiveStage] || [];
  if (row?.submissionChannel !== 'portal') return base;
  const canSubmit = base.some((a) => a.stage === 'sent_to_customer');
  const others = base.filter((a) => a.stage !== 'sent_to_customer');
  if (!canSubmit) return others;
  return [
    {
      kind: 'portal',
      stage: 'sent_to_customer',
      label: `Record submission on ${portalLabel(row.portalSystem)}`,
      icon: 'eva:cloud-upload-fill',
    },
    ...others,
  ];
}
