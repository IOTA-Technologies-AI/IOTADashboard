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

export default function SupabaseAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') || paths.dashboard.root;

    if (!code) {
      setError('Missing auth code in callback URL.');
      return;
    }

    supabase.auth
      .exchangeCodeForSession({ authCode: code })
      .then(({ error: authError }) => {
        if (authError) {
          setError(authError.message || 'Unable to complete sign-in.');
          return;
        }
        router.replace(next);
      })
      .catch((err) => {
        setError(err.message || 'Unexpected error during sign-in.');
      });
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
