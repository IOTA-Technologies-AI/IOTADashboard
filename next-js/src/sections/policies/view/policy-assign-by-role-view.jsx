'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'bdm', label: 'Business Development Manager' },
];

const CATEGORY_COLORS = {
  HR: 'primary',
  IT: 'info',
  Finance: 'success',
  'Legal & Compliance': 'warning',
  Operations: 'secondary',
  'Health & Safety': 'error',
};

// ----------------------------------------------------------------------

export function PolicyAssignByRoleView() {
  const { user } = useAuthContext();

  const [selectedRole, setSelectedRole] = useState('employee');
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(new Set());
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { type: 'success'|'error', message: string }
  const [sendResult, setSendResult] = useState(null);

  // Load all policies once
  useEffect(() => {
    apiHelper
      .getPolicies()
      .then((data) => setPolicies(data || []))
      .catch((err) => {
        console.error('Failed to fetch policies:', err);
      })
      .finally(() => setLoadingPolicies(false));
  }, []);

  // Load current role assignments whenever selectedRole changes
  useEffect(() => {
    if (!selectedRole) return;

    setLoadingAssignments(true);
    setSaveResult(null);
    setSendResult(null);

    apiHelper
      .getPolicyRoleAssignments()
      .then((assignments) => {
        const idsForRole = assignments
          .filter((a) => a.role === selectedRole)
          .map((a) => a.policyId);
        setSelectedPolicyIds(new Set(idsForRole));
      })
      .catch((err) => {
        console.error('Failed to fetch role assignments:', err);
        setSelectedPolicyIds(new Set());
      })
      .finally(() => setLoadingAssignments(false));
  }, [selectedRole]);

  const handleTogglePolicy = useCallback((policyId) => {
    setSelectedPolicyIds((prev) => {
      const next = new Set(prev);
      if (next.has(policyId)) {
        next.delete(policyId);
      } else {
        next.add(policyId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedPolicyIds(new Set(policies.map((p) => p.id)));
  }, [policies]);

  const handleSelectNone = useCallback(() => {
    setSelectedPolicyIds(new Set());
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await apiHelper.assignPoliciesToRole(
        selectedRole,
        Array.from(selectedPolicyIds),
        user?.email || user?.displayName || null
      );
      setSaveResult({
        type: 'success',
        message: `Saved: ${result.assigned} added, ${result.removed} removed for "${selectedRole}".`,
      });
    } catch (err) {
      setSaveResult({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to save assignments.',
      });
    } finally {
      setSaving(false);
    }
  }, [selectedRole, selectedPolicyIds, user]);

  const handleSendEmails = useCallback(async () => {
    if (selectedPolicyIds.size === 0) {
      setSendResult({
        type: 'error',
        message: 'Assign at least one policy before sending emails.',
      });
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      // Save first to ensure DB is up to date, then send
      await apiHelper.assignPoliciesToRole(
        selectedRole,
        Array.from(selectedPolicyIds),
        user?.email || user?.displayName || null
      );
      const result = await apiHelper.sendPoliciesByRole(
        selectedRole,
        user?.email || user?.displayName || null
      );
      setSendResult({
        type: 'success',
        message: `Emails sent: ${result.totalSent} policy emails to ${result.employeesNotified} employee(s) with role "${selectedRole}". ${result.totalFailed > 0 ? `(${result.totalFailed} failed)` : ''}`,
      });
    } catch (err) {
      setSendResult({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to send emails.',
      });
    } finally {
      setSending(false);
    }
  }, [selectedRole, selectedPolicyIds, user]);

  // Group policies by category for display
  const groupedPolicies = policies.reduce((acc, policy) => {
    const cat = policy.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(policy);
    return acc;
  }, {});

  const categories = Object.keys(groupedPolicies).sort();
  const roleName = ROLES.find((r) => r.value === selectedRole)?.label || selectedRole;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Assign Policies by Role"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Policies', href: paths.dashboard.policies.root },
          { name: 'Assign by Role' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* Role selector */}
        <Card>
          <CardHeader
            title="Select Role"
            subheader="Choose the employee role to configure policy requirements for."
          />
          <CardContent>
            <TextField
              select
              label="Employee Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              sx={{ minWidth: 280 }}
            >
              {ROLES.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        {/* Policy selection */}
        <Card>
          <CardHeader
            title={`Policies for "${roleName}"`}
            subheader="Check the policies that employees in this role must read and acknowledge."
            action={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={handleSelectAll} disabled={loadingPolicies}>
                  Select All
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={handleSelectNone}
                  disabled={loadingPolicies}
                >
                  Clear
                </Button>
              </Stack>
            }
          />

          <Divider />

          {(loadingPolicies || loadingAssignments) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {!loadingPolicies && !loadingAssignments && (
            <CardContent>
              <Stack spacing={3}>
                {categories.map((category) => (
                  <Box key={category}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Chip
                        label={category}
                        color={CATEGORY_COLORS[category] || 'default'}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {
                          groupedPolicies[category].filter((p) => selectedPolicyIds.has(p.id))
                            .length
                        }
                        {' / '}
                        {groupedPolicies[category].length} selected
                      </Typography>
                    </Stack>

                    <Stack spacing={0.5} sx={{ pl: 1 }}>
                      {groupedPolicies[category].map((policy) => (
                        <FormControlLabel
                          key={policy.id}
                          control={
                            <Checkbox
                              checked={selectedPolicyIds.has(policy.id)}
                              onChange={() => handleTogglePolicy(policy.id)}
                              size="small"
                            />
                          }
                          label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: 'text.secondary',
                                  minWidth: 72,
                                }}
                              >
                                {policy.policyNumber}
                              </Typography>
                              <Typography variant="body2">{policy.title}</Typography>
                            </Stack>
                          }
                          sx={{ mx: 0, width: '100%' }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          )}
        </Card>

        {/* Summary and actions */}
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="subtitle1">
                  {selectedPolicyIds.size} {selectedPolicyIds.size === 1 ? 'policy' : 'policies'}{' '}
                  selected for <strong>{roleName}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saving updates assignments. Sending emails will notify all employees in this role.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} flexShrink={0}>
                <Button
                  variant="outlined"
                  onClick={handleSave}
                  disabled={saving || loadingPolicies || loadingAssignments}
                  startIcon={
                    saving ? <CircularProgress size={16} /> : <Iconify icon="eva:save-fill" />
                  }
                >
                  {saving ? 'Saving…' : 'Save Assignments'}
                </Button>

                <Button
                  variant="contained"
                  onClick={handleSendEmails}
                  disabled={sending || loadingPolicies || loadingAssignments}
                  startIcon={
                    sending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon="eva:email-fill" />
                    )
                  }
                >
                  {sending ? 'Sending…' : 'Save & Send Emails'}
                </Button>
              </Stack>
            </Stack>

            {saveResult && (
              <Alert severity={saveResult.type} sx={{ mt: 2 }} onClose={() => setSaveResult(null)}>
                {saveResult.message}
              </Alert>
            )}

            {sendResult && (
              <Alert severity={sendResult.type} sx={{ mt: 2 }} onClose={() => setSendResult(null)}>
                {sendResult.message}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
