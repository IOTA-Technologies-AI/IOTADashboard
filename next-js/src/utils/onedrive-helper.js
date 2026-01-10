import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging-iotaapiserver-s572.encr.app';

const hasWindow = typeof window !== 'undefined';

// Token management
const persistTokens = (accessToken, refreshToken) => {
  if (!hasWindow) return;
  if (accessToken) localStorage.setItem('onedrive_access_token', accessToken);
  if (refreshToken) localStorage.setItem('onedrive_refresh_token', refreshToken);
};

export const setOneDriveToken = (accessToken, refreshToken) => {
  if (!hasWindow) return;
  if (!accessToken && !refreshToken) return;

  // Preserve an existing refresh token if the new one is missing
  const existing = getOneDriveToken();
  const nextRefresh = refreshToken || existing.refreshToken;

  persistTokens(accessToken || existing.accessToken, nextRefresh);
};

export const getOneDriveToken = () => {
  if (!hasWindow) return { accessToken: null, refreshToken: null };

  const accessToken = localStorage.getItem('onedrive_access_token') || null;
  const refreshToken = localStorage.getItem('onedrive_refresh_token') || null;

  return { accessToken, refreshToken };
};

export const clearOneDriveToken = () => {
  if (!hasWindow) return;
  localStorage.removeItem('onedrive_access_token');
  localStorage.removeItem('onedrive_refresh_token');
};

// Seed storage from an existing Microsoft provider token (e.g., Supabase session)
// Always updates the token if a new one is provided - ensures fresh tokens replace stale ones
export const seedOneDriveToken = (accessToken, refreshToken) => {
  if (!accessToken) return false;

  setOneDriveToken(accessToken, refreshToken);
  return true;
};

const ensureAccessToken = (fallbackAccessToken, fallbackRefreshToken) => {
  const stored = getOneDriveToken();

  if (stored.accessToken) return stored;

  if (fallbackAccessToken) {
    setOneDriveToken(fallbackAccessToken, fallbackRefreshToken);
    return {
      accessToken: fallbackAccessToken,
      refreshToken: fallbackRefreshToken || stored.refreshToken,
    };
  }

  return { accessToken: null, refreshToken: fallbackRefreshToken || stored.refreshToken };
};

// Authentication
export async function getMicrosoftAuthUrl(redirectUri) {
  const params = new URLSearchParams();
  if (redirectUri) params.append('redirectUri', redirectUri);
  const url = `${API_BASE_URL}/onedrive/auth-url${params.toString() ? `?${params}` : ''}`;
  const response = await axios.get(url);
  return response.data.authUrl;
}

export async function exchangeCodeForToken(code, redirectUri) {
  const payload = { code };
  if (redirectUri) payload.redirectUri = redirectUri;
  const response = await axios.post(`${API_BASE_URL}/onedrive/token`, payload);
  return response.data;
}

export async function refreshAccessToken(refreshToken, redirectUri) {
  const payload = { refreshToken };
  if (redirectUri) payload.redirectUri = redirectUri;
  const response = await axios.post(`${API_BASE_URL}/onedrive/refresh`, payload);
  return response.data;
}

// Helper to get stored redirect URI
export const getStoredRedirectUri = () => {
  if (!hasWindow) return null;
  return localStorage.getItem('onedrive_redirect_uri') || null;
};

