'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

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
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listJobDescriptions, matchJDtoCandidates, getMatchResults } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

function ScoreBar({ label, value, color = 'primary' }) {
  if (value == null) return null;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {value}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ height: 6, borderRadius: 4 }}
      />
    </Box>
  );
}

function MatchCard({ result, rank }) {
  const initials = (result.candidateName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const scoreColor =
    result.score == null
      ? 'default'
      : result.score >= 75
        ? 'success'
        : result.score >= 50
          ? 'warning'
          : 'error';

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.lighter',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          #{rank}
        </Box>
        <Avatar sx={{ bgcolor: 'primary.main', flexShrink: 0 }}>{initials}</Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle1">{result.candidateName}</Typography>
            <Chip
              size="small"
              label={result.score != null ? `${result.score}%` : 'N/A'}
              color={scoreColor}
            />
          </Stack>

          {result.matchUnavailable ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {result.matchUnavailableReason || 'Matching unavailable'}
            </Alert>
          ) : (
            <>
              {result.summary && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                  {result.summary}
                </Typography>
              )}
              <Stack spacing={1}>
                <ScoreBar label="Skills Match" value={result.skillsScore} color="primary" />
                <ScoreBar label="Experience" value={result.experienceScore} color="success" />
                <ScoreBar label="Certifications" value={result.certsScore} color="warning" />
              </Stack>
              {result.missingSkills?.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Missing skills:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {result.missingSkills.map((s) => (
                      <Chip key={s} size="small" label={s} color="error" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function MatchingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJdId = searchParams.get('jdId');

  const { data: jdData, isLoading: jdLoading } = useSWR('profile/jd', listJobDescriptions);
  const jds = jdData?.data || [];

  const [selectedJdId, setSelectedJdId] = useState(preselectedJdId || '');
  const [results, setResults] = useState(null);
  const [ranAt, setRanAt] = useState(null);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');

  // Auto-select from URL param once JDs load
  useEffect(() => {
    if (preselectedJdId && jds.length && !selectedJdId) {
      setSelectedJdId(preselectedJdId);
    }
  }, [preselectedJdId, jds, selectedJdId]);

  // Load saved results whenever JD selection changes
  useEffect(() => {
    if (!selectedJdId) {
      setResults(null);
      setRanAt(null);
      return;
    }
    setResults(null);
    setRanAt(null);
    setError('');
    getMatchResults(selectedJdId)
      .then((res) => {
        if (res.results?.length) {
          setResults(res.results);
          setRanAt(res.ranAt);
        }
      })
      .catch(() => {
        // No saved results — leave results null (user can run fresh)
      });
  }, [selectedJdId]);

  const selectedJd = jds.find((j) => j.id === selectedJdId);

  const handleRunMatch = async () => {
    if (!selectedJdId) return;
    setMatching(true);
    setError('');
    try {
      const res = await matchJDtoCandidates(selectedJdId);
      setResults(res.results || []);
      // Fetch ranAt from the freshly persisted row
      getMatchResults(selectedJdId)
        .then((r) => setRanAt(r.ranAt))
        .catch(() => setRanAt(new Date().toISOString()));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Matching failed');
    } finally {
      setMatching(false);
    }
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">AI Candidate Matching</Typography>
      </Stack>

      {/* JD selector */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Select a Job Description
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel>Job Description</InputLabel>
            <Select
              value={selectedJdId}
              label="Job Description"
              onChange={(e) => {
                setSelectedJdId(e.target.value);
                setResults(null);
              }}
            >
              {jds.map((jd) => (
                <MenuItem key={jd.id} value={jd.id}>
                  {jd.title} — {jd.department}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            disabled={!selectedJdId || matching}
            onClick={handleRunMatch}
            startIcon={
              matching ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="eva:flash-fill" />
              )
            }
          >
            {matching ? 'Matching…' : results ? 'Re-run AI Match' : 'Run AI Match'}
          </Button>
        </Stack>

        {/* Last-run timestamp */}
        {ranAt && !matching && (
          <Alert severity="info" icon={<Iconify icon="eva:clock-outline" />} sx={{ mt: 2 }}>
            Showing saved results from{' '}
            <strong>
              {new Date(ranAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </strong>
            . Click <em>Re-run AI Match</em> to get fresh results.
          </Alert>
        )}

        {/* Selected JD summary */}
        {selectedJd && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.neutral',
              borderRadius: 1,
            }}
          >
            <Stack direction="row" flexWrap="wrap" gap={2}>
              <Typography variant="body2">
                <strong>Location:</strong> {selectedJd.location}
              </Typography>
              <Typography variant="body2">
                <strong>Experience:</strong> {selectedJd.experienceYears}+ yrs
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {selectedJd.employmentType}
              </Typography>
            </Stack>
            {selectedJd.mandatorySkills?.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedJd.mandatorySkills.map((s) => (
                  <Chip key={s} size="small" label={s} color="primary" variant="outlined" />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No saved results yet */}
      {selectedJdId && results === null && !matching && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Iconify icon="eva:flash-outline" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            No matching results yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click <strong>Run AI Match</strong> above to score and rank all candidates against this
            job description. Results are saved so you don&apos;t need to re-run every time.
          </Typography>
        </Card>
      )}

      {/* Results */}
      {results !== null && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {results.length} Candidate{results.length !== 1 ? 's' : ''} Ranked
          </Typography>
          {results.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No candidates found. Upload resumes first.
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2}>
              {results.map((r, idx) => (
                <MatchCard key={r.candidateId} result={r} rank={idx + 1} />
              ))}
            </Stack>
          )}
        </>
      )}
    </DashboardContent>
  );
}
