'use client';

import useSWR from 'swr';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getCandidate, updateCandidate } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['active', 'shortlisted', 'rejected'];
const STATUS_COLORS = { active: 'primary', shortlisted: 'success', rejected: 'error' };

// ----------------------------------------------------------------------

export function CandidateDetailView({ id }) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(`profile/candidates/${id}`, () => getCandidate(id));

  const candidate = data?.data;
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (candidate && !initialized) {
    setStatus(candidate.status || 'active');
    setNotes(candidate.notes || '');
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCandidate(id, { status, notes });
      mutate();
    } finally {
      setSaving(false);
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

  if (!candidate) {
    return (
      <DashboardContent>
        <Typography>Candidate not found.</Typography>
      </DashboardContent>
    );
  }

  const initials = (candidate.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DashboardContent>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          onClick={() => router.push(paths.dashboard.profile.candidates.root)}
        >
          Back
        </Button>
        <Typography variant="h4">Candidate Profile</Typography>
      </Stack>

      <Grid container spacing={3}>
        {/* Profile card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: 28,
                bgcolor: 'primary.main',
                mx: 'auto',
                mb: 2,
              }}
            >
              {initials}
            </Avatar>
            <Typography variant="h6">{candidate.name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {candidate.email}
            </Typography>
            {candidate.phone && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {candidate.phone}
              </Typography>
            )}
            {candidate.linkedIn && (
              <Button
                size="small"
                startIcon={<Iconify icon="eva:link-2-fill" />}
                href={candidate.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </Button>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Experience
            </Typography>
            <Typography variant="h5">{candidate.experienceYears} yrs</Typography>

            <Divider sx={{ my: 2 }} />

            {candidate.fileUrl && (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Iconify icon="eva:file-text-fill" />}
                href={candidate.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Resume (OneDrive)
              </Button>
            )}
          </Card>

          {/* Status & Notes */}
          <Card sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Status & Notes
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                    <Chip
                      size="small"
                      label={s}
                      color={STATUS_COLORS[s]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Card>
        </Grid>

        {/* Skills & Detail */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Skills
            </Typography>
            {candidate.skills?.length ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {candidate.skills.map((s) => (
                  <Chip key={s} label={s} color="primary" variant="outlined" />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No skills extracted.
              </Typography>
            )}

            {candidate.certifications?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Certifications
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {candidate.certifications.map((c) => (
                    <Chip key={c} label={c} color="warning" variant="outlined" />
                  ))}
                </Box>
              </>
            )}
          </Card>

          {/* Education */}
          {candidate.education?.length > 0 && (
            <Card sx={{ p: 3, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Education
              </Typography>
              <Stack spacing={1.5}>
                {candidate.education.map((edu, i) => (
                  <Box key={i}>
                    <Typography variant="subtitle2">{edu.degree}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {edu.institution} {edu.year && `· ${edu.year}`}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          )}

          {/* Tags */}
          {candidate.tags?.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {candidate.tags.map((t) => (
                  <Chip key={t} label={t} />
                ))}
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
