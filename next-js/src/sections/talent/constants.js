export const REQUIREMENT_STATUS = {
  new: { label: 'New', color: 'default' },
  jd_ready: { label: 'JD ready', color: 'info' },
  posted: { label: 'Posted', color: 'success' },
  on_hold: { label: 'On hold', color: 'warning' },
  filled: { label: 'Filled', color: 'primary' },
  closed: { label: 'Closed', color: 'default' },
};

export const PRIORITY = {
  low: { label: 'Low', color: 'default' },
  normal: { label: 'Normal', color: 'info' },
  high: { label: 'High', color: 'warning' },
  urgent: { label: 'Urgent', color: 'error' },
};

export const EMPLOYMENT_TYPES = ['full-time', 'contract', 'part-time', 'freelance', 'internship'];

/** Public careers page linked from LinkedIn posts. */
export const CAREERS_URL =
  process.env.NEXT_PUBLIC_CAREERS_URL || 'https://www.iotatechnologies.ai/careers';

export const SHARE_DURATIONS = [1, 3, 7, 14, 30];
