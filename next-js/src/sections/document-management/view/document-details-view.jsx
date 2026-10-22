'use client';

import { varAlpha } from 'minimal-shared/utils';
import { m, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fData } from 'src/utils/format-number';
import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  mimeOf,
  saveBlob,
  extensionOf,
  base64ToBlob,
  useManagedDocument,
  updateManagedDocument,
  getDocumentVersionFile,
} from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { DocumentIdChip } from './document-list-view';
import { DocumentRevisionDialog } from '../document-revision-dialog';
import {
  statusOf,
  SOURCE_LABEL,
  CLASSIFICATION,
  classificationOf,
  CLASSIFICATION_ORDER,
} from '../document-labels';

// ----------------------------------------------------------------------

/** The statuses a person may set — the same rule as the API. */
const settableStatuses = (currentVersion) =>
  currentVersion === 0 ? ['issued', 'archived'] : ['sent', 'accepted', 'rejected', 'archived'];

const STATUS_ACTION = {
  issued: 'Restore',
  sent: 'Mark as sent',
  accepted: 'Customer accepted',
  rejected: 'Customer rejected',
  archived: 'Archive',
};

function auditText(entry) {
  if (entry.action.startsWith('classified_')) {
    return `Classified ${classificationOf(entry.action.slice(11)).label.toLowerCase()}`;
  }
  if (entry.action === 'id_issued') return 'Document ID issued';
  if (entry.action === 'version_sent') return `Version ${entry.version} sent`;
  if (entry.action === 'revision_uploaded' || entry.action === 'version_uploaded') {
    return `Version ${entry.version} uploaded`;
  }
  if (entry.action.startsWith('status_')) {
    return `Marked ${statusOf(entry.action.slice(7)).label.toLowerCase()}`;
  }
  return entry.action;
}

/** Files the browser can show inline; Office files are downloaded or opened in OneDrive. */
const PREVIEWABLE = ['pdf', 'png', 'jpg', 'jpeg'];
const canPreview = (fileName) => PREVIEWABLE.includes(extensionOf(fileName));

const FILE_KIND = {
  doc: 'Word document',
  docx: 'Word document',
  xls: 'Excel workbook',
  xlsx: 'Excel workbook',
  ppt: 'PowerPoint presentation',
  pptx: 'PowerPoint presentation',
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.43, 0.13, 0.23, 0.96] },
});

// ----------------------------------------------------------------------

