/**
 * Sending a file to a OneDrive upload session that the API opened with the
 * app's credentials. The browser needs no Microsoft token, and the file never
 * passes through the API, so there is no request-size limit (ISS-0009,
 * ISS-0010). Used for expense receipts and NDA documents.
 */

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