// File operations
export async function listOneDriveFiles(folderId = null, options = {}) {
  const { accessToken, refreshToken } = ensureAccessToken(
    options.accessToken,
    options.refreshToken
  );

  if (!accessToken) throw new Error('Not authenticated with OneDrive');

  const params = new URLSearchParams({ accessToken });
  if (folderId) params.append('folderId', folderId);

  try {
    const url = `${API_BASE_URL}/onedrive/files?${params.toString()}`;
    console.log('[OneDrive] Fetching URL:', url);

    const response = await axios.get(url, {
      headers: { Accept: 'application/json' },
      responseType: 'json',
    });

    console.log('[OneDrive] Response status:', response.status);
    console.log('[OneDrive] Response headers:', response.headers);
    console.log('[OneDrive] Response data type:', typeof response.data);
    console.log('[OneDrive] Raw API response:', response);
    console.log('[OneDrive] response.data:', response.data);
    console.log('[OneDrive] response.data.value:', response.data?.value);

    // Handle case where response.data might be a string that needs parsing
    let data = response.data;
    if (typeof data === 'string' && data) {
      try {
        data = JSON.parse(data);
        console.log('[OneDrive] Parsed string response:', data);
      } catch (e) {
        console.error('[OneDrive] Failed to parse response string:', e);
      }
    }

    return Array.isArray(data?.value) ? data.value : [];
  } catch (error) {
    console.error('[OneDrive] Request failed:', error);
    console.log('[OneDrive] Error response:', error?.response);
    console.log('[OneDrive] Error status:', error?.response?.status);
    console.log('[OneDrive] Error data:', error?.response?.data);

    const status = error?.response?.status;
    const errorCode = error?.response?.data?.code;
    const errorMessage = error?.response?.data?.message || error?.message || '';
    const isAuthError = status === 401 || errorCode === 'unauthenticated';

    console.log('[OneDrive] Is auth error?', isAuthError, 'Has refresh token?', !!refreshToken);

    if (isAuthError && refreshToken) {
      console.log('[OneDrive] Token expired, attempting refresh...');
      try {
        const storedRedirectUri = getStoredRedirectUri();
        const refreshed = await refreshAccessToken(refreshToken, storedRedirectUri);
        console.log('[OneDrive] Refresh response keys:', Object.keys(refreshed || {}));
        console.log('[OneDrive] Has access_token:', !!refreshed?.access_token);

        const newAccess = refreshed.access_token || refreshed.accessToken;
        const newRefresh = refreshed.refresh_token || refreshed.refreshToken || refreshToken;

        if (newAccess) {
          console.log('[OneDrive] Got new access token, retrying...');
          setOneDriveToken(newAccess, newRefresh);
          const retryParams = new URLSearchParams({ accessToken: newAccess });
          if (folderId) retryParams.append('folderId', folderId);

          const retryResponse = await axios.get(
            `${API_BASE_URL}/onedrive/files?${retryParams.toString()}`
          );
          return Array.isArray(retryResponse.data?.value) ? retryResponse.data.value : [];
        }
      } catch (refreshError) {
        console.error(
          '[OneDrive] Refresh failed:',
          refreshError?.response?.data || refreshError?.message
        );
        // Clear tokens if refresh failed - user needs to re-authenticate
        clearOneDriveToken();
        const refreshErrorMsg =
          refreshError?.response?.data?.message || refreshError?.message || '';
        if (refreshErrorMsg.includes('re-authenticate') || refreshErrorMsg.includes('expired')) {
          throw new Error('OneDrive session expired. Please reconnect your OneDrive account.');
        }
        throw refreshError;
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

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const base64 = typeof result === 'string' ? result.split(',').pop() : '';
      resolve(base64 || '');
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

export async function uploadOneDriveFiles(
  files,
  { folderPath = '', userId, accessToken, refreshToken } = {}
) {
  if (!files || !files.length) return [];

  const tokens = ensureAccessToken(accessToken, refreshToken);
  if (!tokens.accessToken) throw new Error('Not authenticated with OneDrive');

  const uploadWithToken = async (file, token) => {
    const base64Content = await fileToBase64(file);

    const payload = {
      accessToken: token,
      folderPath,
      fileName: file.name,
      fileContent: base64Content,
      userId,
    };

    const response = await axios.post(`${API_BASE_URL}/onedrive/upload`, payload, {
      headers: { 'Content-Type': 'application/json' },
      maxBodyLength: Infinity,
    });

    return response.data;
  };

  const uploads = files.map(async (file) => {
    try {
      return await uploadWithToken(file, tokens.accessToken);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 && tokens.refreshToken) {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        const newAccess = refreshed.access_token || refreshed.accessToken;
        const newRefresh = refreshed.refresh_token || refreshed.refreshToken || tokens.refreshToken;

        if (newAccess) {
          setOneDriveToken(newAccess, newRefresh);
          return await uploadWithToken(file, newAccess);
        }
      }

      throw error;
    }
  });

  return Promise.all(uploads);
}
