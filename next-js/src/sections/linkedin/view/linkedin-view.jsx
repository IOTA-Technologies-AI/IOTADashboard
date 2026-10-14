'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { fNumber, fPercent } from 'src/utils/format-number';
import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  apiMessage,
  syncLinkedIn,
  useLinkedInStatus,
  disconnectLinkedIn,
  linkedInRedirectUri,
  useLinkedInOverview,
  startLinkedInConnect,
  useLinkedInOrganizations,
  chooseLinkedInOrganization,
} from 'src/actions/linkedin';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LinkedInSetupGuide } from '../linkedin-setup-guide';

// ----------------------------------------------------------------------

const DAY = 86_400_000;
const n = (v) => (v === null || v === undefined ? '—' : fNumber(v));

/**
 * Integrations → LinkedIn: connect the IOTA company page (admins), then its
 * followers, last-30-day statistics and recent posts, as synced each night.
 */
export function LinkedInView() {
  const { status, error, loading } = useLinkedInStatus();
  const connection = status?.connection;
  const organization = connection?.organization;
  const canManage = !!status?.canManage;

  const [busy, setBusy] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const connect = async () => {
    setBusy('connect');
    try {
      window.location.assign(await startLinkedInConnect(linkedInRedirectUri(status.callbackPath)));
    } catch (err) {
      toast.error(apiMessage(err, 'LinkedIn sign-in could not start.'));
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      await syncLinkedIn();
      toast.success('LinkedIn synced.');
    } catch (err) {
      toast.error(apiMessage(err, 'The sync failed.'));
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await disconnectLinkedIn();
      toast.success('LinkedIn disconnected. The synced history is kept.');
    } catch (err) {
      toast.error(apiMessage(err, 'LinkedIn could not be disconnected.'));
    } finally {
      setBusy(null);
      setConfirmDisconnect(false);
    }
  };

  const expiresAt = connection ? Date.parse(connection.accessTokenExpiresAt) : null;
  const expiringSoon = connection && !connection.renewsItself && expiresAt - Date.now() < 14 * DAY;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="LinkedIn"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Integrations', href: paths.dashboard.integration.root },
          { name: 'LinkedIn' },
        ]}
        action={
          canManage && connection ? (
            <Stack direction="row" spacing={1}>
              {organization ? (
                <LoadingButton
                  variant="contained"
                  loading={busy === 'sync'}
                  disabled={!!busy}
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                  onClick={sync}
                >
                  Sync now
                </LoadingButton>
              ) : null}
              <Button
                color="inherit"
                variant="outlined"
                disabled={!!busy}
                onClick={() => setConfirmDisconnect(true)}
              >
                Disconnect
              </Button>
            </Stack>
          ) : null
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error">
          {apiMessage(error, 'The LinkedIn status could not be loaded.')}
        </Alert>
      ) : null}

      {status && !status.configured ? (
        <Card>
          <CardHeader
            title="Set up the LinkedIn app"
            subheader="The LinkedIn app's credentials are not set in the API yet. These steps happen on LinkedIn's side first."
          />
          <Box sx={{ p: 3 }}>
            <LinkedInSetupGuide status={status} />
          </Box>
        </Card>
      ) : null}

      {status?.configured && !connection ? (
        <Card>
          <EmptyContent
            filled
            title="Connect the IOTA company page"
            description={
              canManage
                ? 'Sign in with a LinkedIn account that administers the IOTA page. Access is read-only.'
                : 'An IOTA admin needs to connect LinkedIn.'
            }
            action={
              canManage ? (
                <LoadingButton
                  variant="contained"
                  loading={busy === 'connect'}
                  startIcon={<Iconify icon="mdi:linkedin" />}
                  onClick={connect}
                  sx={{ mt: 3 }}
                >
                  Connect LinkedIn
                </LoadingButton>
              ) : null
            }
            sx={{ py: 8 }}
          />
        </Card>
      ) : null}

      {connection ? (
        <Stack spacing={3}>
          <ConnectionStrip connection={connection} />

          {connection.lastSyncError ? (
            <Alert severity="error">Last sync failed: {connection.lastSyncError}</Alert>
          ) : null}
          {expiringSoon ? (
            <Alert
              severity="warning"
              action={
                canManage ? (
                  <Button color="inherit" size="small" onClick={connect}>
                    Reconnect
                  </Button>
                ) : null
              }
            >
              The LinkedIn sign-in {expiresAt > Date.now() ? 'expires' : 'expired'}{' '}
              {fToNow(expiresAt)}. LinkedIn does not renew it for this app, so it has to be
              reconnected.
            </Alert>
          ) : null}

          {organization ? <Activity /> : <OrganizationPicker canManage={canManage} />}
        </Stack>
      ) : null}

      {status?.configured && canManage ? (
        <Card sx={{ mt: 3 }}>
          <CardHeader
            title="LinkedIn app setup"
            subheader="For reference, or to set it up again."
          />
          <Box sx={{ p: 3 }}>
            <LinkedInSetupGuide status={status} />
          </Box>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect LinkedIn?"
        content="The saved LinkedIn sign-in is deleted and the nightly sync stops. Statistics already synced stay."
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={busy === 'disconnect'}
            onClick={disconnect}
          >
            Disconnect
          </LoadingButton>
        }
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function ConnectionStrip({ connection }) {
  const org = connection.organization;
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 4 }}
        alignItems={{ md: 'center' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
          <Iconify icon="mdi:linkedin" width={32} sx={{ color: '#0A66C2' }} />
          <Box>
            <Typography variant="subtitle1">
              {org ? (
                <Link
                  href={`https://www.linkedin.com/company/${org.vanity || org.id}/`}
                  target="_blank"
                  rel="noopener"
                  color="inherit"
                >
                  {org.name}
                </Link>
              ) : (
                'No company page chosen'
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connected by {connection.connectedBy} on {fDate(connection.connectedAt)}
            </Typography>
          </Box>
        </Stack>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Last sync
          </Typography>
          <Typography variant="body2">
            {connection.lastSyncAt ? fDateTime(connection.lastSyncAt) : 'Not yet'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Sign-in
          </Typography>
          {connection.renewsItself ? (
            <Label color="success">Renews automatically</Label>
          ) : (
            <Typography variant="body2">
              Expires {fDate(connection.accessTokenExpiresAt)}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

function OrganizationPicker({ canManage }) {
  const { organizations, error, loading } = useLinkedInOrganizations(canManage);
  const [choice, setChoice] = useState('');
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    return (
      <Alert severity="info">An IOTA admin needs to choose which company page to follow.</Alert>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await chooseLinkedInOrganization(choice);
      toast.success('Company page chosen. Its activity has been synced.');
    } catch (err) {
      toast.error(apiMessage(err, 'The page could not be chosen.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2} sx={{ maxWidth: 480 }}>
        <Typography variant="subtitle1">Which company page should the dashboard follow?</Typography>
        {loading ? <LinearProgress /> : null}
        {error ? (
          <Alert severity="error">{apiMessage(error, 'Pages could not be listed.')}</Alert>
        ) : null}
        <TextField
          select
          size="small"
          label="Company page"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={!organizations.length}
        >
          {organizations.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>
        <LoadingButton
          variant="contained"
          loading={saving}
          disabled={!choice}
          onClick={save}
          sx={{ alignSelf: 'flex-start' }}
        >
          Use this page
        </LoadingButton>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function StatTile({ label, value, caption }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </Card>
  );
}

function Activity() {
  const { overview, error, loading } = useLinkedInOverview(true);

  if (loading && !overview) return <LinearProgress />;
  if (error) {
    return (
      <Alert severity="error">{apiMessage(error, 'LinkedIn activity could not be loaded.')}</Alert>
    );
  }
  if (!overview) return null;

  const t = overview.totals;
  const gain = t.followerGain;
  const hasData = overview.days.length > 0 || overview.posts.length > 0;

  if (!hasData) {
    return (
      <Card>
        <EmptyContent
          filled
          title="Nothing synced yet"
          description="Activity appears after the first sync. It runs every night, or press Sync now."
          sx={{ py: 8 }}
        />
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatTile
          label="Followers"
          value={n(overview.followers)}
          caption={`${gain >= 0 ? '+' : ''}${fNumber(gain) || 0} in the last 30 days`}
        />
        <StatTile label="Impressions" value={n(t.impressions)} caption="Last 30 days" />
        <StatTile
          label="Engagement rate"
          value={t.engagementRate === null ? '—' : fPercent(t.engagementRate * 100)}
          caption="Clicks, reactions, comments and shares ÷ impressions"
        />
        <StatTile
          label="Reactions · comments · shares"
          value={`${n(t.reactions)} · ${n(t.comments)} · ${n(t.shares)}`}
          caption={`${n(t.clicks)} clicks · last 30 days`}
        />
      </Box>

      <Card>
        <CardHeader
          title="Recent posts"
          subheader="Lifetime figures for each post, as of the last sync"
        />
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Posted</TableCell>
                <TableCell>Post</TableCell>
                <TableCell align="right">Impressions</TableCell>
                <TableCell align="right">Clicks</TableCell>
                <TableCell align="right">Reactions</TableCell>
                <TableCell align="right">Comments</TableCell>
                <TableCell align="right">Shares</TableCell>
                <TableCell align="right">Engagement</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.posts.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {p.publishedAt ? fDate(p.publishedAt) : '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Link href={p.url} target="_blank" rel="noopener" color="inherit">
                      <Typography variant="body2" noWrap>
                        {p.text?.trim() || 'View post'}
                      </Typography>
                    </Link>
                  </TableCell>
                  <TableCell align="right">{n(p.impressions)}</TableCell>
                  <TableCell align="right">{n(p.clicks)}</TableCell>
                  <TableCell align="right">{n(p.reactions)}</TableCell>
                  <TableCell align="right">{n(p.comments)}</TableCell>
                  <TableCell align="right">{n(p.shares)}</TableCell>
                  <TableCell align="right">
                    {p.engagement === null ? '—' : fPercent(p.engagement * 100)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}
