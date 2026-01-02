'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { supabase } from 'src/lib/supabase';

import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

export function SupabaseSignInView() {
  const [errorMessage, setErrorMessage] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setErrorMessage(null);
    setOauthLoading(true);
    try {
      const redirectTo = `https://dashboard.iotatechnologies.io/auth/v1/callback?next=${encodeURIComponent(paths.dashboard.root)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo,
          scopes: 'openid profile email offline_access',
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setOauthLoading(false);
    }
  };

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        onClick={handleMicrosoftSignIn}
        loading={oauthLoading}
        loadingIndicator="Redirecting to Microsoft..."
        startIcon={<Iconify icon="logos:microsoft-icon" width={20} />}
      >
        Sign in with Microsoft
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title="Sign in to your account"
        description={
          <>
            {`Don’t have an account? `}
            <Link component={RouterLink} href={paths.auth.supabase.signUp} variant="subtitle2">
              Get started
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {renderForm()}
    </>
  );
}
