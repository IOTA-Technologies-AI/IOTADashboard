'use client';

import { useRef, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { apiMessage, completeLinkedInConnect } from 'src/actions/linkedin';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/**
 * LinkedIn sends the admin back here after they sign in. The code is handed to
 * the API, which exchanges it for tokens; then it is back to the LinkedIn page.
 */
export function LinkedInCallbackView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const started = useRef(false); // the code works once; don't send it twice

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const denied = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (denied) {
      setError(
        denied === 'user_cancelled_login' || denied === 'user_cancelled_authorize'
          ? 'The LinkedIn sign-in was cancelled.'
          : `LinkedIn did not connect: ${searchParams.get('error_description') || denied}`
      );
      return;
    }
    if (!code || !state) {
      setError('LinkedIn did not send a sign-in code back. Start again from the LinkedIn page.');
      return;
    }
    completeLinkedInConnect({ code, state })
      .then(({ status }) => {
        toast.success(
          status?.connection?.organization
            ? `Connected to ${status.connection.organization.name}.`
            : 'LinkedIn connected. Choose the company page.'
        );
        router.replace(paths.dashboard.integration.linkedin);
      })
      .catch((err) => setError(apiMessage(err, 'LinkedIn could not be connected.')));
  }, [router, searchParams]);

  return (
    <DashboardContent maxWidth="sm">
      <Card sx={{ p: 3, mt: 5 }}>
        {error ? (
          <Stack spacing={2}>
            <Alert severity="error">{error}</Alert>
            <Button
              variant="contained"
              onClick={() => router.replace(paths.dashboard.integration.linkedin)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Back to LinkedIn
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle1">Connecting LinkedIn…</Typography>
            <LinearProgress />
          </Stack>
        )}
      </Card>
    </DashboardContent>
  );
}