function MetaItem({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Iconify icon={icon} width={18} sx={{ color: 'text.disabled', flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.disabled" component="div">
          {label}
        </Typography>
        <Typography variant="body2" noWrap>
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

function VersionItem({ version, isCurrent, selected, fresh, last, onClick }) {
  const uploaded = version.origin === 'uploaded';
  return (
    <Box
      component={m.div}
      variants={{
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.32 } },
      }}
      sx={{ position: 'relative', pl: 4 }}
    >
      {/* Timeline rail and node */}
      {!last && (
        <Box
          sx={{
            top: 28,
            left: 15,
            bottom: -8,
            width: 2,
            position: 'absolute',
            bgcolor: 'divider',
          }}
        />
      )}
      <Box
        component={m.div}
        animate={fresh ? { scale: [1, 1.6, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: fresh ? 2 : 0 }}
        sx={{
          top: 18,
          left: 10,
          width: 12,
          height: 12,
          zIndex: 1,
          borderRadius: '50%',
          position: 'absolute',
          border: (theme) => `2px solid ${theme.vars.palette.background.paper}`,
          bgcolor: isCurrent ? 'primary.main' : uploaded ? 'warning.main' : 'grey.500',
          boxShadow: (theme) =>
            isCurrent
              ? `0 0 0 4px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}`
              : 'none',
        }}
      />

      <ButtonBase
        onClick={onClick}
        sx={{
          p: 1.5,
          mb: 1,
          width: 1,
          borderRadius: 1.5,
          textAlign: 'left',
          display: 'block',
          position: 'relative',
          '&:hover .version-hover': { opacity: 1 },
        }}
      >
        {selected && (
          <Box
            component={m.div}
            layoutId="document-version-selected"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            sx={(theme) => ({
              inset: 0,
              borderRadius: 1.5,
              position: 'absolute',
              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.24)}`,
            })}
          />
        )}
        <Box
          className="version-hover"
          sx={{
            inset: 0,
            opacity: 0,
            borderRadius: 1.5,
            position: 'absolute',
            bgcolor: 'action.hover',
            transition: (theme) => theme.transitions.create('opacity'),
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">Version {version.version}</Typography>
            {isCurrent && (
              <Label variant="soft" color="primary">
                Current
              </Label>
            )}
            {uploaded && (
              <Label variant="soft" color="warning">
                Uploaded
              </Label>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
            {fDateTime(version.createdAt)}
            {version.createdBy ? ` · ${version.createdBy}` : ''}
          </Typography>
          {version.note && (
            <Typography
              variant="body2"
              sx={{ mt: 0.75, color: 'text.secondary', fontStyle: 'italic' }}
            >
              “{version.note}”
            </Typography>
          )}
        </Box>
      </ButtonBase>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DocumentDetailsView({ documentId }) {
  const router = useRouter();
  const { document: doc, versions, auditLog, error, loading } = useManagedDocument(documentId);

  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [preview, setPreview] = useState({ version: null, url: '', error: '' });
  const [statusMenu, setStatusMenu] = useState(null);
  const [classMenu, setClassMenu] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetched PDFs, by version, so switching back and forth costs nothing.
  const files = useRef(new Map());

  useEffect(() => {
    setNotes(doc?.notes ?? '');
  }, [doc?.notes]);

  // Open on the current version. A revision just uploaded selects itself.
  useEffect(() => {
    if (!doc?.currentVersion) return;
    setSelected((prev) => (prev && prev <= doc.currentVersion ? prev : doc.currentVersion));
  }, [doc?.currentVersion]);

  useEffect(
    () => () => {
      files.current.forEach((f) => URL.revokeObjectURL(f.url));
    },
    []
  );

  useEffect(() => {
    if (!selected || !doc) return undefined;
    let cancelled = false;
    const cached = files.current.get(selected);
    if (cached) {
      setPreview({ version: selected, url: cached.url, error: '' });
      return undefined;
    }
    // Only fetch what can be shown; an Office file is opened on demand.
    const fileName = versions.find((v) => v.version === selected)?.fileName;
    if (fileName && !canPreview(fileName)) {
      setPreview({ version: selected, url: '', error: '', unsupported: true });
      return undefined;
    }
    setPreview({ version: selected, url: '', error: '' });
    getDocumentVersionFile(doc.documentId, selected)
      .then((file) => {
        const blob = base64ToBlob(file.base64, mimeOf(file.fileName));
        const entry = { blob, url: URL.createObjectURL(blob), fileName: file.fileName };
        files.current.set(selected, entry);
        if (!cancelled) setPreview({ version: selected, url: entry.url, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview({
            version: selected,
            url: '',
            error: err.response?.data?.message || err.message || 'Could not load this version.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected, doc, versions]);

  if (loading && !doc) {
    return (
      <DashboardContent maxWidth="xl">
        <Skeleton variant="text" width={320} height={48} />
        <Skeleton variant="rounded" height={160} sx={{ my: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={640} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={420} />
          </Grid>
        </Grid>
      </DashboardContent>
    );
  }

  if (error || !doc) {
    return (
      <DashboardContent maxWidth="xl">
        <EmptyContent
          filled
          sx={{ py: 10 }}
          title="Document not found"
          description={
            error?.response?.data?.message || error?.message || 'No document carries that ID.'
          }
          action={
            <Button
              sx={{ mt: 3 }}
              variant="contained"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              onClick={() => router.push(paths.dashboard.general.documentManagement.root)}
            >
              Back to documents
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  const st = statusOf(doc.status);
  const ordered = [...versions].reverse();
  const selectedVersion = versions.find((v) => v.version === selected) ?? null;
  const notesDirty = (notes ?? '') !== (doc.notes ?? '');

  const handleClassification = async (classification) => {
    setClassMenu(null);
    setSavingStatus(true);
    try {
      await updateManagedDocument(doc.documentId, { classification });
      toast.success(`${doc.display}: ${classificationOf(classification).label.toLowerCase()}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Could not change the classification.'
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const handleStatus = async (status) => {
    setStatusMenu(null);
    setSavingStatus(true);
    try {
      await updateManagedDocument(doc.documentId, { status });
      toast.success(`${doc.display}: ${statusOf(status).label.toLowerCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not change the status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateManagedDocument(doc.documentId, { notes });
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not save the notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDownload = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      let entry = files.current.get(selected);
      if (!entry) {
        const file = await getDocumentVersionFile(doc.documentId, selected);
        const blob = base64ToBlob(file.base64, mimeOf(file.fileName));
        entry = { blob, url: URL.createObjectURL(blob), fileName: file.fileName };
        files.current.set(selected, entry);
      }
      saveBlob(entry.blob, entry.fileName);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'The download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const renderHeader = () => (
    <Card
      component={m.div}
      {...fadeUp(0)}
      sx={{ p: 3, mb: 3, overflow: 'hidden', position: 'relative' }}
    >
      <Box
        sx={(theme) => ({
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          position: 'absolute',
          bgcolor: `${st.tone}.main`,
          transition: theme.transitions.create('background-color'),
        })}
      />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent="space-between"
        alignItems={{ md: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {doc.practiceName ? `${doc.practiceName} · ` : ''}
            {doc.docTypeName}
          </Typography>
          <Typography variant="h4" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
            {doc.title}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <DocumentIdChip display={doc.display} size="large" />
            <AnimatePresence mode="wait">
              <m.span
                key={doc.status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Label variant="soft" color={st.color} startIcon={<Iconify icon={st.icon} />}>
                  {st.label}
                </Label>
              </m.span>
            </AnimatePresence>
            {doc.currentVersion > 0 && (
              <Label variant="outlined" color="primary">
                v{doc.currentVersion}
              </Label>
            )}
            <Tooltip title={`${classificationOf(doc.classification).help} Click to change.`}>
              <Box
                component={m.span}
                key={doc.classification}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => setClassMenu(e.currentTarget)}
                sx={{ cursor: 'pointer', display: 'inline-flex' }}
              >
                <Label
                  variant="filled"
                  color={classificationOf(doc.classification).color}
                  startIcon={<Iconify icon={classificationOf(doc.classification).icon} />}
                >
                  {classificationOf(doc.classification).label}
                </Label>
              </Box>
            </Tooltip>
          </Stack>
          {doc.internalNumber && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                Internal number
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>
                {doc.internalNumber}
              </Typography>
              <Tooltip title="Copy internal number">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard?.writeText(doc.internalNumber);
                    toast.success(`Copied ${doc.internalNumber}`);
                  }}
                >
                  <Iconify icon="solar:copy-bold" width={14} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          {doc.sourceType === 'resource_calculation' && doc.sourceId && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="custom:invoice-duotone" />}
              onClick={() =>
                router.push(paths.dashboard.profile.resourceCalculation.details(doc.sourceId))
              }
            >
              Open {SOURCE_LABEL[doc.sourceType].toLowerCase()}
            </Button>
          )}
          <LoadingButton
            variant="outlined"
            color="inherit"
            loading={savingStatus}
            endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
            onClick={(e) => setStatusMenu(e.currentTarget)}
          >
            Status
          </LoadingButton>
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:cloud-upload-fill" />}
            onClick={() => setRevisionOpen(true)}
            disabled={doc.status === 'archived'}
          >
            Upload new version
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />

      <Box
        sx={{
          gap: 2.5,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        }}
      >
        <MetaItem icon="solar:users-group-rounded-bold" label="Client" value={doc.clientName} />
        <MetaItem icon="solar:user-rounded-bold" label="Person" value={doc.subjectName} />
        <MetaItem icon="solar:case-minimalistic-bold" label="IOTA office" value={doc.iotaOffice} />
        <MetaItem icon="solar:calendar-date-bold" label="ID issued" value={fDate(doc.issuedAt)} />
        <MetaItem
          icon="solar:clock-circle-bold"
          label="Last sent"
          value={doc.lastSentAt ? fToNow(doc.lastSentAt) : 'Not sent yet'}
        />
      </Box>
    </Card>
  );

  const renderPreview = () => (
    <Card component={m.div} {...fadeUp(0.1)} sx={{ overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}`,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {selectedVersion ? selectedVersion.fileName : 'No version yet'}
          </Typography>
          {selectedVersion && (
            <Typography variant="caption" color="text.secondary">
              Version {selectedVersion.version}
              {selectedVersion.sizeBytes ? ` · ${fData(selectedVersion.sizeBytes)}` : ''}
              {' · '}
              {fToNow(selectedVersion.createdAt)}
            </Typography>
          )}
        </Box>
        {selectedVersion?.onedriveWebUrl && (
          <Tooltip title="Open in OneDrive">
            <Button
              size="small"
              color="inherit"
              startIcon={<Iconify icon="logos:microsoft-onedrive" />}
              href={selectedVersion.onedriveWebUrl}
              target="_blank"
              rel="noopener"
            >
              OneDrive
            </Button>
          </Tooltip>
        )}
        {selectedVersion && (
          <LoadingButton
            size="small"
            variant="soft"
            loading={downloading}
            startIcon={<Iconify icon="solar:download-bold" />}
            onClick={handleDownload}
          >
            Download
          </LoadingButton>
        )}
      </Stack>

      <Box
        sx={{
          height: { xs: 520, md: 760 },
          position: 'relative',
          bgcolor: 'background.neutral',
        }}
      >
        {!versions.length ? (
          <EmptyContent
            sx={{ height: 1 }}
            title="Not sent yet"
            description={
              doc.sourceType === 'resource_calculation'
                ? 'Downloading the proposal’s customer copy sends it, and it is kept here as version 1.'
                : 'Upload the first version to keep it here.'
            }
            action={
              doc.sourceType === 'resource_calculation' && doc.sourceId ? (
                <Button
                  sx={{ mt: 3 }}
                  variant="contained"
                  onClick={() =>
                    router.push(paths.dashboard.profile.resourceCalculation.details(doc.sourceId))
                  }
                >
                  Open proposal
                </Button>
              ) : null
            }
          />
        ) : (
          <AnimatePresence mode="wait">
            <m.div
              key={`${preview.version}-${preview.url || preview.error || preview.unsupported || 'loading'}`}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {preview.unsupported ? (
                <EmptyContent
                  sx={{ height: 1 }}
                  title={`${FILE_KIND[extensionOf(selectedVersion?.fileName)] || 'This file'} — no preview`}
                  description="Download it, or open it in OneDrive to view and edit it there."
                  action={
                    <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                      {selectedVersion?.onedriveWebUrl && (
                        <Button
                          variant="outlined"
                          color="inherit"
                          startIcon={<Iconify icon="logos:microsoft-onedrive" />}
                          href={selectedVersion.onedriveWebUrl}
                          target="_blank"
                          rel="noopener"
                        >
                          Open in OneDrive
                        </Button>
                      )}
                      <LoadingButton
                        variant="contained"
                        loading={downloading}
                        startIcon={<Iconify icon="solar:download-bold" />}
                        onClick={handleDownload}
                      >
                        Download
                      </LoadingButton>
                    </Stack>
                  }
                />
              ) : preview.url ? (
                <Box
                  component="iframe"
                  title={`${doc.display} version ${preview.version}`}
                  src={preview.url}
                  sx={{ width: 1, height: 1, border: 0 }}
                />
              ) : preview.error ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 1, p: 3 }}>
                  <Alert severity="error">{preview.error}</Alert>
                </Stack>
              ) : (
                <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: 1 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    Fetching version {preview.version} from OneDrive…
                  </Typography>
                </Stack>
              )}
            </m.div>
          </AnimatePresence>
        )}
      </Box>
    </Card>
  );

  const renderVersions = () => (
    <Card component={m.div} {...fadeUp(0.18)}>
      <CardHeader
        title="Version history"
        subheader={
          versions.length
            ? `${versions.length} ${versions.length === 1 ? 'version' : 'versions'} sent`
            : 'Nothing sent yet'
        }
        avatar={
          <Iconify
            icon="solar:sort-by-time-bold-duotone"
            width={28}
            sx={{ color: 'primary.main' }}
          />
        }
      />
      <Scrollbar sx={{ maxHeight: 460 }}>
        <Box
          component={m.div}
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
          sx={{ p: 2, pt: 2.5 }}
        >
          {ordered.map((v, index) => (
            <VersionItem
              key={v.id}
              version={v}
              isCurrent={v.version === doc.currentVersion}
              selected={v.version === selected}
              fresh={v.version === fresh}
              last={index === ordered.length - 1}
              onClick={() => setSelected(v.version)}
            />
          ))}
          {!versions.length && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
              Each version sent to the customer appears here, newest first.
            </Typography>
          )}
        </Box>
      </Scrollbar>
    </Card>
  );

  const renderNotes = () => (
    <Card component={m.div} {...fadeUp(0.24)} sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Notes
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Customer feedback, who it was sent to, next steps…"
      />
      <AnimatePresence>
        {notesDirty && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1.5 }}>
              <Button size="small" color="inherit" onClick={() => setNotes(doc.notes ?? '')}>
                Cancel
              </Button>
              <LoadingButton
                size="small"
                variant="contained"
                loading={savingNotes}
                onClick={handleSaveNotes}
              >
                Save notes
              </LoadingButton>
            </Stack>
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );

  const renderActivity = () => (
    <Card component={m.div} {...fadeUp(0.3)} sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Activity
      </Typography>
      <Stack spacing={1.75}>
        {[...auditLog].reverse().map((entry, index) => (
          <Stack key={`${entry.performedAt}-${index}`} direction="row" spacing={1.5}>
            <Box
              sx={{
                mt: 0.75,
                width: 8,
                height: 8,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: index === 0 ? 'primary.main' : 'text.disabled',
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{auditText(entry)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {entry.performedBy ? `${entry.performedBy} · ` : ''}
                {fToNow(entry.performedAt)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Card>
  );

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={doc.display}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Document Management', href: paths.dashboard.general.documentManagement.root },
          { name: doc.display },
        ]}
        sx={{ mb: 3 }}
      />

      {renderHeader()}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>{renderPreview()}</Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {renderVersions()}
            {renderNotes()}
            {renderActivity()}
          </Stack>
        </Grid>
      </Grid>

      <Menu
        anchorEl={statusMenu}
        open={Boolean(statusMenu)}
        onClose={() => setStatusMenu(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {settableStatuses(doc.currentVersion)
          .filter((s) => s !== doc.status)
          .map((s) => (
            <MenuItem key={s} onClick={() => handleStatus(s)}>
              <ListItemIcon>
                <Iconify icon={statusOf(s).icon} sx={{ color: `${statusOf(s).tone}.main` }} />
              </ListItemIcon>
              {STATUS_ACTION[s]}
            </MenuItem>
          ))}
      </Menu>

      <Menu
        anchorEl={classMenu}
        open={Boolean(classMenu)}
        onClose={() => setClassMenu(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {CLASSIFICATION_ORDER.map((value) => (
          <MenuItem
            key={value}
            selected={value === doc.classification}
            onClick={() => handleClassification(value)}
          >
            <ListItemIcon>
              <Iconify
                icon={CLASSIFICATION[value].icon}
                sx={{ color: `${CLASSIFICATION[value].color}.main` }}
              />
            </ListItemIcon>
            <Stack>
              <Typography variant="body2">{CLASSIFICATION[value].label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {CLASSIFICATION[value].help}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      <DocumentRevisionDialog
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        document={doc}
        onUploaded={(version) => {
          setFresh(version);
          setSelected(version);
          setTimeout(() => setFresh(null), 2400);
        }}
      />
    </DashboardContent>
  );
}
