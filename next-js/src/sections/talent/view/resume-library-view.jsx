'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  apiMessage,
  useTalentResumes,
  uploadTalentResume,
  useTalentRequirements,
} from 'src/actions/talent';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_MB = 10;

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function ResumeLibraryView() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [q, setQ] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minYears, setMinYears] = useState('');
  const [requirementId, setRequirementId] = useState('');
  const [uploading, setUploading] = useState(null); // { done, total, current }
  const [failures, setFailures] = useState([]);

  const { resumes, loading, error, mutate } = useTalentResumes({
    q: q || undefined,
    specialization: specialization || undefined,
    minYears: Number(minYears) > 0 ? Number(minYears) : undefined,
  });
  const { requirements } = useTalentRequirements({});
  const openRequirements = requirements.filter((r) => !['filled', 'closed'].includes(r.status));

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setFailures([]);
    const failed = [];
    let lastId = null;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setUploading({ done: i, total: files.length, current: file.name });
      if (file.size > MAX_MB * 1024 * 1024) {
        failed.push({ name: file.name, reason: `larger than ${MAX_MB} MB` });
        continue;
      }
      try {
         
        const resume = await uploadTalentResume({
          fileName: file.name,
          fileBase64: await toBase64(file),
          requirementId: requirementId || undefined,
        });
        lastId = resume?.id || lastId;
      } catch (err) {
        failed.push({ name: file.name, reason: apiMessage(err, 'could not be formatted') });
      }
    }
    setUploading(null);
    setFailures(failed);
    if (inputRef.current) inputRef.current.value = '';
    await mutate();

    const ok = files.length - failed.length;
    if (ok && files.length === 1 && lastId) {
      toast.success('Resume formatted. Review it before sharing.');
      router.push(paths.dashboard.talent.resumes.details(lastId));
    } else if (ok) {
      toast.success(`${ok} resume${ok === 1 ? '' : 's'} formatted.`);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Resume Formatting"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Talent', href: paths.dashboard.talent.root },
          { name: 'Resume Formatting' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Format a resume</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload the candidate&apos;s own resume (PDF or Word, up to {MAX_MB} MB, several at
                once). It is rewritten in the IOTA format with the first name only — email, phone,
                address and profile links are removed.
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              label="For requirement (optional)"
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="">None</MenuItem>
              {openRequirements.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.title} — {r.clientName}
                </MenuItem>
              ))}
            </TextField>
            <input
              ref={inputRef}
              hidden
              multiple
              type="file"
              accept={ACCEPT}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <LoadingButton
              variant="contained"
              size="large"
              loading={!!uploading}
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={() => inputRef.current?.click()}
            >
              Upload resumes
            </LoadingButton>
          </Stack>

          {uploading ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Formatting {uploading.current} ({uploading.done + 1} of {uploading.total}) — this
                takes up to a minute per resume…
              </Typography>
              <LinearProgress sx={{ mt: 1 }} />
            </Box>
          ) : null}

          {failures.length ? (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFailures([])}>
              {failures.map((f) => (
                <div key={f.name}>
                  <strong>{f.name}</strong>: {f.reason}
                </div>
              ))}
            </Alert>
          ) : null}
        </Card>

        <Card>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
            <TextField
              fullWidth
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills, roles, employers, certifications… (e.g. S/4HANA FICO Aramco)"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              type="number"
              label="Min years"
              value={minYears}
              onChange={(e) => setMinYears(e.target.value)}
              inputProps={{ min: 0 }}
              sx={{ width: 120 }}
            />
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
              {apiMessage(error, 'Could not load resumes.')}
            </Alert>
          ) : null}

          <TableContainer>
            <Scrollbar>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Specialization</TableCell>
                    <TableCell align="center">Years</TableCell>
                    <TableCell>Top skills</TableCell>
                    <TableCell>Added</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumes.map((r) => (
                    <TableRow
                      key={r.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(paths.dashboard.talent.resumes.details(r.id))}
                    >
                      <TableCell>
                        <Typography variant="subtitle2">{r.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.headline}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.specialization || '—'}</TableCell>
                      <TableCell align="center">{Number(r.experienceYears) || '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {(r.skills || []).slice(0, 5).map((s) => (
                            <Chip key={s} size="small" label={s} variant="soft" color="info" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fDate(r.createdAt)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.createdBy}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          {!loading && !error && resumes.length === 0 ? (
            <EmptyContent
              title={q || specialization || minYears ? 'No matching resumes' : 'No resumes yet'}
              description={
                q || specialization || minYears
                  ? 'Try fewer or different words.'
                  : 'Upload a resume above to format it and add it to the library.'
              }
              sx={{ py: 8 }}
            />
          ) : null}
        </Card>
      </Stack>
    </DashboardContent>
  );
}
