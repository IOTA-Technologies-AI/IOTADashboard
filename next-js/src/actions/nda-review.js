import iotaApi from 'src/lib/iota-api';

/**
 * AI review of NDAs against the IOTA standard, and the exceptional-approval
 * workflow. See ndas/ndaReview.ts in the API.
 */

export async function getNdaReview(id) {
  const res = await iotaApi.get(`/ndas/${id}/review`);
  return res.data;
}

/** Runs the review. Reading and checking a long NDA can take a minute. */
export async function runNdaReview(id) {
  const res = await iotaApi.post(`/ndas/${id}/review`, {}, { timeout: 240000 });
  return res.data?.review;
}

export async function requestNdaException(id, note) {
  const res = await iotaApi.post(`/ndas/${id}/review/exception`, { note });
  return res.data?.review;
}

export async function decideNdaException(id, approved, note) {
  const res = await iotaApi.post(`/ndas/${id}/review/exception/decision`, { approved, note });
  return res.data?.review;
}

/** Whether an NDA must be reviewed before signing — mirrors ndaReviewGate.ts. */
export function ndaNeedsReview(nda) {
  if (!nda) return false;
  if (nda.documentSource === 'external_upload') return true;
  const clauses = (nda.clauses || []).filter((c) => (c?.content || '').trim());
  const overrides = Object.values(nda.sectionOverrides || {}).filter(
    (v) => typeof v === 'string' && v.trim()
  );
  return clauses.length > 0 || overrides.length > 0;
}

/**
 * Why the NDA cannot go for signature yet, or '' when it can. Mirrors the
 * API's gate so the button explains itself; the API is the enforcing copy.
 */
export function ndaSigningBlockedReason(nda) {
  if (!nda || !('reviewStatus' in nda) || !ndaNeedsReview(nda)) return '';
  if (!nda.reviewStatus || nda.reviewStatus === 'not_reviewed') {
    return 'Run the IOTA standard review first.';
  }
  if (nda.reviewStatus === 'attention' && nda.exceptionStatus !== 'approved') {
    if (nda.exceptionStatus === 'pending') return 'Waiting for exception approval.';
    if (nda.exceptionStatus === 'rejected')
      return 'Exception rejected — correct the clauses and review again.';
    return 'Clauses need attention — correct them or request an exception.';
  }
  return '';
}
