'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const STATUS_COLOR = {
  signed: 'success',
  pending: 'warning',
  expired: 'error',
};

const roleIdToName = { 1: 'employee', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

// ----------------------------------------------------------------------

export function PolicyDetailView({ id }) {
  const { user } = useAuthContext();
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';

  const [policy, setPolicy] = useState(null);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(null); // employeeId being sent to

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [policyData, acksData] = await Promise.all([
        apiHelper.getPolicyById(id),
        apiHelper.getPolicyAcknowledgements(),
      ]);
      setPolicy(policyData);
      // Filter acknowledgements for this policy
      const filtered = (acksData || []).filter((ack) => String(ack.policyId) === String(id));
      setAcknowledgements(filtered);
    } catch (err) {
      console.error('Failed to fetch policy details:', err);
      setError('Failed to load policy. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResend = useCallback(async (ack) => {
    try {
      setSending(ack.employeeId);
      await apiHelper.sendPolicyLinksToEmployee(ack.employeeId, {
        name: ack.employeeName,
        email: ack.employeeEmail,
      });
      toast.success(`Policy link resent to ${ack.employeeName || 'employee'}`);
    } catch (err) {
      console.error('Failed to resend policy link:', err);
      toast.error('Failed to resend policy link');
    } finally {
      setSending(null);
    }
  }, []);

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error || !policy) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || 'Policy not found.'}</Alert>
      </DashboardContent>
    );
  }

  const content = policy.content || {};

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={policy.title}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Policies', href: paths.dashboard.policies.root },
          { name: policy.policyNumber },
        ]}
        action={
          isSuperAdmin && (
            <Button
              component={RouterLink}
              href={paths.dashboard.policies.edit(id)}
              variant="contained"
              startIcon={<Iconify icon="eva:edit-fill" />}
            >
              Edit Policy
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {/* Policy Header */}
        <Card sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {policy.policyNumber}
                </Typography>
                <Chip label={policy.category} size="small" color="primary" variant="soft" />
                <Chip
                  label={policy.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  color={policy.isActive ? 'success' : 'default'}
                  variant="soft"
                />
              </Stack>
              <Typography variant="h5" gutterBottom>
                {policy.title}
              </Typography>
              <Stack direction="row" spacing={3}>
                <Typography variant="body2" color="text.secondary">
                  Version: <strong>v{policy.version || '1.0'}</strong>
                </Typography>
                {policy.effectiveDate && (
                  <Typography variant="body2" color="text.secondary">
                    Effective:{' '}
                    <strong>
                      {new Date(policy.effectiveDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Card>

        {/* Policy Content */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Policy Content
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {content.purpose && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Purpose
                </Typography>
                <Typography variant="body2">{content.purpose}</Typography>
              </Box>
            )}

            {content.scope && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Scope
                </Typography>
                <Typography variant="body2">{content.scope}</Typography>
              </Box>
            )}

            {content.policyStatement && content.policyStatement.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Policy Statement
                </Typography>
                <List dense disablePadding>
                  {content.policyStatement.map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <Iconify
                        icon="eva:checkmark-circle-2-fill"
                        width={18}
                        sx={{ color: 'success.main', mr: 1.5, flexShrink: 0 }}
                      />
                      <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {content.responsibilities && content.responsibilities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Responsibilities
                </Typography>
                <List dense disablePadding>
                  {content.responsibilities.map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <Iconify
                        icon="eva:person-fill"
                        width={18}
                        sx={{ color: 'info.main', mr: 1.5, flexShrink: 0 }}
                      />
                      <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {content.violations && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Violations & Consequences
                </Typography>
                <Alert severity="warning" variant="outlined" sx={{ borderRadius: 1 }}>
                  <Typography variant="body2">{content.violations}</Typography>
                </Alert>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Acknowledgements Table */}
        <Card>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="h6">
              Acknowledgements
              {acknowledgements.length > 0 && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({acknowledgements.length})
                </Typography>
              )}
            </Typography>
          </Stack>

          <Scrollbar>
            <TableContainer sx={{ minWidth: 720 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell width={120}>Status</TableCell>
                    <TableCell width={160}>Signed At</TableCell>
                    <TableCell width={120}>Signature Type</TableCell>
                    <TableCell width={180}>Token Expires</TableCell>
                    <TableCell width={100} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {acknowledgements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.disabled">
                          No acknowledgements yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {acknowledgements.map((ack) => (
                    <TableRow key={ack.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {ack.employeeName || `Employee #${ack.employeeId}`}
                        </Typography>
                        {ack.employeeEmail && (
                          <Typography variant="caption" color="text.secondary">
                            {ack.employeeEmail}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={ack.status}
                          color={STATUS_COLOR[ack.status] || 'default'}
                          size="small"
                          variant="soft"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ack.signedAt
                            ? new Date(ack.signedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ack.signatureType || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            ack.tokenExpiresAt && new Date(ack.tokenExpiresAt) < new Date()
                              ? 'error.main'
                              : 'text.secondary'
                          }
                        >
                          {ack.tokenExpiresAt
                            ? new Date(ack.tokenExpiresAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {ack.status !== 'signed' && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={sending === ack.employeeId}
                            onClick={() => handleResend(ack)}
                          >
                            {sending === ack.employeeId ? 'Sending…' : 'Resend'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
