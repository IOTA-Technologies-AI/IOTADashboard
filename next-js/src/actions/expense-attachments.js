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

// Re-exported for the expense form; shared with NDA uploads.
export { putToUploadSession } from 'src/utils/onedrive-upload';
