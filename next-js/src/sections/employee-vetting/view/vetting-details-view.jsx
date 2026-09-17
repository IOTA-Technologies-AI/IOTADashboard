'use client';

import useSWR from 'swr';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getVetting, submitVetting, refreshVetting } from 'src/actions/employee-vetting';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  draft: 'default',
  pending: 'warning',
  completed: 'success',
  failed: 'error',
  error: 'error',
};

const fDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
};

// ----------------------------------------------------------------------

export function VettingDetailsView({ id }) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(id ? `vetting/${id}` : null, () =>
    getVetting(id)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [reportAnchor, setReportAnchor] = useState(null);

  const vetting = data;
  const checks = vetting?.checks || [];
  const pendingCount = checks.filter((c) => c.status === 'pending').length;
  const draftCount = checks.filter((c) => c.status === 'draft').length;

  /**
   * Render the branded report.
   *
   * `@react-pdf/renderer` is heavy, so it and the document are imported only
   * when a report is actually requested — keeping them out of the bundle every
   * visitor to this page downloads.
   */
  const handleDownloadReport = async (includeSensitive) => {
    setReportAnchor(null);
    setDownloading(includeSensitive ? 'internal' : 'client');
    setRefreshError('');
    try {
      const [{ pdf }, mod] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../vetting-report-pdf'),
      ]);
      const doc = <mod.VettingReportDocument vetting={vetting} options={{ includeSensitive }} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mod.reportFileName(vetting, includeSensitive);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Vetting report generation failed:', err);
      setRefreshError('Could not generate the report PDF. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  const handleSubmitDraft = async () => {
    setSubmitting(true);
    setRefreshError('');
    try {
      const updated = await submitVetting(id);
      await mutate(updated, { revalidate: false });
    } catch (err) {
      // The backend refuses an incomplete draft and names the missing fields,
      // rather than paying IDfy for a submission that will be rejected.
      setRefreshError(err?.response?.data?.message || err.message || 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError('');
    try {
      const updated = await refreshVetting(id);
      await mutate(updated, { revalidate: false });
    } catch (err) {
      setRefreshError(err?.response?.data?.message || err.message || 'Could not refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error || !vetting) {
    return (
      <DashboardContent>
        <Alert severity="error">
          Could not load this vetting — {error?.response?.data?.message || error?.message || 'not found'}
        </Alert>
      </DashboardContent>
    );
  }

  const meta = [
    ['IOTA Office', vetting.iotaOffice || '—'],
    ['Nationality', vetting.nationality || '—'],
    ['Verified Against', vetting.countryCode || '—'],
    ['Raised By', vetting.createdBy || '—'],
    ['Raised On', fDateTime(vetting.createdAt)],
    ['Last Updated', fDateTime(vetting.updatedAt)],
  ];

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => router.push(paths.dashboard.hr.employeeVetting.root)}>
            <Iconify icon="eva:arrow-back-fill" />
          </IconButton>
          <Box>
            <Typography variant="h4">{vetting.employeeName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {vetting.employeeEmail || 'Employee vetting'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={vetting.status}
            color={STATUS_COLORS[vetting.status] || 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
          {draftCount > 0 && (
            <Button
              variant="contained"
              onClick={handleSubmitDraft}
              disabled={submitting}
              startIcon={
                submitting ? <CircularProgress size={16} /> : <Iconify icon="solar:shield-check-bold" />
              }
            >
              Submit {draftCount} draft check{draftCount === 1 ? '' : 's'} to IDfy
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={(e) => setReportAnchor(e.currentTarget)}
            disabled={Boolean(downloading)}
            startIcon={
              downloading ? <CircularProgress size={16} /> : <Iconify icon="solar:file-download-bold" />
            }
          >
            Download Report
          </Button>
          <Menu
            anchorEl={reportAnchor}
            open={Boolean(reportAnchor)}
            onClose={() => setReportAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => handleDownloadReport(false)}>
              <ListItemIcon>
                <Iconify icon="solar:share-bold" width={18} />
              </ListItemIcon>
              <Box>
                <Typography variant="body2">Client copy</Typography>
                <Typography variant="caption" color="text.secondary">
                  Outcomes only, identifiers masked — safe to send
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleDownloadReport(true)}>
              <ListItemIcon>
                <Iconify icon="solar:lock-keyhole-bold" width={18} />
              </ListItemIcon>
              <Box>
                <Typography variant="body2">Internal copy</Typography>
                <Typography variant="caption" color="text.secondary">
                  Full identifiers and IDfy payloads — do not share
                </Typography>
              </Box>
            </MenuItem>
          </Menu>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
            startIcon={
              refreshing ? <CircularProgress size={16} /> : <Iconify icon="solar:refresh-bold" />
            }
          >
            {pendingCount ? `Check for results (${pendingCount} pending)` : 'Check for results'}
          </Button>
        </Stack>
      </Stack>

      {refreshError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRefreshError('')}>
          {refreshError}
        </Alert>
      )}

      <Card sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {meta.map(([label, value]) => (
            <Box key={label}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.6 }}
              >
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        {vetting.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              NOTES
            </Typography>
            <Typography variant="body2">{vetting.notes}</Typography>
          </>
        )}
      </Card>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Checks ({checks.length})
      </Typography>

      <Stack spacing={1.5}>
        {checks.map((check) => (
          <Accordion key={check.taskId} disableGutters>
            <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: '100%', pr: 2 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {check.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Submitted {fDateTime(check.submittedAt)}
                    {check.completedAt ? ` · Completed ${fDateTime(check.completedAt)}` : ''}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={check.status}
                  color={STATUS_COLORS[check.status] || 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {check.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {check.error}
                </Alert>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                SUBMITTED DETAILS
              </Typography>
              <Box sx={{ mb: 2 }}>
                {Object.entries(check.input || {}).map(([k, v]) => (
                  <Typography key={k} variant="body2">
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {k}:
                    </Box>{' '}
                    {String(v)}
                  </Typography>
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                IDFY RESPONSE {check.requestId ? `· request_id ${check.requestId}` : ''}
              </Typography>
              {/* The raw payload is kept and shown verbatim: this is the
                  evidence the check was run and what it returned, and IDfy's
                  result shape differs per check type, so summarising it here
                  would quietly drop fields an auditor may need. */}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 1,
                  fontSize: 12,
                  overflowX: 'auto',
                  backgroundColor: 'background.neutral',
                }}
              >
                {check.result
                  ? JSON.stringify(check.result, null, 2)
                  : check.status === 'draft'
                    ? 'Not sent yet — this check is saved as a draft and nothing has been billed.'
                    : 'Awaiting result from IDfy.'}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </DashboardContent>
  );
}
