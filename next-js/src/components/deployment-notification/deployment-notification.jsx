'use client';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { useDeploymentNotification } from 'src/hooks/use-deployment-notification';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function DeploymentNotification() {
  const { hasNewDeployment, deploymentInfo, dismissNotification, refreshPage } =
    useDeploymentNotification();

  return (
    <Snackbar
      open={hasNewDeployment}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ top: { xs: 16, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={dismissNotification}
        sx={{
          width: '100%',
          maxWidth: 400,
          boxShadow: (theme) => theme.customShadows.z20,
        }}
        action={
          <Button
            color="inherit"
            size="small"
            variant="contained"
            onClick={refreshPage}
            sx={{
              bgcolor: 'background.paper',
              color: 'info.main',
              '&:hover': {
                bgcolor: 'background.neutral',
              },
            }}
          >
            Refresh Now
          </Button>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:restart-bold" width={24} />
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'inherit' }}>
              App has been updated
            </Typography>
            <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
              {deploymentInfo?.environment
                ? `${deploymentInfo.environment} deployment`
                : 'New version available'}
            </Typography>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
}
