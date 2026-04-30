'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';
import { getPipelineDeal, addPipelineActivity } from 'src/utils/apiHelper';

// ----------------------------------------------------------------------

const STAGE_COLORS = {
  lead: 'default',
  qualified: 'info',
  proposal: 'warning',
  negotiation: 'secondary',
  won: 'success',
  lost: 'error',
};
const PRIORITY_COLORS = { hot: 'error', warm: 'warning', cold: 'info' };

const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'task'];

// ----------------------------------------------------------------------

function LabelValue({ label, value }) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        color="text.secondary"
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function DealDetailsView({ id }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { users: msUsers } = useMicrosoftUsers();

  // Build email → display name map
  const bdmNameMap = useMemo(
    () => Object.fromEntries((msUsers || []).map((u) => [u.email, u.name])),
    [msUsers]
  );

  const { data, isLoading, mutate } = useSWR(id ? `pipeline-deal-${id}` : null, () =>
    getPipelineDeal(id)
  );
  const deal = data?.deal;

  const [actType, setActType] = useState('note');
  const [actContent, setActContent] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  const handleAddActivity = async () => {
    if (!actContent.trim()) return;
    setAddingActivity(true);
    try {
      await addPipelineActivity(id, actType, actContent.trim(), user?.email || 'Unknown');
      setActContent('');
      mutate();
      // invalidate the list cache too
      globalMutate('pipeline-deals');
      toast.success('Activity added');
    } catch (err) {
      toast.error('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  const fmt = (n, currency = 'USD') =>
    n != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(n)
      : '—';

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!deal) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Deal not found
        </Typography>
        <Button onClick={() => router.push(paths.dashboard.sales.deals.root)} sx={{ mt: 2 }}>
          Back to Deals
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4">{deal.dealTitle}</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {deal.company}
          </Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Chip
              label={deal.stage}
              size="small"
              color={STAGE_COLORS[deal.stage] || 'default'}
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip
              label={deal.priority}
              size="small"
              color={PRIORITY_COLORS[deal.priority] || 'default'}
              sx={{ textTransform: 'capitalize' }}
            />
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          {/* Only the deal creator or admin/superAdmin can edit */}
          {(user?.email === deal.createdBy ||
            user?.role === 'admin' ||
            user?.role === 'superAdmin') && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => router.push(paths.dashboard.sales.deals.edit(id))}
            >
              Edit
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
            onClick={() => router.push(paths.dashboard.sales.deals.root)}
          >
            Back
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Deal summary */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 4 }}>
                <LabelValue label="Value" value={fmt(deal.value, deal.currency)} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <LabelValue
                  label="Probability"
                  value={deal.probability != null ? `${deal.probability}%` : null}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <LabelValue
                  label="Close Date"
                  value={
                    deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString()
                      : null
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <LabelValue label="Source" value={deal.source?.replace('_', ' ')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <LabelValue
                  label="Assigned BDM"
                  value={deal.assignedBdm ? bdmNameMap[deal.assignedBdm] || deal.assignedBdm : null}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <LabelValue label="Created" value={new Date(deal.createdAt).toLocaleDateString()} />
              </Grid>
            </Grid>
          </Card>

          {/* Contact */}
          {(deal.contactName || deal.contactEmail || deal.contactPhone) && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Contact
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <LabelValue label="Name" value={deal.contactName} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <LabelValue label="Email" value={deal.contactEmail} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <LabelValue label="Phone" value={deal.contactPhone} />
                </Grid>
              </Grid>
            </Card>
          )}

          {/* Notes */}
          {deal.notes && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {deal.notes}
              </Typography>
            </Card>
          )}

          {/* Activity log */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Activity Log
            </Typography>

            {/* Add activity */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
              <TextField
                select
                size="small"
                value={actType}
                onChange={(e) => setActType(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                fullWidth
                placeholder="Add activity note…"
                value={actContent}
                onChange={(e) => setActContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
              />
              <LoadingButton
                variant="contained"
                size="small"
                loading={addingActivity}
                onClick={handleAddActivity}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add
              </LoadingButton>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {deal.activityLog?.length > 0 ? (
              <Timeline sx={{ px: 0 }}>
                {deal.activityLog.map((entry) => (
                  <TimelineItem key={entry.id} sx={{ '&:before': { flex: 0, padding: 0 } }}>
                    <TimelineSeparator>
                      <TimelineDot color="primary" variant="outlined" />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip
                            label={entry.type}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: 10, textTransform: 'capitalize' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(entry.performedAt).toLocaleString()} · {entry.performedBy}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {entry.content}
                        </Typography>
                      </Stack>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                No activity yet
              </Typography>
            )}
          </Card>
        </Grid>

        {/* Side panel */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Pipeline Stage
            </Typography>
            <Stack spacing={0.5}>
              {['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
                <Box
                  key={s}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: deal.stage === s ? 'action.selected' : 'transparent',
                    fontWeight: deal.stage === s ? 'bold' : 'normal',
                    textTransform: 'capitalize',
                    fontSize: 13,
                  }}
                >
                  {s}
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
