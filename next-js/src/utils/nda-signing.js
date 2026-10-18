/**
 * How an NDA is executed, from its two signing methods (see
 * sql/20261018_nda_signatories_and_signing_modes.sql in the API):
 *
 *   iotaSigningMethod  partnerSigningMethod
 *   digital            digital   → both sign in the dashboard
 *   digital            manual    → IOTA in the dashboard, partner in ink
 *   manual             manual    → both in ink
 *
 * An all-ink NDA waits in the same status a partner-ink NDA does
 * (pending_partner_signatures), so its label says what it is really waiting for.
 */

export const NDA_STATUS_LABEL = {
  draft: 'Draft',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_partner_signatures: 'Pending Partner Signatures',
  fully_executed: 'Fully Executed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const isAllInkNda = (nda) => nda?.iotaSigningMethod === 'manual';

export function ndaStatusLabel(nda) {
  if (nda?.status === 'pending_partner_signatures' && nda?.partnerSigningMethod === 'manual') {
    return isAllInkNda(nda) ? 'Awaiting Ink Signatures' : 'Awaiting Partner Ink Signature';
  }
  return NDA_STATUS_LABEL[nda?.status] || nda?.status || '';
}

export function ndaSigningModeLabel(nda) {
  if (isAllInkNda(nda)) return 'IOTA and partner in ink';
  if (nda?.partnerSigningMethod === 'manual') return 'IOTA in the dashboard, partner in ink';
  return 'IOTA and partner in the dashboard';
}
