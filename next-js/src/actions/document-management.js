import useSWR, { mutate } from 'swr';

import { putToUploadSession } from 'src/utils/onedrive-upload';
import { stampPdf, setQuotationNumber } from 'src/utils/document-stamp';

import iotaApi from 'src/lib/iota-api';

/**
 * Files → Document Management: IOTA document IDs, and every version of a
 * document sent to a customer, stored in OneDrive. See documents/managed.ts
 * in the API.
 */

const fetcher = ([url, params]) => iotaApi.get(url, { params }).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };
// A stable empty list, so effects keyed on a list do not re-run on every render while loading.
const EMPTY = [];

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

/**
 * Practices, document types and classifications. Types are one list kept in
 * appConfig, each tagged to the practices it applies to:
 * { practices: [{ id, name }], types: [{ id, code, name, practices, active }],
 *   classifications, canEditTypes, error, loading }.
 */
export function useDocumentCatalog(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/document-management/doc-types', {}] : null,
    fetcher,
    options
  );
  return {
    practices: data?.practices ?? EMPTY,
    types: data?.types ?? EMPTY,
    classifications: data?.classifications ?? EMPTY,
    canEditTypes: Boolean(data?.canEditTypes),
    error,
    loading: isLoading,
  };
}

/** The active types a practice uses. */
export const typesForPractice = (types, practice) =>
  types.filter((t) => t.active && t.practices.includes(Number(practice)));

/** Save the document types (super-admins). Resolves to the saved catalog. */
export async function saveDocumentTypes(types) {
  const res = await iotaApi.put('/document-management/doc-types', { types });
  await mutate(['/document-management/doc-types', {}], res.data, false);
  return res.data;
}

/**
 * Register a document prepared outside the dashboard and upload `file` as v1.
 * Resolves to the document. If the upload fails the document still exists,
 * with no version, and the file can be uploaded again from its page.
 */
export async function createManagedDocument(payload, file, note) {
  const res = await iotaApi.post('/document-management/documents', payload);
  const { document } = res.data;
  await sendDocumentVersion(document.documentId, {
    render: uploadedFile(file, document),
    origin: 'uploaded',
    extension: extensionOf(file.name),
    note,
  });
  return document;
}

/**
 * `render` for an uploaded file: a PDF has any "Quotation #…" in it reprinted
 * as `<ID>-v<version>` before it is kept in OneDrive, so the stored copy reads
 * the same as the one handed out. Other files are kept as they are.
 */
export const uploadedFile = (file, document) => async (version) => {
  if (extensionOf(file.name) !== 'pdf') return file;
  const { blob } = await setQuotationNumber(file, `${document.display}-v${version}`);
  return blob;
};

/**
 * The proposal's document, or null when it has none. With `issue`, its ID is
 * issued the first time, under `practice`. Idempotent.
 */
export async function ensureProposalDocument(proposalId, { issue = false, practice } = {}) {
  const res = await iotaApi.post(`/document-management/proposals/${proposalId}/ensure`, {
    issue,
    practice,
  });
  if (res.data?.issued) refreshAll();
  return res.data.document;
}

export async function updateManagedDocument(documentId, payload) {
  const res = await iotaApi.patch(`/document-management/documents/${documentId}`, payload);
  await refreshAll();
  return res.data.document;
}

/**
 * A version's file as handed out: an uploaded PDF gets the Document Management
 * stamp (ID, version, current classification) on its first page, and any
 * "Quotation #…" in it reprinted as `<ID>-v<version>`; a generated
 * proposal already carries it; other file types are returned as they are.
 * Resolves to { blob, fileName, stamped }.
 */
export async function getHandoutFile(document, version) {
  const file = await getDocumentVersionFile(document.documentId, version);
  const blob = base64ToBlob(file.base64, mimeOf(file.fileName));
  if (extensionOf(file.fileName) !== 'pdf' || file.origin === 'generated') {
    return { blob, fileName: file.fileName, stamped: false };
  }
  try {
    const stamped = await stampPdf(blob, {
      documentId: document.display,
      version,
      classification: document.classification,
      positions: document.stampPositions,
      // A quotation number typed into the file always reads as this version.
      quotationNumber: `${document.display}-v${version}`,
    });
    return { blob: stamped, fileName: file.fileName, stamped: true };
  } catch (err) {
    // A PDF pdf-lib cannot rewrite (e.g. encrypted) is handed out unstamped.
    console.error('Document stamp failed:', err);
    return { blob, fileName: file.fileName, stamped: false, stampError: true };
  }
}

/** A version's file, read back from OneDrive. */
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
 * once the version is known. Uploaded files pass a ready file, their
 * `extension` and no fingerprint, so they always become a new version.
 *
 * Resolves to { version, fileName, blob, reused }.
 */
export async function sendDocumentVersion(
  documentId,
  { render, fingerprint, origin, note, extension }
) {
  const base = `/document-management/documents/${documentId}`;
  const { data: plan } = await iotaApi.post(`${base}/versions/prepare`, {
    fingerprint,
    extension,
  });

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
    extension,
    note,
  });
  await refreshAll();
  return { version: plan.version, fileName: plan.fileName, blob, reused: false };
}

/** File types a version may be (the API refuses others). */
export const DOCUMENT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export const extensionOf = (fileName) =>
  String(fileName || '')
    .split('.')
    .pop()
    .toLowerCase();

export const isAcceptedFile = (file) =>
  Object.values(DOCUMENT_ACCEPT).some((exts) => exts.includes(`.${extensionOf(file?.name)}`));

/** The MIME type for a file name, so previews and downloads open correctly. */
export const mimeOf = (fileName) => {
  const ext = `.${extensionOf(fileName)}`;
  return (
    Object.keys(DOCUMENT_ACCEPT).find((type) => DOCUMENT_ACCEPT[type].includes(ext)) ||
    'application/octet-stream'
  );
};

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
