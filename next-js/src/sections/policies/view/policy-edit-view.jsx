'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';
import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const CATEGORIES = ['Compliance', 'Security', 'HR', 'Operations', 'Technology', 'Finance', 'Legal'];

const roleIdToName = { 1: 'employee', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

// ----------------------------------------------------------------------

export function PolicyEditView({ id }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [scope, setScope] = useState('');
  const [policyStatement, setPolicyStatement] = useState(['']);
  const [responsibilities, setResponsibilities] = useState(['']);
  const [violations, setViolations] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');

  // Redirect non-superAdmin users
  useEffect(() => {
    if (!loading && normalizedRole !== 'superAdmin') {
      router.replace(paths.dashboard.policies.root);
    }
  }, [loading, normalizedRole, router]);

  const fetchPolicy = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiHelper.getPolicyById(id);
      const p = data;
      setTitle(p.title || '');
      setCategory(p.category || '');
      setEffectiveDate(p.effectiveDate ? p.effectiveDate.split('T')[0] : '');
      setIsActive(p.isActive ?? true);
      setCurrentVersion(p.version || '1.0');
      const c = p.content || {};
      setPurpose(c.purpose || '');
      setScope(c.scope || '');
      setPolicyStatement(c.policyStatement?.length ? c.policyStatement : ['']);
      setResponsibilities(c.responsibilities?.length ? c.responsibilities : ['']);
      setViolations(c.violations || '');
    } catch (err) {
      console.error('Failed to load policy:', err);
      setError('Failed to load policy. Please go back and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  // Dynamic list helpers
  const handleListChange = (setter) => (index, value) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleListAdd = (setter) => () => setter((prev) => [...prev, '']);

  const handleListRemove = (setter) => (index) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Policy title is required.');
      return;
    }
    if (!category) {
      toast.error('Please select a category.');
      return;
    }

    try {
      setSaving(true);
      const result = await apiHelper.updatePolicy(id, {
        title: title.trim(),
        category,
        effectiveDate: effectiveDate || undefined,
        isActive,
        content: {
          purpose: purpose.trim(),
          scope: scope.trim(),
          policyStatement: policyStatement.map((s) => s.trim()).filter(Boolean),
          responsibilities: responsibilities.map((r) => r.trim()).filter(Boolean),
          violations: violations.trim(),
        },
      });
      toast.success(`Policy updated — version ${result.previousVersion} → v${result.newVersion}`);
      router.push(paths.dashboard.policies.details(id));
    } catch (err) {
      console.error('Failed to save policy:', err);
      toast.error('Failed to save policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <Alert severity="error">{error}</Alert>
      </DashboardContent>
    );
  }

  if (normalizedRole !== 'superAdmin') {
    return null;
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Policy"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Policies', href: paths.dashboard.policies.root },
          { name: 'Edit' },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              component={RouterLink}
              href={paths.dashboard.policies.details(id)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={saving}
              onClick={handleSave}
              startIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="eva:save-fill" />
                )
              }
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {currentVersion && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Current version: <strong>v{currentVersion}</strong>. Saving will auto-increment the
          version number.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Basic Info */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Policy Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Policy Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    color="success"
                  />
                }
                label={isActive ? 'Active' : 'Inactive'}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Policy Content */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Policy Content
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              helperText="Explain why this policy exists."
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              helperText="Who and what this policy applies to."
            />

            {/* Policy Statement (dynamic list) */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Policy Statement
              </Typography>
              <Stack spacing={1.5}>
                {policyStatement.map((item, index) => (
                  <Stack key={index} direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      value={item}
                      onChange={(e) => handleListChange(setPolicyStatement)(index, e.target.value)}
                      placeholder={`Statement ${index + 1}`}
                    />
                    <Tooltip title="Remove">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleListRemove(setPolicyStatement)(index)}
                          disabled={policyStatement.length === 1}
                        >
                          <Iconify icon="eva:minus-circle-fill" width={20} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
                <Button
                  size="small"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={handleListAdd(setPolicyStatement)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Statement
                </Button>
              </Stack>
            </Box>

            {/* Responsibilities (dynamic list) */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Responsibilities
              </Typography>
              <Stack spacing={1.5}>
                {responsibilities.map((item, index) => (
                  <Stack key={index} direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      value={item}
                      onChange={(e) => handleListChange(setResponsibilities)(index, e.target.value)}
                      placeholder={`Responsibility ${index + 1}`}
                    />
                    <Tooltip title="Remove">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleListRemove(setResponsibilities)(index)}
                          disabled={responsibilities.length === 1}
                        >
                          <Iconify icon="eva:minus-circle-fill" width={20} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
                <Button
                  size="small"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={handleListAdd(setResponsibilities)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Responsibility
                </Button>
              </Stack>
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Violations & Consequences"
              value={violations}
              onChange={(e) => setViolations(e.target.value)}
              helperText="Describe consequences for non-compliance."
            />
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
