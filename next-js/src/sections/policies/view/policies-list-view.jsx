'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
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

// ----------------------------------------------------------------------

export function PoliciesListView() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = await apiHelper.getPolicies();
        setPolicies(data || []);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
        setError('Failed to load policies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  // Group policies by category
  const groupedPolicies = policies.reduce((acc, policy) => {
    const category = policy.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(policy);
    return acc;
  }, {});

  const categories = Object.keys(groupedPolicies).sort();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Policies"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Policies' }]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.policies.assignByRole}
            variant="contained"
            startIcon={<Iconify icon="solar:user-id-bold" />}
          >
            Assign by Role
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      {!loading && !error && (
        <Stack spacing={4}>
          {categories.map((category) => (
            <Card key={category}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Chip
                  label={category}
                  color={CATEGORY_COLORS[category] || 'default'}
                  size="small"
                />
                <Typography variant="subtitle1">
                  {groupedPolicies[category].length}{' '}
                  {groupedPolicies[category].length === 1 ? 'Policy' : 'Policies'}
                </Typography>
              </Stack>

              <Scrollbar>
                <TableContainer sx={{ minWidth: 680 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell width={120}>Policy No.</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell width={100}>Version</TableCell>
                        <TableCell width={140}>Effective Date</TableCell>
                        <TableCell width={100}>Status</TableCell>
                        <TableCell width={80} />
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {groupedPolicies[category].map((policy) => (
                        <TableRow key={policy.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {policy.policyNumber}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {policy.title}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              v{policy.version || '1.0'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {policy.effectiveDate
                                ? new Date(policy.effectiveDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={policy.isActive ? 'Active' : 'Inactive'}
                              color={policy.isActive ? 'success' : 'default'}
                              size="small"
                              variant="soft"
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              component={RouterLink}
                              href={paths.dashboard.policies.details(policy.id)}
                              size="small"
                              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Scrollbar>
            </Card>
          ))}

          {policies.length === 0 && (
            <Card sx={{ py: 8, textAlign: 'center' }}>
              <Iconify
                icon="solar:clipboard-list-bold"
                width={48}
                sx={{ color: 'text.disabled', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                No policies found
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Run the seed endpoint to populate policies.
              </Typography>
            </Card>
          )}
        </Stack>
      )}
    </DashboardContent>
  );
}
