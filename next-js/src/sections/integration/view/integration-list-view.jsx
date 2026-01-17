'use client';

import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { getIntegrations } from 'src/actions/integrations';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { IntegrationList } from '../integration-list';
import { IntegrationEditDialog } from '../integration-edit-dialog';
import { INTEGRATION_TYPES, AVAILABLE_INTEGRATIONS } from '../integration-constants';

// ----------------------------------------------------------------------

export function IntegrationListView() {
  const openEditDialog = useBoolean();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Fetch configured integrations from API
  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Merge available integrations with configured ones
  const mergedIntegrations = AVAILABLE_INTEGRATIONS.map((available) => {
    const configured = integrations.find(
      (i) => i.integrationName === available.name && i.integrationType === available.type
    );
    return {
      ...available,
      isConfigured: !!configured,
      isActive: configured?.isActive || false,
      isVerified: configured?.isVerified || false,
      lastSyncAt: configured?.lastSyncAt || null,
      lastError: configured?.lastError || null,
      configuredData: configured || null,
    };
  });

  // Filter integrations
  const filteredIntegrations = mergedIntegrations.filter((integration) => {
    const matchesSearch =
      integration.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || integration.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleEditIntegration = useCallback(
    (integration) => {
      setSelectedIntegration(integration);
      openEditDialog.onTrue();
    },
    [openEditDialog]
  );

  const handleCloseEditDialog = useCallback(() => {
    setSelectedIntegration(null);
    openEditDialog.onFalse();
  }, [openEditDialog]);

  const handleSaveSuccess = useCallback(() => {
    fetchIntegrations();
    handleCloseEditDialog();
  }, [fetchIntegrations, handleCloseEditDialog]);

  const renderHeader = () => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        🔗 Integrations Hub
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Connect IOTA Dashboard with your favorite tools and services. Manage API keys, credentials,
        and sync settings for all your integrations in one place.
      </Typography>
    </Box>
  );

  const renderFilters = () => (
    <Card sx={{ p: 3, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <TextField
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Tabs
          value={filterType}
          onChange={(e, newValue) => setFilterType(newValue)}
          sx={{
            '& .MuiTab-root': { minWidth: 'auto', px: 2 },
          }}
        >
          <Tab label="All" value="all" />
          {INTEGRATION_TYPES.slice(0, 4).map((type) => (
            <Tab key={type.value} label={type.label} value={type.value} />
          ))}
        </Tabs>
      </Stack>
    </Card>
  );

  const renderStats = () => {
    const activeCount = mergedIntegrations.filter((i) => i.isActive).length;
    const configuredCount = mergedIntegrations.filter((i) => i.isConfigured).length;
    const errorCount = mergedIntegrations.filter((i) => i.lastError).length;

    return (
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          mb: 3,
        }}
      >
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3" color="primary.main">
            {mergedIntegrations.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available
          </Typography>
        </Card>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3" color="success.main">
            {configuredCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configured
          </Typography>
        </Card>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3" color="info.main">
            {activeCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active
          </Typography>
        </Card>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3" color="error.main">
            {errorCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Errors
          </Typography>
        </Card>
      </Box>
    );
  };

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

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Integrations"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Integrations' }]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.integration.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add Integration
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {renderHeader()}
      {renderStats()}
      {renderFilters()}

      {filteredIntegrations.length === 0 ? (
        <EmptyContent
          filled
          title="No integrations found"
          description="Try adjusting your search or filter criteria"
          sx={{ py: 10 }}
        />
      ) : (
        <IntegrationList
          integrations={filteredIntegrations}
          onEdit={handleEditIntegration}
          onRefresh={fetchIntegrations}
        />
      )}

      <IntegrationEditDialog
        open={openEditDialog.value}
        onClose={handleCloseEditDialog}
        integration={selectedIntegration}
        onSaveSuccess={handleSaveSuccess}
      />
    </DashboardContent>
  );
}
