import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging-iotaapiserver-s572.encr.app';

// Token management
export const setOneDriveToken = (accessToken, refreshToken) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('onedrive_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('onedrive_refresh_token', refreshToken);
    }
  }
};

export const getOneDriveToken = () => {
  if (typeof window !== 'undefined') {
    return {
      accessToken: localStorage.getItem('onedrive_access_token'),
      refreshToken: localStorage.getItem('onedrive_refresh_token'),
    };
  }
  return { accessToken: null, refreshToken: null };
};

export const clearOneDriveToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('onedrive_access_token');
    localStorage.removeItem('onedrive_refresh_token');
  }
};

// Authentication
export async function getMicrosoftAuthUrl() {
  const response = await axios.get(`${API_BASE_URL}/onedrive/auth-url`);
  return response.data.authUrl;
}

export async function exchangeCodeForToken(code) {
  const response = await axios.post(`${API_BASE_URL}/onedrive/token`, { code });
  return response.data;
}

export async function refreshAccessToken(refreshToken) {
  const response = await axios.post(`${API_BASE_URL}/onedrive/refresh`, { refreshToken });
  return response.data;
}

// File operations
export async function listOneDriveFiles(folderId = null) {
  const { accessToken } = getOneDriveToken();
  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const params = new URLSearchParams({ accessToken });
  if (folderId) params.append('folderId', folderId);

  const response = await axios.get(`${API_BASE_URL}/onedrive/files?${params.toString()}`);
  return response.data.value;
}

export async function getOneDriveItem(itemId) {
  const { accessToken } = getOneDriveToken();
  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const response = await axios.get(
    `${API_BASE_URL}/onedrive/items/${itemId}?accessToken=${accessToken}`
  );
  return response.data;
}

export async function getOneDriveDownloadUrl(itemId) {
  const { accessToken } = getOneDriveToken();
  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const response = await axios.get(
    `${API_BASE_URL}/onedrive/download/${itemId}?accessToken=${accessToken}`
  );
  return response.data.downloadUrl;
}

export async function searchOneDrive(query) {
  const { accessToken } = getOneDriveToken();
  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const response = await axios.get(
    `${API_BASE_URL}/onedrive/search?accessToken=${accessToken}&query=${encodeURIComponent(query)}`
  );
  return response.data.value;
}
