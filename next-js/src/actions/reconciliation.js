import { apiFetch } from 'src/lib/api-fetch';

// Runs in the browser so the signed-in user's bearer token is attached; see src/lib/api-fetch.

/**
 * Run auto-reconciliation for a recently uploaded bank statement.
 */
export async function runAutoReconciliation({ statementId }) {
  try {
    const response = await apiFetch(`/reconciliation/auto`, {
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
    const response = await apiFetch(`/reconciliation/unmatched`, {
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
    const response = await apiFetch(`/reconciliation/manual`, {
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
    const response = await apiFetch(`/reconciliation/pending`, {
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
    const response = await apiFetch(`/reconciliation/approve`, {
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
