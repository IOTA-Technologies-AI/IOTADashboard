import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import axios from 'src/lib/axios';

import { ConfirmDialog } from 'src/components/custom-dialog';

import { USER_ID, JWT_STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export function jwtDecode(token) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded || !('exp' in decoded)) {
      return false;
    }

    const currentTime = Date.now() / 1000;

    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Error during token validation:', error);
    return false;
  }
}

// ----------------------------------------------------------------------

export function tokenExpired(exp) {
  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;
  // setTimeout(() => {
  //   try {
  //     alert('Token expired!');
  //     sessionStorage.removeItem(JWT_STORAGE_KEY);
  //     window.location.href = paths.auth.jwt.signIn;
  //   } catch (error) {
  //     console.error('Error during token expiration:', error);
  //     throw error;
  //   }
  // }, timeLeft);
  setTimeout(() => {
    try {
      <ConfirmDialog
        title="Session Expired"
        content={
          <>
            Your Session has expired. Please log in again.
            <Box sx={{ typography: 'caption', color: 'error.main', mt: 2 }}>
              <strong>NOTE:</strong> You have to re-login to continue using the application.
            </Box>
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              sessionStorage.removeItem(JWT_STORAGE_KEY);
              window.location.href = '/auth/jwt/login';
            }}
          >
            Ok
          </Button>
        }
      />;
    } catch (error) {
      console.error('Error during token expiration:', error);
      throw error;
    }
  }, timeLeft);
}

// ----------------------------------------------------------------------

export async function setSession(accessToken, userId) {
  try {
    if (accessToken) {
      sessionStorage.setItem(JWT_STORAGE_KEY, accessToken);

      sessionStorage.setItem(USER_ID, userId);

      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const decodedToken = jwtDecode(accessToken); // ~3 days by minimals server

      if (decodedToken && 'exp' in decodedToken) {
        tokenExpired(decodedToken.exp);
      } else {
        throw new Error('Invalid access token!');
      }
    } else {
      sessionStorage.removeItem(JWT_STORAGE_KEY);
      sessionStorage.removeItem(USER_ID);
      delete axios.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('Error during set session:', error);
    throw error;
  }
}
