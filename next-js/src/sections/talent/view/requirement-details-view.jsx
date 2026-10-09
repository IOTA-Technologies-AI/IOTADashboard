'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  apiMessage,
  deleteRequirement,
  updateRequirement,
  recordLinkedinPost,
  useTalentRequirement,
  generateRequirementJd,
  createJobFromRequirement,
} from 'src/actions/talent';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RequirementCandidates } from '../requirement-candidates';
import { PRIORITY, CAREERS_URL, REQUIREMENT_STATUS } from '../constants';

// ----------------------------------------------------------------------

/** The text of the LinkedIn post, built from the JD. */
function linkedinPostText(r) {
  const jd = r.jdData || {};
  const skills = [...(jd.mandatorySkills || [])].slice(0, 8);
  const overview =
    jd.roleOverview ||
    (r.jdMarkdown || '')
      .replace(/[#*_>`]/g, '')
      .split('\n')
      .find((l) => l.trim().length > 60) ||
    '';
  return [
    `We're hiring: ${r.title}${r.location ? ` — ${r.location}` : ''}`,
    '',
    overview.trim(),
    '',
    skills.length ? `Key skills: ${skills.join(', ')}` : '',
    r.experienceYears ? `Experience: ${r.experienceYears}+ years` : '',
    r.employmentType ? `Type: ${r.employmentType}` : '',
    '',
    `Apply: ${CAREERS_URL}`,
    '',
    '#hiring #careers #IOTATechnologies',
  ]
    .filter((line, i, all) => line !== '' || (all[i - 1] !== '' && i > 0))
    .join('\n')
    .trim();
}

function Info({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{children || '—'}</Typography>
    </Box>
  );
}

export function RequirementDetailsView({ id }) {
  const router = useRouter();
  const { requirement: r, loading, error, mutate } = useTalentRequirement(id);

  const [editingJd, setEditingJd] = useState(false);
  const [jdDraft, setJdDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (r) {
      setJdDraft(r.jdMarkdown || '');
      setPostUrl(r.linkedinPostUrl || '');
    }
  }, [r]);

  if (loading) return <LoadingScreen />;
  if (error || !r) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Requirement not found"
          description={apiMessage(error, 'It may have been deleted.')}
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.talent.requirements.root}
              variant="contained"
            >
              Back to requirements
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const updated = await fn();
      await mutate(
        updated?.requirement ? { requirement: updated.requirement } : { requirement: updated },
        {
          revalidate: true,
        }
      );
      if (ok) toast.success(ok);
      return true;
    } catch (err) {
      toast.error(apiMessage(err, 'Something went wrong.'));
      return false;
    } finally {
      setBusy('');
    }
  };

  const handleGenerate = () =>
    run('generate', () => generateRequirementJd(id), 'Job description written.');

  const handleSaveJd = async () => {
    if (
      await run(
        'saveJd',
        () =>
          updateRequirement(id, {
            jdMarkdown: jdDraft,
            status: r.status === 'new' ? 'jd_ready' : r.status,
          }),
        'Job description saved.'
      )
    ) {
      setEditingJd(false);
    }
  };

  const handleStatus = (status) =>
    run('status', () => updateRequirement(id, { status }), 'Status updated.');

  const handleCreateJob = () =>
    run(
      'job',
      () => createJobFromRequirement(id),
      'Job posting created and sent for approval. Once approved it syncs to the careers site.'
    );

  const handleOpenLinkedin = async () => {
    const text = linkedinPostText(r);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Post text copied. Paste it in LinkedIn if it is not prefilled.');
    } catch {
      // clipboard blocked — the composer is still prefilled
    }
    window.open(
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener'
    );
  };

  const handleSavePostUrl = () =>
    run('linkedin', () => recordLinkedinPost(id, postUrl.trim()), 'LinkedIn post linked.');

  const handleDelete = async () => {
    try {
      await deleteRequirement(id);
      toast.success('Requirement deleted.');
      router.push(paths.dashboard.talent.requirements.root);
    } catch (err) {
      toast.error(apiMessage(err, 'Could not delete.'));
    }
  };

  const hasJd = !!r.jdMarkdown;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={r.title}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Talent', href: paths.dashboard.talent.root },
          { name: 'Requirements', href: paths.dashboard.talent.requirements.root },
          { name: r.title },
        ]}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              label="Status"
              value={r.status}
              disabled={busy === 'status'}
              onChange={(e) => handleStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {Object.entries(REQUIREMENT_STATUS).map(([k, s]) => (
                <MenuItem key={k} value={k}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <Button color="error" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Job description</Typography>
                <Stack direction="row" spacing={1}>
                  {hasJd && !editingJd ? (
                    <Button
                      size="small"
                      startIcon={<Iconify icon="solar:pen-bold" />}
                      onClick={() => setEditingJd(true)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  <LoadingButton
                    size="small"
                    variant={hasJd ? 'outlined' : 'contained'}
                    loading={busy === 'generate'}
                    disabled={editingJd}
                    startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
                    onClick={handleGenerate}
                  >
                    {hasJd
                      ? r.sourceType === 'jd' && !r.jdGeneratedAt
                        ? 'Rewrite in IOTA format'
                        : 'Rewrite'
                      : 'Write JD'}
                  </LoadingButton>
                </Stack>
              </Stack>

              {busy === 'generate' ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary">
                    Writing the job description…
                  </Typography>
                </Stack>
              ) : editingJd ? (
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={16}
                    value={jdDraft}
                    onChange={(e) => setJdDraft(e.target.value)}
                    helperText="Markdown: ## for headings, - for bullets."
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      color="inherit"
                      onClick={() => {
                        setJdDraft(r.jdMarkdown || '');
                        setEditingJd(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <LoadingButton
                      variant="contained"
                      loading={busy === 'saveJd'}
                      onClick={handleSaveJd}
                    >
                      Save
                    </LoadingButton>
                  </Stack>
                </Stack>
              ) : hasJd ? (
                <>
                  {r.jdGeneratedAt ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 1 }}
                    >
                      Written {fDateTime(r.jdGeneratedAt)}. Review before posting.
                    </Typography>
                  ) : null}
                  <Markdown sx={{ '& h2': { fontSize: 18, mt: 2 } }}>{r.jdMarkdown}</Markdown>
                </>
              ) : (
                <Alert severity="info">
                  No job description yet. <strong>Write JD</strong> turns the client&apos;s
                  requirement into a complete one.
                </Alert>
              )}
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                What the client sent
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.sourceType === 'jd' ? 'Full job description' : 'One-line requirement'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                {r.sourceText}
              </Typography>
            </Card>

            <RequirementCandidates
              requirement={r}
              onRequirementChange={(next) => mutate({ requirement: next }, { revalidate: false })}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Info label="Client">{r.clientName}</Info>
                <Info label="Location">{r.location}</Info>
                <Info label="Department">{r.department}</Info>
                <Stack direction="row" spacing={3}>
                  <Info label="Experience">
                    {r.experienceYears ? `${r.experienceYears}+ years` : null}
                  </Info>
                  <Info label="Positions">{r.positions}</Info>
                </Stack>
                <Stack direction="row" spacing={3} alignItems="flex-end">
                  <Info label="Employment">{r.employmentType}</Info>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Priority
                    </Typography>
                    <Label variant="soft" color={PRIORITY[r.priority]?.color || 'default'}>
                      {PRIORITY[r.priority]?.label || r.priority}
                    </Label>
                  </Box>
                </Stack>
                <Info label="Received">{`${fDate(r.createdAt)} · ${r.createdBy}`}</Info>
                {r.notes ? <Info label="Notes">{r.notes}</Info> : null}
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Publish
              </Typography>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2">1. Careers site</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    Creates the posting in Job, where it is approved and synced to the careers site.
                  </Typography>
                  {r.jobId ? (
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      href={paths.dashboard.job.details(r.jobId)}
                      startIcon={<Iconify icon="solar:case-minimalistic-bold" />}
                    >
                      Open job #{r.jobId}
                    </Button>
                  ) : (
                    <LoadingButton
                      size="small"
                      variant="contained"
                      loading={busy === 'job'}
                      disabled={!hasJd}
                      onClick={handleCreateJob}
                    >
                      Create job posting
                    </LoadingButton>
                  )}
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box>
                  <Typography variant="subtitle2">2. LinkedIn</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    Opens LinkedIn with the post written for you. Post it from the IOTA page, then
                    paste the post&apos;s link here.
                  </Typography>
                  <Stack spacing={1.5}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!hasJd}
                      startIcon={<Iconify icon="socials:linkedin" />}
                      onClick={handleOpenLinkedin}
                    >
                      Post on LinkedIn
                    </Button>
                    <TextField
                      size="small"
                      label="LinkedIn post link"
                      placeholder="https://www.linkedin.com/posts/…"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                    />
                    <LoadingButton
                      size="small"
                      variant="contained"
                      loading={busy === 'linkedin'}
                      disabled={!postUrl.trim() || postUrl.trim() === r.linkedinPostUrl}
                      onClick={handleSavePostUrl}
                    >
                      Save link
                    </LoadingButton>
                    {r.linkedinPostUrl ? (
                      <Typography variant="caption">
                        Posted {fDate(r.linkedinPostedAt)} ·{' '}
                        <Link href={r.linkedinPostUrl} target="_blank" rel="noopener">
                          view post
                        </Link>
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete requirement"
        content="Delete this requirement and its job description? A job posting already created in Job is not affected."
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}
