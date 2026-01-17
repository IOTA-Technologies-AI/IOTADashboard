'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  getIntegration,
  deleteIntegration,
  testIntegrationConnection,
} from 'src/actions/integrations';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AVAILABLE_INTEGRATIONS } from '../integration-constants';

// ----------------------------------------------------------------------

export function IntegrationDetailsView({ integrationName, integrationType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState(null);

  const integrationConfig = AVAILABLE_INTEGRATIONS.find(
    (i) => i.name === integrationName && i.type === integrationType
  );

  const fetchIntegration = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIntegration(integrationName, integrationType);
      setIntegration(data);
    } catch (error) {
      console.error('Error fetching integration:', error);
    } finally {
      setLoading(false);
    }
  }, [integrationName, integrationType]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      await testIntegrationConnection(integrationName, integrationType);
      toast.success('Connection test passed!');
      fetchIntegration();
    } catch (error) {
      toast.error(error.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }, [integrationName, integrationType, fetchIntegration]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to remove this integration?')) return;

    try {
      await deleteIntegration(integrationName, integrationType);
      toast.success('Integration removed successfully!');
      router.push(paths.dashboard.integration.root);
    } catch (error) {
      toast.error(error.message || 'Failed to remove integration');
    }
  }, [integrationName, integrationType, router]);

  if (loading) {
    return (
      <DashboardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
        >
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  const getStatusColor = () => {
    if (integration?.lastError) return 'error';
    if (integration?.isActive && integration?.isVerified) return 'success';
    if (integration) return 'warning';
    return 'default';
  };

  const getStatusLabel = () => {
    if (integration?.lastError) return 'Error';
    if (integration?.isActive && integration?.isVerified) return 'Active';
    if (integration) return 'Configured';
    return 'Not Configured';
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={integrationConfig?.displayName || integrationName}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Integrations', href: paths.dashboard.integration.root },
          { name: integrationConfig?.displayName || integrationName },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={testing || !integration}
              startIcon={
                testing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:refresh-bold" />
                )
              }
            >
              Test Connection
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.integration.root)}
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* Header Card */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={3}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${integrationConfig?.color || '#666'}15`,
              }}
            >
              <Iconify
                icon={integrationConfig?.icon || 'mdi:puzzle'}
                width={48}
                sx={{ color: integrationConfig?.color || '#666' }}
              />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h4">
                  {integrationConfig?.displayName || integrationName}
                </Typography>
                <Label color={getStatusColor()}>{getStatusLabel()}</Label>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                {integrationConfig?.description}
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Details Card */}
        {integration && (
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Configuration Details
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Type</Typography>
                <Typography variant="subtitle2">
                  {integrationConfig?.type?.toUpperCase()}
                </Typography>
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Status</Typography>
                <Label color={integration.isActive ? 'success' : 'default'}>
                  {integration.isActive ? 'Active' : 'Inactive'}
                </Label>
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Verified</Typography>
                <Label color={integration.isVerified ? 'success' : 'warning'}>
                  {integration.isVerified ? 'Yes' : 'No'}
                </Label>
              </Stack>

              <Divider />

              {integration.lastSyncAt && (
                <>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Last Sync</Typography>
                    <Typography variant="subtitle2">{fDateTime(integration.lastSyncAt)}</Typography>
                  </Stack>
                  <Divider />
                </>
              )}

              {integration.lastError && (
                <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>
                    Last Error
                  </Typography>
                  <Typography variant="body2" color="error.dark">
                    {integration.lastError}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {/* Danger Zone */}
        {integration && (
          <Card sx={{ p: 3, border: (theme) => `1px solid ${theme.palette.error.main}` }}>
            <Typography variant="h6" color="error.main" sx={{ mb: 2 }}>
              Danger Zone
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Removing this integration will delete all associated credentials and settings.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            >
              Remove Integration
            </Button>
          </Card>
        )}
      </Stack>
    </DashboardContent>
  );
}
