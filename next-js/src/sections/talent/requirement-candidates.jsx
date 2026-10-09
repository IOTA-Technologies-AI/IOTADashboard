'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import {
  apiMessage,
  attachCandidate,
  detachCandidate,
  updateCandidate,
  useTalentResumes,
  matchRequirement,
  uploadTalentResume,
  useRequirementCandidates,
} from 'src/actions/talent';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { scoreColor, CANDIDATE_STAGE } from './constants';

// ----------------------------------------------------------------------

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function ResumeLine({ resume, secondary }) {
  return (
    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          component={RouterLink}
          href={paths.dashboard.talent.resumes.details(resume.id || resume.resumeId)}
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {resume.displayName}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {resume.resumeCode}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" noWrap>
        {[
          resume.headline || resume.specialization,
          resume.experienceYears ? `${Number(resume.experienceYears)} yrs` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      {secondary}
    </Box>
  );
}

/** Picks a resume from the library by search, to attach to the requirement. */
function AddFromLibraryDialog({ open, onClose, attachedIds, onAttach }) {
  const [q, setQ] = useState('');
  const { resumes, loading } = useTalentResumes(open ? { q: q || undefined, limit: 30 } : null);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add a resume from the library</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search skills, role, employer or resume ID…"
          sx={{ mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        {loading ? <LinearProgress sx={{ mt: 1 }} /> : null}
        <List dense sx={{ mt: 1, maxHeight: 420, overflow: 'auto' }}>
          {resumes.map((r) => {
            const attached = attachedIds.has(r.id);
            return (
              <ListItemButton key={r.id} disabled={attached} onClick={() => onAttach(r)}>
                <ResumeLine resume={r} />
                {attached ? (
                  <Label variant="soft">Attached</Label>
                ) : (
                  <Iconify icon="mingcute:add-line" />
                )}
              </ListItemButton>
            );
          })}
          {!loading && resumes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No resumes found.
            </Typography>
          ) : null}
        </List>
      </DialogContent>
    </Dialog>
  );
}

export function RequirementCandidates({ requirement, onRequirementChange }) {
  const { candidates, loading, mutate } = useRequirementCandidates(requirement.id);
  const [matching, setMatching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(null);
  const inputRef = useRef(null);

  const attachedIds = new Set(candidates.map((c) => c.resumeId));
  const matches = Array.isArray(requirement.matchResults) ? requirement.matchResults : [];
  const hasJd = !!requirement.jdMarkdown;

  const run = async (key, fn, ok) => {
    setBusyId(key);
    try {
      const next = await fn();
      await mutate({ candidates: next }, { revalidate: false });
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(apiMessage(err, 'Something went wrong.'));
    } finally {
      setBusyId('');
    }
  };

  const handleMatch = async () => {
    setMatching(true);
    try {
      const res = await matchRequirement(requirement.id);
      onRequirementChange?.(res.requirement);
      if (!res.poolSize) toast.info('No resumes in the library mention these skills yet.');
      else if (!res.matches.length)
        toast.info(`Checked ${res.poolSize} profiles; none is a good fit.`);
      else
        toast.success(
          `${res.matches.length} matching profile${res.matches.length === 1 ? '' : 's'} found.`
        );
    } catch (err) {
      toast.error(apiMessage(err, 'Matching failed.'));
    } finally {
      setMatching(false);
    }
  };

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const failed = [];
    for (let i = 0; i < files.length; i += 1) {
      setUploading({ n: i + 1, total: files.length, name: files[i].name });
      try {
         
        await uploadTalentResume({
          fileName: files[i].name,
           
          fileBase64: await toBase64(files[i]),
          requirementId: requirement.id,
        });
      } catch (err) {
        failed.push(`${files[i].name}: ${apiMessage(err, 'failed')}`);
      }
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = '';
    await mutate();
    if (failed.length) toast.error(failed.join(' · '));
    else toast.success('Formatted and added to this requirement.');
  };

  return (
    <Stack spacing={3}>
      {/* ── Matches from the library ── */}
      <Card sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h6">Matching resumes</Typography>
            <Typography variant="caption" color="text.secondary">
              {requirement.matchedAt
                ? `Library checked ${fDateTime(requirement.matchedAt)}`
                : 'Profiles from the resume library that fit this requirement'}
            </Typography>
          </Box>
          <Tooltip title={hasJd ? '' : 'Write the job description first'}>
            <span>
              <LoadingButton
                size="small"
                variant={matches.length ? 'outlined' : 'contained'}
                loading={matching}
                disabled={!hasJd}
                startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
                onClick={handleMatch}
              >
                {requirement.matchedAt ? 'Match again' : 'Find matches'}
              </LoadingButton>
            </span>
          </Tooltip>
        </Stack>

        {matching ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Searching the library and scoring the closest profiles…
            </Typography>
            <LinearProgress sx={{ mt: 1 }} />
          </Box>
        ) : null}

        {!matching && requirement.matchedAt && matches.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No good fit in the library yet. Upload resumes for this role below, then match again.
          </Alert>
        ) : null}

        <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={1.5} sx={{ mt: 1 }}>
          {matches.map((m) => {
            const attached = attachedIds.has(m.resumeId);
            return (
              <Stack key={m.resumeId} direction="row" spacing={2} alignItems="flex-start">
                <Label variant="soft" color={scoreColor(m.score)} sx={{ minWidth: 44, mt: 0.25 }}>
                  {m.score}
                </Label>
                <ResumeLine
                  resume={m}
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {(m.reasons || []).map((r) => (
                        <Typography
                          key={r}
                          variant="caption"
                          display="block"
                          sx={{ color: 'success.dark' }}
                        >
                          + {r}
                        </Typography>
                      ))}
                      {(m.gaps || []).map((g) => (
                        <Typography
                          key={g}
                          variant="caption"
                          display="block"
                          sx={{ color: 'warning.dark' }}
                        >
                          − {g}
                        </Typography>
                      ))}
                    </Box>
                  }
                />
                <LoadingButton
                  size="small"
                  variant={attached ? 'text' : 'outlined'}
                  disabled={attached}
                  loading={busyId === `attach-${m.resumeId}`}
                  onClick={() =>
                    run(
                      `attach-${m.resumeId}`,
                      () => attachCandidate(requirement.id, m.resumeId, m),
                      'Attached.'
                    )
                  }
                  sx={{ flexShrink: 0 }}
                >
                  {attached ? 'Attached' : 'Attach'}
                </LoadingButton>
              </Stack>
            );
          })}
        </Stack>
      </Card>

      {/* ── Attached candidates ── */}
      <Card sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">
            Candidates{candidates.length ? ` (${candidates.length})` : ''}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="eva:search-fill" />}
              onClick={() => setLibraryOpen(true)}
            >
              Add from library
            </Button>
            <input
              ref={inputRef}
              hidden
              multiple
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <LoadingButton
              size="small"
              variant="contained"
              loading={!!uploading}
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={() => inputRef.current?.click()}
            >
              Upload resume
            </LoadingButton>
          </Stack>
        </Stack>

        {uploading ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Formatting {uploading.name} ({uploading.n} of {uploading.total})…
            </Typography>
            <LinearProgress sx={{ mt: 0.5 }} />
          </Box>
        ) : null}

        {loading ? <LinearProgress /> : null}
        {!loading && candidates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No candidates yet. Attach matches above, add from the library, or upload resumes for
            this role.
          </Typography>
        ) : null}

        <List disablePadding>
          {candidates.map((c) => (
            <ListItem key={c.id} disableGutters divider sx={{ gap: 1.5, alignItems: 'flex-start' }}>
              {c.matchScore != null ? (
                <Label
                  variant="soft"
                  color={scoreColor(c.matchScore)}
                  sx={{ minWidth: 44, mt: 0.25 }}
                >
                  {c.matchScore}
                </Label>
              ) : (
                <Box sx={{ minWidth: 44 }} />
              )}
              {c.resume ? (
                <ResumeLine resume={c.resume} />
              ) : (
                <Typography variant="body2">Removed resume</Typography>
              )}
              <TextField
                select
                size="small"
                value={c.stage}
                disabled={busyId === `stage-${c.resumeId}`}
                onChange={(e) =>
                  run(`stage-${c.resumeId}`, () =>
                    updateCandidate(requirement.id, c.resumeId, { stage: e.target.value })
                  )
                }
                sx={{ minWidth: 170, flexShrink: 0 }}
              >
                {Object.entries(CANDIDATE_STAGE).map(([k, st]) => (
                  <MenuItem key={k} value={k}>
                    {st.label}
                  </MenuItem>
                ))}
              </TextField>
              <Tooltip title="Remove from this requirement (the resume stays in the library)">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    run(
                      `detach-${c.resumeId}`,
                      () => detachCandidate(requirement.id, c.resumeId),
                      'Removed.'
                    )
                  }
                >
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>

        {candidates.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            {Object.entries(CANDIDATE_STAGE).map(([k, st]) => {
              const n = candidates.filter((c) => c.stage === k).length;
              return n ? (
                <Chip
                  key={k}
                  size="small"
                  variant="soft"
                  color={st.color === 'default' ? 'info' : st.color}
                  label={`${st.label}: ${n}`}
                />
              ) : null;
            })}
          </Stack>
        ) : null}
      </Card>

      <AddFromLibraryDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        attachedIds={attachedIds}
        onAttach={(r) =>
          run(
            `attach-${r.id}`,
            () => attachCandidate(requirement.id, r.id),
            `${r.displayName} attached.`
          )
        }
      />
    </Stack>
  );
}
