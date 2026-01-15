'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function PermissionDeniedView({ title, description }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Stack alignItems="center" spacing={3} sx={{ maxWidth: 480, textAlign: 'center' }}>
        <Iconify
          icon="solar:shield-warning-bold-duotone"
          width={120}
          sx={{ color: 'error.main' }}
        />

        <Typography variant="h3" color="error.main">
          {title || 'Permission Denied'}
        </Typography>

        <Typography variant="body1" color="text.secondary">
          {description ||
            "You don't have permission to access this page. Please contact your administrator if you believe this is an error."}
        </Typography>

        <Button
          component={RouterLink}
          href="/dashboard"
          size="large"
          variant="contained"
          startIcon={<Iconify icon="eva:home-fill" />}
        >
          Go to Dashboard
        </Button>
      </Stack>
    </Box>
  );
}
