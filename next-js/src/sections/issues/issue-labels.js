/** Shared labels and colours for issue severity and status. */

export const SEVERITY = {
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'info' },
  high: { label: 'High', color: 'warning' },
  critical: { label: 'Critical', color: 'error' },
};

export const STATUS = {
  new: { label: 'New', color: 'error' },
  triaged: { label: 'Triaged', color: 'warning' },
  in_progress: { label: 'In progress', color: 'info' },
  fixed: { label: 'Fixed', color: 'success' },
  wont_fix: { label: "Won't fix", color: 'default' },
  duplicate: { label: 'Duplicate', color: 'default' },
};
