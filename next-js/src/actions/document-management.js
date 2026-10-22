import useSWR, { mutate } from 'swr';

import { putToUploadSession } from 'src/utils/onedrive-upload';

import iotaApi from 'src/lib/iota-api';

/**
 * Files → Document Management: IOTA document IDs, and every version of a
 * document sent to a customer, stored in OneDrive. See documents/managed.ts
 * in the API.
 */

const fetcher = ([url, params]) => iotaApi.get(url, { params }).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };

const refreshAll = () =>
  mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/document-management'));

export function useManagedDocuments(params) {
  const { data, error, isLoading, isValidating } = useSWR(
    ['/document-management/documents', params],
    fetcher,
    options
  );
  return {
    documents: data?.documents ?? [],
    total: data?.total ?? 0,
    counts: data?.counts ?? {},
    error,
    loading: isLoading,
    validating: isValidating,
  };
}

export function useManagedDocument(documentId) {
  const { data, error, isLoading } = useSWR(
    documentId ? [`/document-management/documents/${documentId}`, {}] : null,
    fetcher,
    options
  );
  return {
    document: data?.document ?? null,
    versions: data?.versions ?? [],
    auditLog: data?.auditLog ?? [],
    error,
    loading: isLoading,
  };
}

/** The proposal's document, issuing its ID the first time. Idempotent. */
export async function ensureProposalDocument(proposalId) {
  const res = await iotaApi.post(`/document-management/proposals/${proposalId}/ensure`, {});
  if (res.data?.issued) refreshAll();
  return res.data.document;
}

export async function updateManagedDocument(documentId, payload) {
  const res = await iotaApi.patch(`/document-management/documents/${documentId}`, payload);
  await refreshAll();
  return res.data.document;
}

/** A version's PDF, read back from OneDrive. */
export async function getDocumentVersionFile(documentId, version) {
  const res = await iotaApi.get(
    `/document-management/documents/${documentId}/versions/${version}/file`,
    { timeout: 120000 }
  );
  return res.data;
}

/** SHA-256 of a value's JSON — what a generated PDF printed, minus its timestamp. */
export async function fingerprintOf(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send a document: store it as the next version, or — when its content matches
 * the last version sent — return that version unchanged.
 *
 * `render(version)` builds the PDF Blob printing that version number; it runs
 * once the version is known. Uploaded revisions pass a ready file and no
 * fingerprint, so they always become a new version.
 *
 * Resolves to { version, fileName, blob, reused }.
 */
export async function sendDocumentVersion(documentId, { render, fingerprint, origin, note }) {
  const base = `/document-management/documents/${documentId}`;
  const { data: plan } = await iotaApi.post(`${base}/versions/prepare`, { fingerprint });

  const blob = await render(plan.version);
  if (plan.reuse) return { version: plan.version, fileName: plan.fileName, blob, reused: true };

  const item = await putToUploadSession(plan.uploadUrl, blob);
  await iotaApi.post(`${base}/versions`, {
    version: plan.version,
    fileId: item.id,
    webUrl: item.webUrl,
    sizeBytes: blob.size,
    fingerprint,
    origin: origin || 'generated',
    note,
  });
  await refreshAll();
  return { version: plan.version, fileName: plan.fileName, blob, reused: false };
}

export const base64ToBlob = (base64, type = 'application/pdf') =>
  new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type });

/** Save a Blob under a file name. */
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
