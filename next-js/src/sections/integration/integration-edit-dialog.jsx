'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  createIntegration,
  deleteIntegration,
  updateIntegration,
  testIntegrationConnection,
} from 'src/actions/integrations';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function IntegrationEditDialog({ open, onClose, integration, onSaveSuccess }) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [formData, setFormData] = useState({
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

  // Reset form when integration changes
  useState(() => {
    if (integration?.configuredData) {
      setFormData({
        apiKey: integration.configuredData.apiKey || '',
        apiSecret: integration.configuredData.apiSecret || '',
        accessToken: integration.configuredData.accessToken || '',
        refreshToken: integration.configuredData.refreshToken || '',
        siteId: integration.configuredData.siteId || '',
        collectionId: integration.configuredData.collectionId || '',
        baseUrl: integration.configuredData.baseUrl || '',
        webhookUrl: integration.configuredData.webhookUrl || '',
        isActive: integration.configuredData.isActive ?? true,
      });
    } else {
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
    }
    setTestResult(null);
  }, [integration]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  }, []);

  const toggleShowSecret = useCallback((field) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleTest = useCallback(async () => {
    if (!integration) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testIntegrationConnection(integration.name, integration.type);
      if (result.success) {
        setTestResult({ success: true, message: result.message || 'Connection successful!' });
        toast.success('Connection test passed!');
      } else {
        setTestResult({ success: false, message: result.message || 'Connection failed.' });
        toast.error(result.message || 'Connection test failed');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Connection failed. Please check your credentials.',
      });
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  }, [integration]);

  const handleSave = useCallback(async () => {
    if (!integration) return;

    setLoading(true);
    try {
      const payload = {
        integrationName: integration.name,
        integrationType: integration.type,
        displayName: integration.displayName,
        description: integration.description,
        ...formData,
      };

      if (integration.isConfigured) {
        await updateIntegration(integration.name, integration.type, payload);
        toast.success('Integration updated successfully!');
      } else {
        await createIntegration(payload);
        toast.success('Integration configured successfully!');
      }

      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error(error.message || 'Failed to save integration');
    } finally {
      setLoading(false);
    }
  }, [integration, formData, onSaveSuccess]);

  const handleDelete = useCallback(async () => {
    if (!integration?.isConfigured) return;

    if (!window.confirm('Are you sure you want to remove this integration configuration?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteIntegration(integration.name, integration.type);
      toast.success('Integration removed successfully!');
      onSaveSuccess?.();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error(error.message || 'Failed to remove integration');
    } finally {
      setLoading(false);
    }
  }, [integration, onSaveSuccess]);

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

  if (!integration) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${integration.color}15`,
          }}
        >
          <Iconify icon={integration.icon} width={28} sx={{ color: integration.color }} />
        </Box>
        <Box>
          <Typography variant="h6">{integration.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {integration.isConfigured ? 'Edit configuration' : 'Configure integration'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Status Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle2">Active</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enable or disable this integration
                </Typography>
              </Box>
            }
          />

          <Divider />

          {/* Dynamic Fields based on integration type */}
          {integration.requiredFields?.includes('apiKey') &&
            renderSecretField('apiKey', 'API Key', 'Enter your API key', true)}

          {integration.requiredFields?.includes('apiSecret') &&
            renderSecretField('apiSecret', 'API Secret', 'Enter your API secret', true)}

          {integration.requiredFields?.includes('accessToken') &&
            renderSecretField('accessToken', 'Access Token', 'Enter access token', true)}

          {integration.requiredFields?.includes('refreshToken') &&
            renderSecretField('refreshToken', 'Refresh Token', 'Enter refresh token', true)}

          {integration.requiredFields?.includes('siteId') &&
            renderField('siteId', 'Site ID', 'Enter site ID', true)}

          {integration.requiredFields?.includes('collectionId') &&
            renderField('collectionId', 'Collection ID', 'Enter collection ID', true)}

          {integration.requiredFields?.includes('baseUrl') &&
            renderField('baseUrl', 'Base URL', 'https://api.example.com', true)}

          {/* Optional Fields */}
          {integration.optionalFields?.includes('webhookUrl') &&
            renderField('webhookUrl', 'Webhook URL (Optional)', 'https://your-webhook-url.com')}

          {/* Test Result */}
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {testResult.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {integration.isConfigured && (
          <Button
            color="error"
            onClick={handleDelete}
            disabled={loading}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          >
            Remove
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={testing || loading}
          startIcon={
            testing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:refresh-bold" />
            )
          }
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>

        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="ic:round-save" />
            )
          }
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
