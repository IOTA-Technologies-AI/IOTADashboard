'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
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

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useIssue, updateIssue, getIssueBrief, refreshIssueEvidence } from 'src/actions/issues';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { STATUS, SEVERITY } from '../issue-labels';

// ----------------------------------------------------------------------

const mono = {
  fontFamily: 'monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

function Section({ title, subheader, action, children }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title={title} subheader={subheader} action={action} sx={{ mb: 1 }} />
      <Box sx={{ p: 3, pt: 1 }}>{children}</Box>
    </Card>
  );
}

const TraceLink = ({ traceId, traceUrl }) =>
  traceId ? (
    traceUrl ? (
      <Link href={traceUrl} target="_blank" rel="noopener" sx={mono}>
        {traceId.slice(0, 12)}…
      </Link>
    ) : (
      <Box component="span" sx={mono}>
        {traceId}
      </Box>
    )
  ) : (
    '—'
  );

/** Everything captured with one issue report, and its triage. */
export function IssueDetailsView({ id }) {
  const { issue, error, loading, refresh } = useIssue(id);
  const [form, setForm] = useState({ status: 'new', assignee: '', resolutionNote: '' });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const [showAllConsole, setShowAllConsole] = useState(false);
  const [openStack, setOpenStack] = useState(null);

  useEffect(() => {
    if (issue) {
      setForm({
        status: issue.status,
        assignee: issue.assignee || '',
        resolutionNote: issue.resolutionNote || '',
      });
    }
  }, [issue]);

  if (loading) {
    return (
      <DashboardContent>
        <LinearProgress />
      </DashboardContent>
    );
  }
  if (error || !issue) {
    return (
      <DashboardContent>
        <Alert severity="error">{message(error, 'Issue not found.')}</Alert>
      </DashboardContent>
    );
  }

  const failed = issue.networkLogs.filter((n) => n.status >= 400 || n.status === 0);
  const calls = showAllCalls ? [...issue.networkLogs].reverse() : [...failed].reverse();
  const consoleRows = showAllConsole
    ? issue.consoleLogs
    : issue.consoleLogs.filter((c) => c.level === 'error' || c.level === 'warn');

  const copyBrief = async () => {
    try {
      const md = await getIssueBrief(issue.id);
      await navigator.clipboard.writeText(md);
      toast.success('Copied. Paste it to the developer (or to Claude) with the screenshots.');
    } catch (err) {
      toast.error(message(err, 'Could not copy the brief.'));
    }
  };

  const downloadBrief = async () => {
    try {
      const md = await getIssueBrief(issue.id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
      a.download = `${issue.ticketNumber}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(message(err, 'Could not download the brief.'));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateIssue(issue.id, {
        status: form.status,
        assignee: form.assignee || null,
        resolutionNote: form.resolutionNote || null,
      });
      await refresh();
      toast.success('Saved.');
    } catch (err) {
      toast.error(message(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const reloadEvidence = async () => {
    setRefreshing(true);
    try {
      const r = await refreshIssueEvidence(issue.id);
      await refresh();
      toast.success(`Found ${r.apiErrors} backend error(s) and ${r.sentryEvents} Sentry event(s).`);
    } catch (err) {
      toast.error(message(err, 'Could not refresh.'));
    } finally {
      setRefreshing(false);
    }
  };

  const ctx = issue.context || {};

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={`${issue.ticketNumber} · ${issue.title}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Issues', href: paths.dashboard.issues.root },
          { name: issue.ticketNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:copy-bold" />}
              onClick={copyBrief}
            >
              Copy for developer
            </Button>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:download-bold" />}
              onClick={downloadBrief}
            >
              Brief (.md)
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Section
            title="What happened"
            subheader={`Reported by ${issue.reporterName || issue.reporterEmail} · ${fDateTime(issue.createdAt)} · ${issue.pageUrl || ''}`}
            action={
              <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
                <Label variant="soft" color={SEVERITY[issue.severity]?.color}>
                  {SEVERITY[issue.severity]?.label}
                </Label>
                <Label variant="soft" color={STATUS[issue.status]?.color}>
                  {STATUS[issue.status]?.label}
                </Label>
              </Stack>
            }
          >
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{issue.description}</Typography>
            {issue.stepsToReproduce ? (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Steps to reproduce
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {issue.stepsToReproduce}
                </Typography>
              </>
            ) : null}
            {issue.expected ? (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Expected
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {issue.expected}
                </Typography>
              </>
            ) : null}
          </Section>

          {issue.screenshots.length ? (
            <Section title="Screenshots">
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {issue.screenshots.map((s, i) =>
                  s.url ? (
                    <Box
                      key={i}
                      component="a"
                      href={s.url}
                      target="_blank"
                      rel="noopener"
                      sx={{
                        width: { xs: 1, sm: 360 },
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component="img"
                        src={s.url}
                        alt={`Screenshot ${i + 1}`}
                        sx={{ width: 1, display: 'block' }}
                      />
                    </Box>
                  ) : (
                    <Typography key={i} variant="body2" color="text.secondary">
                      Screenshot {i + 1} unavailable
                    </Typography>
                  )
                )}
              </Stack>
            </Section>
          ) : null}

          <Section
            title={`API calls — ${failed.length} failed`}
            subheader="Trace ids link to the request in Encore Cloud."
            action={
              <Button size="small" onClick={() => setShowAllCalls((v) => !v)}>
                {showAllCalls ? 'Failed only' : `All ${issue.networkLogs.length}`}
              </Button>
            }
          >
            {calls.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Call</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Error</TableCell>
                    <TableCell>Trace</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calls.map((n, i) => (
                    <TableRow
                      key={i}
                      sx={
                        n.status >= 400 || n.status === 0 ? { bgcolor: 'error.lighter' } : undefined
                      }
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {fDateTime(n.time, 'HH:mm:ss')}
                      </TableCell>
                      <TableCell sx={mono}>
                        {n.method} {n.url}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {n.durationMs} ms
                        </Typography>
                      </TableCell>
                      <TableCell>{n.status || 'network'}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>{n.error || ''}</TableCell>
                      <TableCell>
                        <TraceLink traceId={n.traceId} traceUrl={n.traceUrl} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No failed calls were recorded.
              </Typography>
            )}
          </Section>

          <Section
            title={`Backend errors (${issue.apiErrors.length})`}
            subheader="Errors the API recorded for this user's requests around the time of the report."
            action={
              issue.canManage ? (
                <LoadingButton size="small" loading={refreshing} onClick={reloadEvidence}>
                  Look again
                </LoadingButton>
              ) : null
            }
          >
            {issue.apiErrors.length ? (
              <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={1.5}>
                {issue.apiErrors.map((e, i) => (
                  <Box key={e.id ?? i}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Label variant="soft" color={e.httpStatus >= 500 ? 'error' : 'warning'}>
                        {e.errorCode} {e.httpStatus}
                      </Label>
                      <Typography variant="subtitle2" sx={mono}>
                        {e.service}.{e.endpoint}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.method} {e.path} · {fDateTime(e.createdAt)} · {e.durationMs} ms
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {e.message}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography variant="caption">
                        Trace: <TraceLink traceId={e.traceId} traceUrl={e.traceUrl} />
                      </Typography>
                      {e.stack ? (
                        <Link
                          component="button"
                          variant="caption"
                          onClick={() => setOpenStack(openStack === i ? null : i)}
                        >
                          {openStack === i ? 'Hide' : 'Show'} stack trace
                        </Link>
                      ) : null}
                    </Stack>
                    <Collapse in={openStack === i}>
                      <Box
                        sx={{
                          ...mono,
                          mt: 1,
                          p: 1.5,
                          bgcolor: 'background.neutral',
                          borderRadius: 1,
                        }}
                      >
                        {e.stack}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                None recorded. (Errors are recorded once 20261016_issue_reports.sql has run.)
              </Typography>
            )}
          </Section>

          <Section title={`Sentry events (${issue.sentryEvents.length})`}>
            {issue.sentryNote ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {issue.sentryNote}
              </Alert>
            ) : null}
            {issue.sentryEvents.length ? (
              <Stack spacing={1.5}>
                {issue.sentryEvents.map((s) => (
                  <Box key={s.eventId}>
                    <Link href={s.link} target="_blank" rel="noopener" variant="subtitle2">
                      {s.title}
                    </Link>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {s.timestamp ? fDateTime(s.timestamp) : ''} {s.url ? `· ${s.url}` : ''}{' '}
                      {s.release ? `· release ${s.release}` : ''}
                    </Typography>
                    {s.exception ? <Typography variant="body2">{s.exception}</Typography> : null}
                    {s.frames?.length ? (
                      <Box sx={{ ...mono, mt: 0.5 }}>
                        {s.frames.map((f) => `at ${f}`).join('\n')}
                      </Box>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                None found.
              </Typography>
            )}
          </Section>

          <Section
            title="Browser console"
            subheader={`${issue.consoleLogs.length} entries recorded`}
            action={
              <Button size="small" onClick={() => setShowAllConsole((v) => !v)}>
                {showAllConsole ? 'Errors and warnings' : 'All entries'}
              </Button>
            }
          >
            {consoleRows.length ? (
              <Box
                sx={{
                  ...mono,
                  maxHeight: 420,
                  overflow: 'auto',
                  p: 1.5,
                  bgcolor: 'background.neutral',
                  borderRadius: 1,
                }}
              >
                {consoleRows.map((c, i) => (
                  <Box
                    key={i}
                    sx={{
                      color:
                        c.level === 'error'
                          ? 'error.main'
                          : c.level === 'warn'
                            ? 'warning.dark'
                            : 'text.primary',
                      mb: 0.5,
                    }}
                  >
                    [{fDateTime(c.time, 'HH:mm:ss')}] {c.level.toUpperCase()} {c.message}
                    {c.stack ? `\n${c.stack.split('\n').slice(0, 6).join('\n')}` : ''}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No errors or warnings.
              </Typography>
            )}
          </Section>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {issue.canManage ? (
            <Section title="Triage">
              <Stack spacing={2}>
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Assigned to (email)"
                  value={form.assignee}
                  onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                />
                <TextField
                  multiline
                  minRows={3}
                  label="Resolution note"
                  value={form.resolutionNote}
                  onChange={(e) => setForm((f) => ({ ...f, resolutionNote: e.target.value }))}
                />
                <LoadingButton variant="contained" loading={saving} onClick={save}>
                  Save
                </LoadingButton>
              </Stack>
            </Section>
          ) : issue.resolutionNote ? (
            <Section title="Resolution">
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {issue.resolutionNote}
              </Typography>
            </Section>
          ) : null}

          <Section title="Environment">
            <Table size="small">
              <TableBody>
                {[
                  'build',
                  'buildDate',
                  'appVersion',
                  'apiEnvironment',
                  'browser',
                  'os',
                  'viewport',
                  'screen',
                  'language',
                  'timeZone',
                  'role',
                  'online',
                ]
                  .filter((k) => ctx[k] !== undefined && ctx[k] !== '')
                  .map((k) => (
                    <TableRow key={k}>
                      <TableCell sx={{ color: 'text.secondary', width: 120 }}>{k}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{String(ctx[k])}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Section>

          {issue.navigation.length ? (
            <Section title="Pages visited">
              <Box sx={mono}>
                {[...issue.navigation]
                  .reverse()
                  .slice(0, 20)
                  .map((n) => `${fDateTime(n.time, 'HH:mm:ss')}  ${n.path}`)
                  .join('\n')}
              </Box>
            </Section>
          ) : null}

          {issue.statusHistory.length ? (
            <Section title="History">
              <Stack spacing={1}>
                {[...issue.statusHistory].reverse().map((h, i) => (
                  <Typography key={i} variant="body2">
                    <strong>{STATUS[h.status]?.label || h.status}</strong> · {h.by} ·{' '}
                    {fDateTime(h.at)}
                    {h.note ? ` — ${h.note}` : ''}
                  </Typography>
                ))}
              </Stack>
            </Section>
          ) : null}
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
