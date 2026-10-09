'use client';

import { useRef, useMemo, useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

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

const EMPTY_FILTERS = {
  q: '',
  skills: [],
  skillsMode: 'all',
  specialization: '',
  minYears: '',
  maxYears: '',
  certification: '',
  employer: '',
  requirementId: '',
  addedFrom: '',
  addedTo: '',
  includeArchived: false,
  sort: '',
};

/** Filters set besides the search words — shown on the Filters button. */
const countActive = (f) =>
  [
    f.skills.length,
    f.specialization,
    f.minYears !== '',
    f.maxYears !== '',
    f.certification,
    f.employer,
    f.requirementId,
    f.addedFrom,
    f.addedTo,
    f.includeArchived,
  ].filter(Boolean).length;

const SEARCH_HELP = (
  <Box sx={{ p: 0.5 }}>
    <div>
      <strong>sap fico</strong> — both words
    </div>
    <div>
      <strong>&quot;central finance&quot;</strong> — exact phrase
    </div>
    <div>
      <strong>azure OR aws</strong> — either
    </div>
    <div>
      <strong>-junior</strong> — leave out
    </div>
    <div>
      <strong>IOTA-R-00042</strong> — a resume ID
    </div>
    <div style={{ marginTop: 6 }}>
      Searches skills, roles, employers, education and certifications.
    </div>
  </Box>
);

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

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [requirementId, setRequirementId] = useState('');
  const [uploading, setUploading] = useState(null); // { done, total, current }
  const [failures, setFailures] = useState([]);

  const setFilter = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };
  // Typing settles for 400 ms before the search runs.
  const settled = useDebounce(JSON.stringify(filters), 400);
  const params = useMemo(() => {
    const f = JSON.parse(settled);
    const clean = (v) => (typeof v === 'string' ? v.trim() || undefined : v);
    return {
      q: clean(f.q),
      skills: f.skills.length ? f.skills.join(',') : undefined,
      skillsMode: f.skills.length > 1 ? f.skillsMode : undefined,
      specialization: clean(f.specialization),
      minYears: f.minYears !== '' ? Number(f.minYears) : undefined,
      maxYears: f.maxYears !== '' ? Number(f.maxYears) : undefined,
      certification: clean(f.certification),
      employer: clean(f.employer),
      requirementId: f.requirementId || undefined,
      addedFrom: f.addedFrom || undefined,
      addedTo: f.addedTo || undefined,
      includeArchived: f.includeArchived || undefined,
      sort: f.sort || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    };
  }, [settled, page, rowsPerPage]);
  const { resumes, total, loading, error, mutate } = useTalentResumes(params);
  const activeFilters = countActive(filters);
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
          <Box sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                value={filters.q}
                onChange={(e) => setFilter('q')(e.target.value)}
                placeholder='Search resumes — e.g. "SAP FICO" S/4HANA Aramco -junior, or IOTA-R-00042'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={SEARCH_HELP} placement="bottom-end">
                        <Iconify
                          icon="eva:info-outline"
                          sx={{ color: 'text.disabled', cursor: 'help' }}
                        />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Sort"
                value={filters.sort}
                onChange={(e) => setFilter('sort')(e.target.value)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">Best match</MenuItem>
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="experience">Most experienced</MenuItem>
              </TextField>
              <Button
                variant={showFilters || activeFilters ? 'contained' : 'outlined'}
                color="inherit"
                onClick={() => setShowFilters((v) => !v)}
                startIcon={<Iconify icon="ic:round-filter-list" />}
                sx={{ flexShrink: 0 }}
              >
                Filters{activeFilters ? ` (${activeFilters})` : ''}
              </Button>
            </Stack>

            <Collapse in={showFilters}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={filters.skills}
                    onChange={(_, v) => setFilter('skills')(v)}
                    renderInput={(inputParams) => (
                      <TextField
                        {...inputParams}
                        label="Skills"
                        placeholder="Type a skill and press Enter"
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={filters.skillsMode}
                    onChange={(_, v) => v && setFilter('skillsMode')(v)}
                    sx={{ height: 56 }}
                  >
                    <ToggleButton value="all">Has all skills</ToggleButton>
                    <ToggleButton value="any">Has any skill</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Specialization"
                    value={filters.specialization}
                    onChange={(e) => setFilter('specialization')(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Min years"
                    value={filters.minYears}
                    onChange={(e) => setFilter('minYears')(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 1.5 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max years"
                    value={filters.maxYears}
                    onChange={(e) => setFilter('maxYears')(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Certification"
                    placeholder="e.g. AZ-500, PMP"
                    value={filters.certification}
                    onChange={(e) => setFilter('certification')(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Employer"
                    placeholder="Worked at…"
                    value={filters.employer}
                    onChange={(e) => setFilter('employer')(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Attached to requirement"
                    value={filters.requirementId}
                    onChange={(e) => setFilter('requirementId')(e.target.value)}
                  >
                    <MenuItem value="">Any</MenuItem>
                    {requirements.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.title} — {r.clientName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Added from"
                    value={filters.addedFrom}
                    onChange={(e) => setFilter('addedFrom')(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Added to"
                    value={filters.addedTo}
                    onChange={(e) => setFilter('addedTo')(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.includeArchived}
                        onChange={(e) => setFilter('includeArchived')(e.target.checked)}
                      />
                    }
                    label="Include archived"
                  />
                  <Button
                    color="inherit"
                    disabled={!activeFilters && !filters.q}
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setPage(0);
                    }}
                  >
                    Clear all
                  </Button>
                </Grid>
              </Grid>
            </Collapse>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {loading ? 'Searching…' : `${total} resume${total === 1 ? '' : 's'}`}
            </Typography>
          </Box>

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
                    <TableCell>Resume ID</TableCell>
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
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {r.resumeCode}
                        </Typography>
                      </TableCell>
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
                          {(r.skills || []).slice(0, 6).map((s) => (
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

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
          />

          {!loading && !error && resumes.length === 0 ? (
            <EmptyContent
              title={filters.q || activeFilters ? 'No matching resumes' : 'No resumes yet'}
              description={
                filters.q || activeFilters
                  ? 'Try fewer words, "Has any skill", or clear some filters.'
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
