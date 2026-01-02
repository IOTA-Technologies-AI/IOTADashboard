'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { CONFIG } from 'src/global-config';

const normalizeSupabaseUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/?$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const parseScopes = (scopeString) =>
  scopeString
    ?.split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean) || [];

export default function OAuthConsentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const transactionId =
    searchParams.get('transaction_id') || searchParams.get('transactionId') || '';
  const clientId = searchParams.get('client_id') || searchParams.get('clientId') || '';
  const redirectUri = searchParams.get('redirect_uri') || searchParams.get('redirectUri') || '';
  const state = searchParams.get('state') || '';
  const scopes = useMemo(() => parseScopes(searchParams.get('scope')), [searchParams]);
  const appName = searchParams.get('client_name') || 'Third-party application';

  const supabaseAuthUrl = `${normalizeSupabaseUrl(CONFIG.supabase.url)}/auth/v1/oauth/authorize`;

  const handleAction = async (accept) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(supabaseAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transaction_id: transactionId, accept }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Unable to process consent');
      }

      const data = await res.json().catch(() => ({}));
      const location = data?.redirect_to || data?.redirect || redirectUri || '/';

      if (location) {
        const url =
          state && !location.includes('state=')
            ? `${location}${location.includes('?') ? '&' : '?'}state=${encodeURIComponent(state)}`
            : location;
        router.replace(url);
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const disableActions = loading || !transactionId;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 8 } }}>
      <Card variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Typography variant="h4">Authorize access</Typography>
          <Typography color="text.secondary">
            {appName} is requesting access to your account.
          </Typography>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              App
            </Typography>
            <Typography>{appName}</Typography>
            {clientId ? (
              <Typography variant="caption" color="text.secondary">
                Client ID: {clientId}
              </Typography>
            ) : null}
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Requested scopes
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {scopes.length ? (
                scopes.map((scope) => <Chip key={scope} label={scope} size="small" />)
              ) : (
                <Chip label="basic" size="small" />
              )}
            </Stack>
          </Box>

          <Divider />

          {error ? (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
            <Button
              variant="outlined"
              color="inherit"
              disabled={disableActions}
              onClick={() => handleAction(false)}
            >
              Deny
            </Button>
            <Button
              variant="contained"
              disabled={disableActions}
              onClick={() => handleAction(true)}
              startIcon={loading ? <CircularProgress color="inherit" size={16} /> : null}
            >
              Allow
            </Button>
          </Stack>

          {!transactionId ? (
            <Alert severity="warning">
              Missing transaction ID. Please start the authorization flow again.
            </Alert>
          ) : null}
        </Stack>
      </Card>
    </Container>
  );
}
