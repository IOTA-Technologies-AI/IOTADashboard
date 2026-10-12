/** Shared labels and colours for leads. */

export const LEAD_STATUS = {
  new: { label: 'New', color: 'error' },
  contacted: { label: 'Contacted', color: 'info' },
  converted: { label: 'Converted', color: 'success' },
  rejected: { label: 'Rejected', color: 'default' },
  archived: { label: 'Archived', color: 'default' },
};

export const LEAD_SOURCE = {
  webflow_contact: { label: 'Website · Contact', short: 'Contact', color: 'primary' },
  webflow_careers: { label: 'Website · Careers', short: 'Careers', color: 'secondary' },
  webflow_newsletter: { label: 'Website · Newsletter', short: 'Newsletter', color: 'info' },
  linkedin: { label: 'LinkedIn', short: 'LinkedIn', color: 'warning' },
};

/** PDPL basis: what the person agreed to. */
export const CONSENT_BASIS = {
  marketing_consent: {
    label: 'Marketing consent',
    hint: 'Subscribed — may receive marketing until they withdraw.',
  },
  enquiry: {
    label: 'Enquiry',
    hint: 'Asked a question — reply to it, but do not add to a mailing list.',
  },
  application: {
    label: 'Job application',
    hint: 'Applied for a job — not a sales prospect; keep only as long as hiring needs it.',
  },
};

export const DEAD_LETTER_REASON = {
  unrouted: 'Form not mapped',
  invalid: 'No usable email',
  store_failed: 'Could not be saved',
};
