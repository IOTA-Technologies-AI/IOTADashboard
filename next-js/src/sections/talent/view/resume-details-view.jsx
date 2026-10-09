'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  apiMessage,
  useTalentResume,
  attachCandidate,
  revokeResumeShare,
  shareTalentResume,
  updateTalentResume,
  useTalentRequirements,
  getOriginalResumeLink,
} from 'src/actions/talent';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CANDIDATE_STAGE, SHARE_DURATIONS } from '../constants';
import { resumeFileName, renderResumePdf } from '../resume-pdf';

// ----------------------------------------------------------------------

const lines = (text) =>
  String(text || '')
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Editable copy of the record: list fields as one-per-line text. */
function toDraft(resume) {
  const c = resume?.content || {};
  return {
    displayName: resume?.displayName || '',
    headline: resume?.headline || '',
    specialization: resume?.specialization || '',
    experienceYears: resume?.experienceYears ?? '',
    skills: resume?.skills || [],
    summary: c.summary || '',
    languages: (c.languages || []).join(', '),
    projects: (c.projects || []).join('\n'),
    experience: (c.experience || []).map((e) => ({
      ...e,
      highlights: (e.highlights || []).join('\n'),
    })),
    education: c.education || [],
    certifications: c.certifications || [],
  };
}

function fromDraft(d) {
  return {
    displayName: d.displayName,
    headline: d.headline,
    specialization: d.specialization,
    experienceYears: Number(d.experienceYears) || 0,
    skills: d.skills,
    content: {
      summary: d.summary,
      languages: d.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      projects: lines(d.projects),
      experience: d.experience.map((e) => ({ ...e, highlights: lines(e.highlights) })),
      education: d.education,
      certifications: d.certifications,
    },
  };
}

/** A repeating block (experience, education, certifications). */
function EntryList({ title, items, onChange, fields, empty, addLabel }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, dir) => {
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(i + dir, 0, it);
    onChange(next);
  };
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Button
          size="small"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => onChange([...items, empty])}
        >
          {addLabel}
        </Button>
      </Stack>
      <Stack spacing={2} divider={<Divider sx={{ borderStyle: 'dashed' }} />}>
        {items.map((item, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
            <Grid container spacing={1.5} sx={{ flexGrow: 1 }}>
              {fields.map((f) => (
                <Grid key={f.key} size={f.size || { xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={f.label}
                    value={item[f.key] || ''}
                    multiline={!!f.multiline}
                    minRows={f.multiline ? 3 : undefined}
                    helperText={f.helper}
                    onChange={(e) => update(i, { [f.key]: e.target.value })}
                  />
                </Grid>
              ))}
            </Grid>
            <Stack>
              <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                <Iconify icon="eva:arrow-ios-upward-fill" />
              </IconButton>
              <IconButton size="small" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <Iconify icon="eva:arrow-ios-downward-fill" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => remove(i)}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Stack>
          </Stack>
        ))}
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None.
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}

