'use client';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { m, AnimatePresence } from 'framer-motion';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  saveBlob,
  base64ToBlob,
  useManagedDocuments,
  getDocumentVersionFile,
} from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { varFade, varContainer, AnimateCountUp } from 'src/components/animate';

import { statusOf, STATUS_ORDER } from '../document-labels';

// ----------------------------------------------------------------------

const FILTERS = [
  { value: 'all', label: 'All documents', icon: 'solar:notes-bold-duotone', tone: 'primary' },
  ...STATUS_ORDER.map((value) => ({ value, ...statusOf(value) })),
];

/** 9XDE-9BFB-3K7L, copyable — the ID is what people quote to each other. */
export function DocumentIdChip({ display, size = 'small' }) {
  const handleCopy = (event) => {
    event.stopPropagation();
    navigator.clipboard?.writeText(display);
    toast.success(`Copied ${display}`);
  };
  return (
    <Box
      sx={{
        gap: 0.5,
        pl: 1,
        pr: 0.25,
        borderRadius: 1,
        display: 'inline-flex',
        alignItems: 'center',
        bgcolor: 'background.neutral',
        fontFamily: 'monospace',
        fontWeight: 600,
        fontSize: size === 'large' ? 18 : 13,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {display}
      <Tooltip title="Copy document ID">
        <IconButton size="small" onClick={handleCopy}>
          <Iconify icon="solar:copy-bold" width={size === 'large' ? 18 : 14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function StatusCard({ filter, count, active, onClick }) {
  return (
    <m.div
      variants={varFade('inUp', { distance: 24 }).inUp}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        onClick={onClick}
        sx={(theme) => ({
          p: 2,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: theme.transitions.create(['box-shadow', 'background-color']),
          bgcolor: active
            ? varAlpha(theme.vars.palette[filter.tone].mainChannel, 0.08)
            : 'background.paper',
          '&:hover': { boxShadow: theme.vars.customShadows.z8 },
        })}
      >
        {active && (
          <Box
            component={m.div}
            layoutId="document-status-active"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            sx={{
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              position: 'absolute',
              bgcolor: `${filter.tone}.main`,
            }}
          />
        )}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <AnimateCountUp to={count} duration={0.8} component="div" sx={{ typography: 'h4' }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {filter.label}
            </Typography>
          </Box>
          <Box
            sx={(theme) => ({
              width: 44,
              height: 44,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${filter.tone}.main`,
              bgcolor: varAlpha(theme.vars.palette[filter.tone].mainChannel, 0.12),
            })}
          >
            <Iconify icon={filter.icon} width={24} />
          </Box>
        </Stack>
      </Card>
    </m.div>
  );
}

// ----------------------------------------------------------------------

export function DocumentListView() {
  const router = useRouter();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [menu, setMenu] = useState(null);
  const [downloading, setDownloading] = useState('');

  const debouncedSearch = useDebounce(search.trim(), 300);

  const { documents, total, counts, error, loading, validating } = useManagedDocuments({
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    limit: rowsPerPage,
    offset: page * rowsPerPage,
  });

  const openDocument = (doc) =>
    router.push(paths.dashboard.general.documentManagement.details(doc.documentId));

  const handleDownloadLatest = async (doc) => {
    setMenu(null);
    if (!doc.currentVersion) return;
    setDownloading(doc.documentId);
    try {
      const file = await getDocumentVersionFile(doc.documentId, doc.currentVersion);
      saveBlob(base64ToBlob(file.base64), file.fileName);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'The download failed.');
    } finally {
      setDownloading('');
    }
  };

  const handleFilter = (value) => {
    setStatus(value);
    setPage(0);
  };

  const renderRows = () =>
    documents.map((doc, index) => {
      const st = statusOf(doc.status);
      return (
        <TableRow
          key={doc.documentId}
          hover
          component={m.tr}
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, delay: Math.min(index, 12) * 0.035 }}
          onClick={() => openDocument(doc)}
          sx={{ cursor: 'pointer' }}
        >
          <TableCell sx={{ maxWidth: 360 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  display: 'flex',
                  borderRadius: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'error.main',
                  bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
                })}
              >
                <Iconify icon="solar:file-text-bold" width={20} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {doc.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {doc.docTypeName}
                  {doc.subjectName ? ` · ${doc.subjectName}` : ''}
                </Typography>
              </Box>
            </Stack>
          </TableCell>
          <TableCell>
            <DocumentIdChip display={doc.display} />
          </TableCell>
          <TableCell sx={{ maxWidth: 200 }}>
            <Typography variant="body2" noWrap>
              {doc.clientName || '—'}
            </Typography>
          </TableCell>
          <TableCell align="center">
            {doc.currentVersion ? (
              <Label variant="soft" color="primary">
                v{doc.currentVersion}
              </Label>
            ) : (
              <Typography variant="caption" color="text.disabled">
                —
              </Typography>
            )}
          </TableCell>
          <TableCell>
            <Label variant="soft" color={st.color} startIcon={<Iconify icon={st.icon} />}>
              {st.label}
            </Label>
          </TableCell>
          <TableCell>
            {doc.lastSentAt ? (
              <Tooltip title={fDateTime(doc.lastSentAt)}>
                <Typography variant="body2">{fToNow(doc.lastSentAt)}</Typography>
              </Tooltip>
            ) : (
              <Typography variant="caption" color="text.disabled">
                Not sent yet
              </Typography>
            )}
          </TableCell>
          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
            <IconButton
              onClick={(e) => setMenu({ anchor: e.currentTarget, doc })}
              disabled={downloading === doc.documentId}
            >
              {downloading === doc.documentId ? (
                <CircularProgress size={18} />
              ) : (
                <Iconify icon="eva:more-vertical-fill" />
              )}
            </IconButton>
          </TableCell>
        </TableRow>
      );
    });

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Document Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'File', href: paths.dashboard.general.file },
          { name: 'Document Management' },
        ]}
        sx={{ mb: 3 }}
      />

      <Box
        component={m.div}
        initial="initial"
        animate="animate"
        variants={varContainer({ transitionIn: { staggerChildren: 0.06 } })}
        sx={{
          gap: 2,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)',
          },
        }}
      >
        {FILTERS.map((filter) => (
          <StatusCard
            key={filter.value}
            filter={filter}
            count={counts[filter.value] ?? 0}
            active={status === filter.value}
            onClick={() => handleFilter(filter.value)}
          />
        ))}
      </Box>

      <Card
        component={m.div}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            fullWidth
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by document ID, title, client or resource…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <Iconify icon="mingcute:close-line" width={18} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {total} {total === 1 ? 'document' : 'documents'}
          </Typography>
        </Stack>

        <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>

        {error && (
          <Alert severity="error" sx={{ mx: 2.5, my: 2 }}>
            {error.response?.data?.message || error.message || 'Could not load documents.'}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>Document</TableCell>
                <TableCell>Document ID</TableCell>
                <TableCell>Client</TableCell>
                <TableCell align="center">Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last sent</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence initial={false}>{renderRows()}</AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && !documents.length && !error && (
          <EmptyContent
            filled
            sx={{ m: 2.5, py: 8 }}
            title={
              debouncedSearch || status !== 'all' ? 'No matching documents' : 'No documents yet'
            }
            description={
              debouncedSearch || status !== 'all'
                ? 'Try another document ID, title or client, or clear the filter.'
                : 'A proposal is given its document ID when it is prepared, and appears here.'
            }
          />
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
        />
      </Card>

      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            const { doc } = menu;
            setMenu(null);
            openDocument(doc);
          }}
        >
          <ListItemIcon>
            <Iconify icon="solar:eye-bold" />
          </ListItemIcon>
          View versions
        </MenuItem>
        <MenuItem
          disabled={!menu?.doc.currentVersion}
          onClick={() => handleDownloadLatest(menu.doc)}
        >
          <ListItemIcon>
            <Iconify icon="solar:download-bold" />
          </ListItemIcon>
          Download latest{menu?.doc.currentVersion ? ` (v${menu.doc.currentVersion})` : ''}
        </MenuItem>
        {menu?.doc.sourceType === 'resource_calculation' && (
          <MenuItem
            onClick={() => {
              const { doc } = menu;
              setMenu(null);
              router.push(paths.dashboard.profile.resourceCalculation.details(doc.sourceId));
            }}
          >
            <ListItemIcon>
              <Iconify icon="custom:invoice-duotone" />
            </ListItemIcon>
            Open proposal
          </MenuItem>
        )}
      </Menu>
    </DashboardContent>
  );
}
