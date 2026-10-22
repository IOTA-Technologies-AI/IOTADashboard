/**
 * Document statuses (managedDocuments.status in the API). `color` is the
 * Label colour; `tone` the palette key for cards and icons.
 */
export const DOCUMENT_STATUS = {
  issued: { label: 'Not sent', color: 'default', tone: 'warning', icon: 'solar:file-bold-duotone' },
  sent: { label: 'Sent', color: 'info', tone: 'info', icon: 'custom:send-fill' },
  accepted: {
    label: 'Accepted',
    color: 'success',
    tone: 'success',
    icon: 'solar:file-check-bold-duotone',
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    tone: 'error',
    icon: 'solar:close-circle-bold-duotone',
  },
  archived: {
    label: 'Archived',
    color: 'secondary',
    tone: 'secondary',
    icon: 'solar:archive-down-minimlistic-bold',
  },
};

export const STATUS_ORDER = ['issued', 'sent', 'accepted', 'rejected', 'archived'];

export const statusOf = (status) => DOCUMENT_STATUS[status] ?? DOCUMENT_STATUS.issued;

/** Where a document's source record lives in the dashboard, if it has one. */
export const SOURCE_LABEL = {
  resource_calculation: 'Proposal',
};
