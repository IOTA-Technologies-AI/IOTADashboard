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
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
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
      sx={{
        p: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
      onClick={onClick}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontSize: 16 }}>
          {initials}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" noWrap>
              {candidate.name || 'Unknown'}
            </Typography>
            <Chip
              size="small"
              label={candidate.status}
              color={STATUS_COLORS[candidate.status] || 'default'}
              sx={{ textTransform: 'capitalize' }}
            />
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {candidate.email}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(candidate.skills || []).slice(0, 4).map((s) => (
              <Chip key={s} size="small" label={s} variant="outlined" />
            ))}
            {(candidate.skills || []).length > 4 && (
              <Chip size="small" label={`+${candidate.skills.length - 4}`} variant="outlined" />
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {candidate.experienceYears} yrs
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Iconify icon="eva:file-text-fill" sx={{ color: 'text.disabled' }} />
          </Box>
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function ResumeRepositoryView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { data, isLoading, mutate } = useSWR('profile/candidates', listCandidates);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const candidates = data?.data || [];

  const handleFilesDropped = async (files) => {
    setUploading(true);
    const progress = files.map((f) => ({ name: f.name, done: false, error: null }));
    setUploadProgress(progress);

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadResume(files[i], user?.email || '');
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
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <CandidateCard
                candidate={c}
                onClick={() => router.push(paths.dashboard.profile.candidates.details(c.id))}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </DashboardContent>
  );
}
