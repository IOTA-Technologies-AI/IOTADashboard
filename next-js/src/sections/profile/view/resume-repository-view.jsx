'use client';

import useSWR from 'swr';
import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listCandidates, uploadResume } from 'src/utils/apiHelper';

import { useAuthContext } from 'src/auth/hooks';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const STATUS_COLORS = {
  active: 'primary',
  shortlisted: 'success',
  rejected: 'error',
};

// ----------------------------------------------------------------------

function DropZone({ onFilesDropped, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => ACCEPTED_TYPES.includes(f.type));
      if (files.length) onFilesDropped(files);
    },
    [onFilesDropped]
  );

  return (
    <Box
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      sx={{
        border: '2px dashed',
        borderColor: dragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 5,
        textAlign: 'center',
        cursor: uploading ? 'default' : 'pointer',
        bgcolor: dragging ? 'action.hover' : 'background.neutral',
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []).filter((f) =>
            ACCEPTED_TYPES.includes(f.type)
          );
          if (files.length) onFilesDropped(files);
          e.target.value = '';
        }}
      />
      {uploading ? (
        <CircularProgress size={32} />
      ) : (
        <>
          <Iconify icon="eva:cloud-upload-fill" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1">Drag & drop resumes here</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            PDF, DOC, DOCX — multiple files supported
          </Typography>
          <Button variant="outlined" size="small" sx={{ mt: 2 }}>
            Browse Files
          </Button>
        </>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function CandidateCard({ candidate, onClick }) {
  const initials = (candidate.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      onClick={onClick}
      sx={{
        height: 200,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.25s',
        '&:hover': { boxShadow: 8 },
        '&:hover .card-base': { opacity: 0 },
        '&:hover .card-overlay': { opacity: 1 },
      }}
    >
      {/* ── Base view: centered avatar + name + status ── */}
      <Box
        className="card-base"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          p: 2,
          transition: 'opacity 0.25s',
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 20 }}>
          {initials}
        </Avatar>
        <Typography variant="subtitle2" align="center" noWrap sx={{ width: '100%', px: 1 }}>
          {candidate.name || 'Unknown'}
        </Typography>
        <Chip
          size="small"
          label={candidate.status || 'active'}
          color={STATUS_COLORS[candidate.status] || 'default'}
          sx={{ textTransform: 'capitalize' }}
        />
      </Box>

      {/* ── Hover overlay: email + skills + experience ── */}
      <Box
        className="card-overlay"
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 2,
          opacity: 0,
          transition: 'opacity 0.25s',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Name + email */}
        <Box>
          <Typography variant="subtitle2" noWrap>
            {candidate.name || 'Unknown'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
            {candidate.email}
          </Typography>
        </Box>

        {/* Skills */}
        <Box
          sx={{
            flexGrow: 1,
            mt: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            overflow: 'hidden',
            alignContent: 'flex-start',
            maxHeight: 72,
          }}
        >
          {(candidate.skills || []).slice(0, 5).map((s) => (
            <Chip
              key={s}
              size="small"
              label={s}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontSize: 11 }}
            />
          ))}
          {(candidate.skills || []).length > 5 && (
            <Chip
              size="small"
              label={`+${candidate.skills.length - 5} more`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'inherit', fontSize: 11 }}
            />
          )}
        </Box>

        {/* Experience + file icon */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {candidate.experienceYears ?? '—'} yrs experience
          </Typography>
          <Iconify icon="eva:file-text-fill" width={18} sx={{ opacity: 0.85 }} />
        </Stack>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

// Returns a unique filename by appending (1), (2), … when a name collision exists.
function generateUniqueFileName(fileName, existingNames) {
  if (!existingNames.has(fileName)) return fileName;
  const dot = fileName.lastIndexOf('.');
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot >= 0 ? fileName.slice(dot) : '';
  let counter = 1;
  let candidate;
  do {
    candidate = `${base} (${counter})${ext}`;
    counter += 1;
  } while (existingNames.has(candidate));
  return candidate;
}

export function ResumeRepositoryView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { data, isLoading, mutate } = useSWR('profile/candidates', listCandidates);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [pendingConflict, setPendingConflict] = useState(null); // { fileName }
  const conflictResolveFnRef = useRef(null);

  const candidates = data?.data || [];

  // Returns a promise that resolves with 'overwrite' | 'keep-both' once the user decides.
  const askConflictResolution = useCallback(
    (fileName) =>
      new Promise((resolve) => {
        conflictResolveFnRef.current = resolve;
        setPendingConflict({ fileName });
      }),
    []
  );

  const handleConflictDecision = useCallback((decision) => {
    setPendingConflict(null);
    conflictResolveFnRef.current?.(decision);
    conflictResolveFnRef.current = null;
  }, []);

  const handleFilesDropped = async (files) => {
    setUploading(true);
    const existingNames = new Set(candidates.map((c) => c.fileName).filter(Boolean));
    const progress = files.map((f) => ({ name: f.name, done: false, error: null }));
    setUploadProgress(progress);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let targetFileName = file.name;

      if (existingNames.has(file.name)) {
        const decision = await askConflictResolution(file.name);
        if (decision === 'keep-both') {
          targetFileName = generateUniqueFileName(file.name, existingNames);
          // Update progress label to show the renamed file
          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, name: targetFileName } : p))
          );
        }
        // 'overwrite' → keep targetFileName as-is (same name overwrites in OneDrive)
      }

      // Track the name being written so subsequent files in the same batch
      // also see it as taken (avoids double-rename collisions).
      existingNames.add(targetFileName);

      try {
        await uploadResume(file, user?.email || '', targetFileName);
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, done: true } : p)));
      } catch (err) {
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, done: true, error: err?.response?.data?.message || 'Upload failed' }
              : p
          )
        );
      }
    }

    setUploading(false);
    mutate();
    setTimeout(() => setUploadProgress([]), 4000);
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Resume Repository</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in system
        </Typography>
      </Stack>

      {/* Upload area */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Upload Resumes
        </Typography>
        <DropZone onFilesDropped={handleFilesDropped} uploading={uploading} />

        {/* Upload progress */}
        {uploadProgress.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {uploadProgress.map((p) => (
              <Stack key={p.name} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify
                  icon={
                    p.error
                      ? 'eva:close-circle-fill'
                      : p.done
                        ? 'eva:checkmark-circle-fill'
                        : 'eva:loader-outline'
                  }
                  sx={{ color: p.error ? 'error.main' : p.done ? 'success.main' : 'text.disabled' }}
                />
                <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                  {p.name}
                </Typography>
                {!p.done && <LinearProgress sx={{ width: 80 }} />}
                {p.error && (
                  <Typography variant="caption" color="error">
                    {p.error}
                  </Typography>
                )}
              </Stack>
            ))}
          </Box>
        )}
      </Card>

      {/* Candidate cards */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        All Candidates
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : candidates.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No resumes uploaded yet. Drop files above to get started.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {candidates.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.id} sx={{ display: 'flex' }}>
              <CandidateCard
                candidate={c}
                onClick={() => router.push(paths.dashboard.profile.candidates.details(c.id))}
              />
            </Grid>
          ))}
        </Grid>
      )}
      {/* Duplicate-file conflict dialog */}
      <Dialog open={Boolean(pendingConflict)} maxWidth="xs" fullWidth>
        <DialogTitle>File already exists</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{pendingConflict?.fileName}</strong> already exists in the repository. What
            would you like to do?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConflictDecision('keep-both')} variant="outlined">
            Keep Both
          </Button>
          <Button
            onClick={() => handleConflictDecision('overwrite')}
            variant="contained"
            color="error"
          >
            Overwrite
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
