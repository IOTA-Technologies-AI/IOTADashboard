import iotaApi from 'src/lib/iota-api';

/**
 * Expense receipts go to the company OneDrive through the API
 * (supabase/expenseAttachments.ts), not with the user's own Microsoft token —
 * that token is only available right after sign-in and expires within the
 * hour, which is what broke uploads (ISS-0009).
 */

/** Starts an upload: { uploadUrl, fileName, folderPath }. */
export async function createExpenseAttachmentUploadSession(fileName, fileSize) {
  const res = await iotaApi.post('/expenses/attachments/upload-session', { fileName, fileSize });
  return res.data;
}

/** An IOTA-wide view link for the uploaded receipt: { webUrl, name }. */
export async function shareExpenseAttachment(itemId) {
  const res = await iotaApi.post('/expenses/attachments/share', { itemId });
  return res.data;
}

// 5 MiB: a multiple of 320 KiB, as OneDrive requires for every chunk but the last.
const CHUNK = 320 * 1024 * 16;

/**
 * Sends a file to a OneDrive upload session. The URL is pre-authorised, so no
 * Authorization header is sent. Resolves to the created drive item.
 */
export async function putToUploadSession(uploadUrl, file) {
  let start = 0;
  let item = null;
  while (start < file.size) {
    const end = Math.min(start + CHUNK, file.size);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` },
      body: file.slice(start, end),
    });
    if (![200, 201, 202].includes(res.status)) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed (${res.status}). ${text}`.trim());
    }

    item = await res.json();
    start = end;
  }
  return item;
}
