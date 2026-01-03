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

// Seed storage from an existing Microsoft provider token (e.g., Supabase session)
export const seedOneDriveToken = (accessToken, refreshToken) => {
  if (!accessToken) return false;

  const { accessToken: existingAccess } = getOneDriveToken();

  if (!existingAccess) {
    setOneDriveToken(accessToken, refreshToken);
    return true;
  }

  return false;
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
  const { accessToken, refreshToken } = getOneDriveToken();
  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const params = new URLSearchParams({ accessToken });
  if (folderId) params.append('folderId', folderId);

  try {
    const response = await axios.get(`${API_BASE_URL}/onedrive/files?${params.toString()}`);
    return response.data.value;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      const newAccess = refreshed.access_token || refreshed.accessToken;
      const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

      if (newAccess) {
        setOneDriveToken(newAccess, newRefresh);
        const retryParams = new URLSearchParams({ accessToken: newAccess });
        if (folderId) retryParams.append('folderId', folderId);

        const retryResponse = await axios.get(
          `${API_BASE_URL}/onedrive/files?${retryParams.toString()}`
        );
        return retryResponse.data.value;
      }
    }

    throw error;
  }
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
