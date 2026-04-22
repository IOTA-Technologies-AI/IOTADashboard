'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const CATEGORY_COLORS = {
  HR: 'primary',
  IT: 'info',
  Finance: 'success',
  'Legal & Compliance': 'warning',
  Operations: 'secondary',
  'Health & Safety': 'error',
};

function stringAvatar(name = '') {
  const parts = name.trim().split(' ');
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.substring(0, 2);
  return initials.toUpperCase();
}

// ----------------------------------------------------------------------

export function PolicyAssignByRoleView() {
  const { user } = useAuthContext();

  // Employees
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Policies
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(new Set());
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Actions
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Load employees and policies in parallel
  useEffect(() => {
    apiHelper
      .getEmployees()
      .then((data) => setEmployees(data || []))
      .catch((err) => console.error('Failed to fetch employees:', err))
      .finally(() => setLoadingEmployees(false));

    apiHelper
      .getPolicies()
      .then((data) => setPolicies(data || []))
      .catch((err) => console.error('Failed to fetch policies:', err))
      .finally(() => setLoadingPolicies(false));
  }, []);

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

  const handleSendEmails = useCallback(async () => {
    if (selectedEmployees.length === 0) {
      setSendResult({ type: 'error', message: 'Please select at least one employee.' });
      return;
    }
    if (selectedPolicyIds.size === 0) {
      setSendResult({ type: 'error', message: 'Please select at least one policy.' });
      return;
    }

    setSending(true);
    setSendResult(null);

    let totalSent = 0;
    let totalFailed = 0;
    const failedEmployees = [];

    for (const emp of selectedEmployees) {
      try {
        // Filter policies to only selected ones and send each
        const selectedPolicies = policies.filter((p) => selectedPolicyIds.has(p.id));
        const result = await apiHelper.sendPoliciesToSelectedEmployees(
          emp.id,
          {
            firstName: emp.firstName,
            lastName: emp.lastName,
            name: emp.name || `${emp.firstName} ${emp.lastName}`.trim(),
            email: emp.email,
          },
          Array.from(selectedPolicyIds)
        );
        totalSent += result.sent || 0;
        totalFailed += result.failed || 0;
      } catch (err) {
        console.error(`Failed to send to ${emp.email}:`, err);
        failedEmployees.push(`${emp.firstName} ${emp.lastName}`);
        totalFailed++;
      }
    }

    setSendResult({
      type: totalFailed === 0 ? 'success' : totalSent > 0 ? 'warning' : 'error',
      message:
        totalFailed === 0
          ? `${totalSent} policy email(s) sent to ${selectedEmployees.length} employee(s).`
          : `${totalSent} sent, ${totalFailed} failed.${failedEmployees.length ? ` Failed: ${failedEmployees.join(', ')}.` : ''}`,
    });
    setSending(false);
  }, [selectedEmployees, selectedPolicyIds, policies]);

  // Group policies by category
  const groupedPolicies = policies.reduce((acc, policy) => {
    const cat = policy.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(policy);
    return acc;
  }, {});
  const categories = Object.keys(groupedPolicies).sort();

  const loading = loadingEmployees || loadingPolicies;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Assign Policies to Employees"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Policies', href: paths.dashboard.policies.root },
          { name: 'Assign to Employees' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* Employee selector */}
        <Card>
          <CardHeader
            title="Select Employees"
            subheader="Choose one or more employees to assign policies to. Employees will receive an email with a personalised signing link for each policy."
          />
          <CardContent>
            {loadingEmployees ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading employees…
                </Typography>
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={employees}
                value={selectedEmployees}
                onChange={(_, newValue) => setSelectedEmployees(newValue)}
                disableCloseOnSelect
                getOptionLabel={(emp) =>
                  `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.email
                }
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={(props, emp, { selected }) => {
                  const name =
                    `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.email;
                  return (
                    <li {...props} key={emp.id}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 11,
                          mr: 1.5,
                          bgcolor: 'primary.main',
                        }}
                      >
                        {stringAvatar(name)}
                      </Avatar>
                      <ListItemText
                        primary={name}
                        secondary={emp.jobTitle || emp.department || emp.email}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </li>
                  );
                }}
                renderTags={(selected, getTagProps) =>
                  selected.map((emp, index) => {
                    const name =
                      `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
                      emp.name ||
                      emp.email;
                    return (
                      <Chip
                        {...getTagProps({ index })}
                        key={emp.id}
                        label={name}
                        size="small"
                        avatar={
                          <Avatar sx={{ bgcolor: 'primary.main', fontSize: 10 }}>
                            {stringAvatar(name)}
                          </Avatar>
                        }
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search employees"
                    placeholder={
                      selectedEmployees.length === 0 ? 'Type to search by name or title…' : ''
                    }
                  />
                )}
                sx={{ maxWidth: 680 }}
              />
            )}

            {selectedEmployees.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}{' '}
                selected
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Policy selection */}
        <Card>
          <CardHeader
            title="Select Policies to Assign"
            subheader="Each selected employee will receive a personalised email with a signing link for every checked policy."
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

          {loadingPolicies ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
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

        {/* Summary and send */}
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
                  {selectedPolicyIds.size} {selectedPolicyIds.size === 1 ? 'policy' : 'policies'} →{' '}
                  {selectedEmployees.length}{' '}
                  {selectedEmployees.length === 1 ? 'employee' : 'employees'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Each employee receives a separate email with a personalised signing link per
                  policy.
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={handleSendEmails}
                disabled={
                  sending ||
                  loading ||
                  selectedEmployees.length === 0 ||
                  selectedPolicyIds.size === 0
                }
                startIcon={
                  sending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="eva:email-fill" />
                  )
                }
                sx={{ flexShrink: 0 }}
              >
                {sending ? 'Sending…' : 'Send Policy Emails'}
              </Button>
            </Stack>

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
