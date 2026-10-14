import { CONSENT_BASIS } from '../leads/lead-labels';

/** Labels shared by the consent registers and each person's consent panel. */

export const CONSENT_PURPOSE = {
  ...CONSENT_BASIS,
  candidate_intake: {
    label: 'Employment preparation',
    hint: 'Personal, residency, family, insurance and salary details to prepare the hire.',
  },
  onboarding: {
    label: 'Employment records',
    hint: 'Employment records, payroll, GOSI, insurance and government registrations.',
  },
};

export const CONSENT_METHOD = {
  form: 'Website form',
  applicant: 'Ticked by the person',
  webflow_form: 'Website careers form (no checkbox)',
  recruiter_attested: 'Confirmed by staff',
};

export const CONSENT_STATUS = {
  active: { label: 'Active', color: 'success' },
  withdrawn: { label: 'Withdrawn', color: 'error' },
  missing: { label: 'Not recorded', color: 'warning' },
};

export const APPLICATION_SOURCE = {
  website_form: 'Website',
  api: 'Careers API',
  dashboard: 'Dashboard',
};
