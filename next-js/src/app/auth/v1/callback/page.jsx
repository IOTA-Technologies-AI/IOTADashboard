'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

// Parse query-style params from a hash fragment (e.g. #code=...&access_token=...)
const parseHashParams = (hashString) => {
  const hash = hashString?.startsWith('#') ? hashString.slice(1) : hashString || '';
  const params = new URLSearchParams(hash);
  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
};

export default function SupabaseAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') || paths.dashboard.root;
    const { code: hashCode, accessToken, refreshToken } = parseHashParams(window.location.hash);

    const useCode = code || hashCode;

    const finish = () => router.replace(next);

    const handleError = (msg) => setError(msg || 'Unable to complete sign-in.');

    // If Supabase returned tokens in the hash (implicit flow), set the session directly
    if (accessToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            handleError(sessionError.message);
            return;
          }
          finish();
        })
        .catch((err) => handleError(err.message));
      return;
    }

    if (!useCode) {
      handleError('Missing auth code in callback URL.');
      return;
    }

    supabase.auth
      .exchangeCodeForSession({ authCode: useCode })
      .then(({ error: authError }) => {
        if (authError) {
          handleError(authError.message);
          return;
        }
        finish();
      })
      .catch((err) => handleError(err.message));
  }, [router, searchParams]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card variant="outlined">
        <Box sx={{ p: 4 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={32} />
            <Typography variant="h6">Finishing sign-in…</Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </Box>
      </Card>
    </Container>
  );
}
