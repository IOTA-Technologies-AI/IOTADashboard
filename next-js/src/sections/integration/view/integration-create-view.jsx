'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { createIntegration } from 'src/actions/integrations';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AVAILABLE_INTEGRATIONS } from '../integration-constants';

// ----------------------------------------------------------------------

const STEPS = ['Select Integration', 'Configure', 'Test & Save'];

export function IntegrationCreateView() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [formData, setFormData] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [loading, setLoading] = useState(false);

  const availableToAdd = AVAILABLE_INTEGRATIONS.filter((i) => !i.comingSoon);

  const handleSelectIntegration = useCallback((integration) => {
    setSelectedIntegration(integration);
    setFormData({
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      refreshToken: '',
      siteId: '',
      collectionId: '',
      baseUrl: '',
      webhookUrl: '',
      isActive: true,
    });
    setActiveStep(1);
  }, []);

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      router.push(paths.dashboard.integration.root);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep, router]);

  const handleNext = useCallback(() => {
    setActiveStep((prev) => prev + 1);
  }, []);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleShowSecret = useCallback((field) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedIntegration) return;

    setLoading(true);
    try {
      await createIntegration({
        integrationName: selectedIntegration.name,
        integrationType: selectedIntegration.type,
        displayName: selectedIntegration.displayName,
        description: selectedIntegration.description,
        ...formData,
      });

      toast.success('Integration configured successfully!');
      router.push(paths.dashboard.integration.root);
    } catch (error) {
      console.error('Error creating integration:', error);
      toast.error(error.message || 'Failed to create integration');
    } finally {
      setLoading(false);
    }
  }, [selectedIntegration, formData, router]);

  const renderStepOne = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Choose an integration to configure
      </Typography>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {availableToAdd.map((integration) => (
          <Card
            key={integration.name}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: (theme) =>
                selectedIntegration?.name === integration.name
                  ? `2px solid ${theme.palette.primary.main}`
                  : '2px solid transparent',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => theme.shadows[8],
              },
            }}
            onClick={() => handleSelectIntegration(integration)}
          >
            <CardContent>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${integration.color}15`,
                  }}
                >
                  <Iconify icon={integration.icon} width={32} sx={{ color: integration.color }} />
                </Box>
                <Typography variant="subtitle1">{integration.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {integration.description}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

  const renderSecretField = (field, label, placeholder = '', required = false) => (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      value={formData[field] || ''}
      onChange={(e) => handleChange(field, e.target.value)}
      type={showSecrets[field] ? 'text' : 'password'}
      required={required}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => toggleShowSecret(field)} edge="end">
              <Iconify icon={showSecrets[field] ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const renderField = (field, label, placeholder = '', required = false) => (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      value={formData[field] || ''}
      onChange={(e) => handleChange(field, e.target.value)}
      required={required}
    />
  );

  const renderStepTwo = () => {
    if (!selectedIntegration) return null;

    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${selectedIntegration.color}15`,
            }}
          >
            <Iconify
              icon={selectedIntegration.icon}
              width={28}
              sx={{ color: selectedIntegration.color }}
            />
          </Box>
          <Box>
            <Typography variant="h6">{selectedIntegration.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to connect
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={3} sx={{ maxWidth: 500 }}>
          {selectedIntegration.requiredFields?.includes('apiKey') &&
            renderSecretField('apiKey', 'API Key', 'Enter your API key', true)}

          {selectedIntegration.requiredFields?.includes('apiSecret') &&
            renderSecretField('apiSecret', 'API Secret', 'Enter your API secret', true)}

          {selectedIntegration.requiredFields?.includes('accessToken') &&
            renderSecretField('accessToken', 'Access Token', 'Enter access token', true)}

          {selectedIntegration.requiredFields?.includes('refreshToken') &&
            renderSecretField('refreshToken', 'Refresh Token', 'Enter refresh token', true)}

          {selectedIntegration.requiredFields?.includes('siteId') &&
            renderField('siteId', 'Site ID', 'Enter site ID', true)}

          {selectedIntegration.requiredFields?.includes('collectionId') &&
            renderField('collectionId', 'Collection ID', 'Enter collection ID', true)}

          {selectedIntegration.requiredFields?.includes('baseUrl') &&
            renderField('baseUrl', 'Base URL', 'https://api.example.com', true)}

          {selectedIntegration.optionalFields?.includes('webhookUrl') &&
            renderField('webhookUrl', 'Webhook URL (Optional)', 'https://your-webhook-url.com')}
        </Stack>
      </Box>
    );
  };

  const renderStepThree = () => {
    if (!selectedIntegration) return null;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Review & Save
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${selectedIntegration.color}15`,
                }}
              >
                <Iconify
                  icon={selectedIntegration.icon}
                  width={28}
                  sx={{ color: selectedIntegration.color }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle1">{selectedIntegration.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedIntegration.type.toUpperCase()}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {selectedIntegration.description}
            </Typography>
          </CardContent>
        </Card>

        <Alert severity="info">
          Click &quot;Save&quot; to complete the integration setup. You can test the connection from
          the integrations list after saving.
        </Alert>
      </Box>
    );
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderStepOne();
      case 1:
        return renderStepTwo();
      case 2:
        return renderStepThree();
      default:
        return null;
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Add Integration"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Integrations', href: paths.dashboard.integration.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4 }}>
          <Button variant="outlined" onClick={handleBack}>
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {activeStep < 2 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === 0 && !selectedIntegration}
            >
              Next
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={<Iconify icon="ic:round-save" />}
            >
              {loading ? 'Saving...' : 'Save Integration'}
            </Button>
          )}
        </Stack>
      </Card>
    </DashboardContent>
  );
}