export function ResumeDetailsView({ id }) {
  const { resume, shares, requirements: links, loading, error, mutate } = useTalentResume(id);
  const { requirements } = useTalentRequirements({});

  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null); // object URL
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDays, setShareDays] = useState(7);
  const [newShare, setNewShare] = useState(null);
  const [attachTo, setAttachTo] = useState('');

  useEffect(() => {
    if (resume && !dirty) setDraft(toDraft(resume));
  }, [resume, dirty]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  if (loading || (resume && !draft)) return <LoadingScreen />;
  if (error || !resume) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Resume not found"
          description={apiMessage(error, 'It may have been removed.')}
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.talent.resumes.root}
              variant="contained"
            >
              Back to resumes
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  const edit = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const field = (key) => ({ value: draft[key], onChange: (e) => edit({ [key]: e.target.value }) });

  // What the PDF is built from: the saved record, or the unsaved edits.
  const current = () => ({ ...resume, ...fromDraft(draft), id: resume.id });

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateTalentResume(resume.id, fromDraft(draft));
      await mutate({ resume: saved, shares }, { revalidate: false });
      setDirty(false);
      setDraft(toDraft(saved));
      toast.success('Saved. Contact details and surname are removed again on every save.');
    } catch (err) {
      toast.error(apiMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const withPdf = async (key, fn) => {
    setBusy(key);
    try {
      await fn(await renderResumePdf(current()));
    } catch (err) {
      console.error(err);
      toast.error(apiMessage(err, 'The PDF could not be produced.'));
    } finally {
      setBusy('');
    }
  };

  const handlePreview = () =>
    withPdf('preview', async (blob) => setPreview(URL.createObjectURL(blob)));

  const handleDownload = () =>
    withPdf('download', async (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resumeFileName(current());
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });

  const handleShare = () =>
    withPdf('share', async (blob) => {
      if (dirty) {
        toast.warning('Save your changes first — the shared copy is made from the saved resume.');
        return;
      }
      const share = await shareTalentResume(resume.id, {
        pdfBase64: await blobToBase64(blob),
        expiresInDays: shareDays,
      });
      setNewShare(share);
      await mutate();
      try {
        await navigator.clipboard.writeText(share.url);
        toast.success('Link created and copied.');
      } catch {
        toast.success('Link created.');
      }
    });

  const handleRevoke = async (share) => {
    try {
      await revokeResumeShare(share.id);
      await mutate();
      toast.success('Link revoked. It no longer opens.');
    } catch (err) {
      toast.error(apiMessage(err, 'Could not revoke.'));
    }
  };

  const handleOriginal = async () => {
    setBusy('original');
    try {
      const { url } = await getOriginalResumeLink(resume.id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast.error(apiMessage(err, 'The original file could not be opened.'));
    } finally {
      setBusy('');
    }
  };

  const handleAttach = async () => {
    if (!attachTo) return;
    setBusy('attach');
    try {
      await attachCandidate(attachTo, resume.id);
      setAttachTo('');
      await mutate();
      toast.success('Added to the requirement as shortlisted.');
    } catch (err) {
      toast.error(apiMessage(err, 'Could not attach.'));
    } finally {
      setBusy('');
    }
  };

  const handleArchive = async () => {
    try {
      const saved = await updateTalentResume(resume.id, {
        status: resume.status === 'archived' ? 'active' : 'archived',
      });
      await mutate({ resume: saved, shares }, { revalidate: false });
      toast.success(
        saved.status === 'archived' ? 'Archived — hidden from the library.' : 'Restored.'
      );
    } catch (err) {
      toast.error(apiMessage(err, 'Could not update.'));
    }
  };

  const shareState = (s) => {
    if (s.revokedAt) return { label: 'Revoked', color: 'default' };
    if (new Date(s.expiresAt) < new Date()) return { label: 'Expired', color: 'default' };
    return { label: `Expires ${fDate(s.expiresAt)}`, color: 'success' };
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`${resume.resumeCode} · ${resume.displayName}${resume.specialization ? ` — ${resume.specialization}` : ''}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Talent', href: paths.dashboard.talent.root },
          { name: 'Resume Formatting', href: paths.dashboard.talent.resumes.root },
          { name: resume.resumeCode },
        ]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <LoadingButton
              variant="outlined"
              loading={busy === 'preview'}
              startIcon={<Iconify icon="solar:eye-bold" />}
              onClick={handlePreview}
            >
              Preview
            </LoadingButton>
            <LoadingButton
              variant="outlined"
              loading={busy === 'download'}
              startIcon={<Iconify icon="solar:download-bold" />}
              onClick={handleDownload}
            >
              Download PDF
            </LoadingButton>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:share-bold" />}
              onClick={() => {
                setNewShare(null);
                setShareOpen(true);
              }}
            >
              Share link
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {resume.status === 'archived' ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This resume is archived and hidden from the library search.
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Profile
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Name shown"
                    helperText="First name only"
                    {...field('displayName')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField fullWidth label="Headline" {...field('headline')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Specialization" {...field('specialization')} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField fullWidth type="number" label="Years" {...field('experienceYears')} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Languages"
                    helperText="Comma-separated"
                    {...field('languages')}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={draft.skills}
                    onChange={(_, v) => edit({ skills: v })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Skills"
                        helperText="Type and press Enter to add"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Summary"
                    {...field('summary')}
                  />
                </Grid>
              </Grid>
            </Card>

            <EntryList
              title="Experience"
              addLabel="Add role"
              items={draft.experience}
              onChange={(experience) => edit({ experience })}
              empty={{
                title: '',
                company: '',
                location: '',
                startDate: '',
                endDate: '',
                highlights: '',
              }}
              fields={[
                { key: 'title', label: 'Role' },
                { key: 'company', label: 'Company' },
                { key: 'location', label: 'Location', size: { xs: 12, sm: 4 } },
                { key: 'startDate', label: 'From', size: { xs: 6, sm: 4 } },
                { key: 'endDate', label: 'To', size: { xs: 6, sm: 4 } },
                {
                  key: 'highlights',
                  label: 'Highlights',
                  multiline: true,
                  helper: 'One per line',
                  size: { xs: 12 },
                },
              ]}
            />

            <EntryList
              title="Education"
              addLabel="Add"
              items={draft.education}
              onChange={(education) => edit({ education })}
              empty={{ degree: '', institution: '', year: '' }}
              fields={[
                { key: 'degree', label: 'Degree', size: { xs: 12, sm: 5 } },
                { key: 'institution', label: 'Institution', size: { xs: 12, sm: 5 } },
                { key: 'year', label: 'Year', size: { xs: 12, sm: 2 } },
              ]}
            />

            <EntryList
              title="Certifications"
              addLabel="Add"
              items={draft.certifications}
              onChange={(certifications) => edit({ certifications })}
              empty={{ name: '', issuer: '', year: '' }}
              fields={[
                { key: 'name', label: 'Certification', size: { xs: 12, sm: 5 } },
                { key: 'issuer', label: 'Issuer', size: { xs: 12, sm: 5 } },
                { key: 'year', label: 'Year', size: { xs: 12, sm: 2 } },
              ]}
            />

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Notable projects
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                helperText="One per line (optional)"
                {...field('projects')}
              />
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <LoadingButton
                  fullWidth
                  size="large"
                  variant="contained"
                  loading={saving}
                  disabled={!dirty}
                  onClick={handleSave}
                >
                  {dirty ? 'Save changes' : 'Saved'}
                </LoadingButton>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Typography variant="caption" color="text.secondary">
                  Added {fDateTime(resume.createdAt)} by {resume.createdBy}
                </Typography>
                {resume.candidateFullName ? (
                  <Typography variant="caption" color="text.secondary">
                    Internal: {resume.candidateFullName} (never printed)
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1}>
                  <LoadingButton
                    size="small"
                    loading={busy === 'original'}
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                    onClick={handleOriginal}
                  >
                    Original file
                  </LoadingButton>
                  <Button size="small" color="inherit" onClick={handleArchive}>
                    {resume.status === 'archived' ? 'Restore' : 'Archive'}
                  </Button>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Requirements
              </Typography>
              <Stack spacing={1.5}>
                {links.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Not attached to any requirement.
                  </Typography>
                ) : null}
                {links.map((l) => (
                  <Stack key={l.requirementId} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Link
                        component={RouterLink}
                        href={paths.dashboard.talent.requirements.details(l.requirementId)}
                        variant="subtitle2"
                        noWrap
                        display="block"
                      >
                        {l.requirement?.title || 'Requirement'}
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        {l.requirement?.clientName}
                      </Typography>
                    </Box>
                    <Label variant="soft" color={CANDIDATE_STAGE[l.stage]?.color || 'default'}>
                      {CANDIDATE_STAGE[l.stage]?.label || l.stage}
                    </Label>
                  </Stack>
                ))}
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Stack direction="row" spacing={1}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Attach to requirement"
                    value={attachTo}
                    onChange={(e) => setAttachTo(e.target.value)}
                  >
                    {requirements
                      .filter(
                        (r) =>
                          !['filled', 'closed'].includes(r.status) &&
                          !links.some((l) => l.requirementId === r.id)
                      )
                      .map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.title} — {r.clientName}
                        </MenuItem>
                      ))}
                  </TextField>
                  <LoadingButton
                    variant="outlined"
                    loading={busy === 'attach'}
                    disabled={!attachTo}
                    onClick={handleAttach}
                  >
                    Attach
                  </LoadingButton>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Share links
              </Typography>
              <Stack spacing={1.5}>
                {shares.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None yet. A link opens the formatted PDF and stops working when it expires.
                  </Typography>
                ) : null}
                {shares.map((s) => {
                  const state = shareState(s);
                  const live = state.color === 'success';
                  return (
                    <Stack key={s.id} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Label variant="soft" color={state.color}>
                          {state.label}
                        </Label>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {fDate(s.createdAt)} · {s.createdBy}
                        </Typography>
                      </Box>
                      {live ? (
                        <>
                          <Tooltip title="Copy link">
                            <IconButton
                              size="small"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(s.url)
                                  .then(() => toast.success('Link copied.'))
                              }
                            >
                              <Iconify icon="solar:copy-bold" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Revoke — the link stops working now">
                            <IconButton size="small" color="error" onClick={() => handleRevoke(s)}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : null}
                    </Stack>
                  );
                })}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Preview */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>Preview{dirty ? ' (unsaved changes)' : ''}</Box>
          <IconButton onClick={() => setPreview(null)}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '80vh' }}>
          {preview ? (
            <iframe
              title="Resume preview"
              src={`${preview}#view=FitH&navpanes=0`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Share {resume.displayName}&apos;s resume</DialogTitle>
        <DialogContent>
          {newShare ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success">
                The link works until {fDateTime(newShare.expiresAt)}. Anyone with it can open the
                PDF.
              </Alert>
              <TextField
                fullWidth
                size="small"
                value={newShare.url}
                InputProps={{ readOnly: true }}
                onFocus={(e) => e.target.select()}
              />
              <Link href={newShare.url} target="_blank" rel="noopener" variant="body2">
                Open the shared PDF
              </Link>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                A copy of the formatted PDF is stored in IOTA&apos;s Azure storage and the link
                stops working when it expires. You can revoke it earlier.
              </Typography>
              {dirty ? (
                <Alert severity="warning">
                  Save your changes first — the link shares the saved resume.
                </Alert>
              ) : null}
              <TextField
                select
                label="Link expires after"
                value={shareDays}
                onChange={(e) => setShareDays(Number(e.target.value))}
              >
                {SHARE_DURATIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d} day{d === 1 ? '' : 's'}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShareOpen(false)}>
            {newShare ? 'Done' : 'Cancel'}
          </Button>
          {newShare ? null : (
            <LoadingButton
              variant="contained"
              loading={busy === 'share'}
              disabled={dirty}
              onClick={handleShare}
            >
              Create link
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
