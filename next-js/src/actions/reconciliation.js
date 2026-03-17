const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    const token = key ? JSON.parse(localStorage.getItem(key) || '{}')?.access_token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Run auto-reconciliation for a recently uploaded bank statement.
 */
export async function runAutoReconciliation({ statementId }) {
  try {
    const response = await fetch(`${API_BASE_URL}/reconciliation/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statementId }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[runAutoReconciliation] Error:', error);
    return { error: error.message };
  }
}

/**
 * Fetch all unmatched (unreconciled) transactions from both sources.
 */
export async function fetchUnmatchedTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/reconciliation/unmatched`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[fetchUnmatchedTransactions] Error:', error);
    return { statementTransactions: [], manualTransactions: [], error: error.message };
  }
}

/**
 * Submit a manual reconciliation match to the approver queue.
 */
export async function submitManualMatch({
  statementTransactionId,
  manualTransactionId,
  requestedBy,
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/reconciliation/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statementTransactionId, manualTransactionId, requestedBy }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[submitManualMatch] Error:', error);
    return { error: error.message };
  }
}

/**
 * Fetch pending reconciliation approval requests.
 */
export async function fetchPendingReconciliation() {
  try {
    const response = await fetch(`${API_BASE_URL}/reconciliation/pending`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[fetchPendingReconciliation] Error:', error);
    return { requests: [], error: error.message };
  }
}

/**
 * Approve or reject a manual reconciliation request.
 */
export async function approveReconciliation({ id, action, reviewedBy, rejectionReason }) {
  try {
    const response = await fetch(`${API_BASE_URL}/reconciliation/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewedBy, rejectionReason }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[approveReconciliation] Error:', error);
    return { error: error.message };
  }
}
