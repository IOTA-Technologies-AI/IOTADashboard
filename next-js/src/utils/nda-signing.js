/**
 * How an NDA is executed, from its two signing methods (see
 * sql/20261018_nda_signatories_and_signing_modes.sql in the API):
 *
 *   iotaSigningMethod  partnerSigningMethod
 *   digital            digital   → both sign in the dashboard
 *   digital            manual    → IOTA in the dashboard, partner in ink
 *   manual             manual    → both in ink
 *
 * and where it is in its life, for the status chip.
 *
 * The stored `status` stays the workflow state the API enforces (a draft can
 * be edited and submitted; nothing else can). Before submission, the draft's
 * review and exception fields say how far it has got, so the chip shows that:
 *
 *   Draft → Under Review → Under Exceptional Approval
 *         → Exceptionally Approved | Exceptional Approval Rejected
 *         → Pending IOTA Signatures → Pending Partner Signatures → Fully Executed
 *
 * Editing the wording clears the review (ndaReviewGate.ts REVIEW_RESET), so
 * the chip goes back to Draft by itself.
 */

export const NDA_STATUS_LABEL = {
  draft: 'Draft',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_partner_signatures: 'Pending Partner Signatures',
  fully_executed: 'Fully Executed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  draft: 'default',
  pending_iota_signatures: 'warning',
  pending_partner_signatures: 'info',
  fully_executed: 'success',
  expired: 'error',
  cancelled: 'error',
};

export const isAllInkNda = (nda) => nda?.iotaSigningMethod === 'manual';

/** Where a draft is in review / exceptional approval, or null when nowhere yet. */
function draftStage(nda) {
  switch (nda?.exceptionStatus) {
    case 'pending':
      return { label: 'Under Exceptional Approval', color: 'secondary' };
    case 'approved':
      return { label: 'Exceptionally Approved', color: 'success' };
    case 'rejected':
      return { label: 'Exceptional Approval Rejected', color: 'error' };
    default:
      break;
  }
  if (nda?.reviewStatus === 'attention') return { label: 'Under Review', color: 'warning' };
  if (nda?.reviewStatus === 'clear') return { label: 'Review Passed', color: 'info' };
  return null;
}

/** { label, color } for the status chip. */
export function ndaStatusChip(nda) {
  const status = nda?.status;
  if (status === 'draft') {
    const stage = draftStage(nda);
    if (stage) return stage;
  }
  if (status === 'pending_partner_signatures' && nda?.partnerSigningMethod === 'manual') {
    return {
      label: isAllInkNda(nda) ? 'Awaiting Ink Signatures' : 'Awaiting Partner Ink Signature',
      color: 'info',
    };
  }
  return {
    label: NDA_STATUS_LABEL[status] || status || '',
    color: STATUS_COLOR[status] || 'default',
  };
}

export const ndaStatusLabel = (nda) => ndaStatusChip(nda).label;

export function ndaSigningModeLabel(nda) {
  if (isAllInkNda(nda)) return 'IOTA and partner in ink';
  if (nda?.partnerSigningMethod === 'manual') return 'IOTA in the dashboard, partner in ink';
  return 'IOTA and partner in the dashboard';
}
