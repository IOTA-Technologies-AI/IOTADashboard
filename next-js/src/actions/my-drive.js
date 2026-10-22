import { putToUploadSession } from 'src/utils/onedrive-upload';

import iotaApi from 'src/lib/iota-api';

/**
 * The signed-in user's own OneDrive, for Files → Business Files. The API opens
 * it with the app's credentials (onedrive/onedrive.ts, /onedrive/me/*), so the
 * browser holds no Microsoft token and there is no OneDrive session to expire.
 */

export async function listMyDriveFiles(folderId) {
  const res = await iotaApi.get('/onedrive/me/files', {
    params: folderId ? { folderId } : undefined,
  });
  return res.data?.value ?? [];
}

/** Items shared with the user. Optional: an empty list when Graph does not serve it. */
export async function listMySharedItems() {
  const res = await iotaApi.get('/onedrive/me/shared');
  return res.data?.value ?? [];
}

/** Uploads files straight to OneDrive (no size limit). Resolves to one result per file. */
export async function uploadToMyDrive(files, folderPath) {
  return Promise.all(
    files.map(async (file) => {
      try {
        const { data } = await iotaApi.post('/onedrive/me/upload-session', {
          folderPath,
          fileName: file.name,
        });
        return await putToUploadSession(data.uploadUrl, file);
      } catch (error) {
        return { error, name: file.name };
      }
    })
  );
}
