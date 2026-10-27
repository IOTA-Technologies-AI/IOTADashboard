'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import {
  useDocumentStorage,
  connectDocumentStorage,
  copyDocumentsToLibrary,
} from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const message = (err) => err?.response?.data?.message || err?.message || 'Something went wrong.';

/**
 * Where Document Management keeps its files: the SharePoint library new
 * versions are written to, and the copy of files still in the personal
 * OneDrive they were kept in before. Super-admins connect and copy; everyone
 * else sees where the files are.
 */
export function DocumentStoragePanel() {
  const { storage, error, loading, refresh } = useDocumentStorage();
  const [siteUrl, setSiteUrl] = useState('');
  const [library, setLibrary] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [copy, setCopy] = useState(null); // { copied, failed: [], remaining, running }

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{message(error)}</Alert>;
  if (!storage) return null;

  const { library: lib, canManage } = storage;

  const connect = async () => {
    setConnecting(true);
    try {
      const next = await connectDocumentStorage(siteUrl.trim(), library.trim() || null);
      await refresh(next, { revalidate: false });
      toast.success(`New files now go to ${next.library.siteName} › ${next.library.driveName}.`);
      setSiteUrl('');
      setLibrary('');
    } catch (err) {
      toast.error(message(err));
    } finally {
      setConnecting(false);
    }
  };

  const runCopy = async () => {
    const state = { copied: 0, failed: [], remaining: storage.inLegacy, running: true };
    setCopy({ ...state });
    try {
      for (;;) {
        const batch = await copyDocumentsToLibrary(state.failed.map((f) => f.versionId));
        state.copied += batch.copied;
        state.failed.push(...batch.failed);
        state.remaining = batch.remaining;
        setCopy({ ...state });
        if (!batch.remaining || (!batch.copied && !batch.failed.length)) break;
      }
      toast.success(`${state.copied} file${state.copied === 1 ? '' : 's'} copied to SharePoint.`);
    } catch (err) {
      toast.error(message(err));
    } finally {
      setCopy({ ...state, running: false });
      refresh();
    }
  };

  const total = (copy?.copied ?? 0) + (copy?.failed.length ?? 0) + (copy?.remaining ?? 0);

  return (
    <Stack spacing={3}>
      {storage.needsSql && (
        <Alert severity="warning">
          Run <b>sql/20261027_document_storage.sql</b> in Supabase before connecting a library.
        </Alert>
      )}

      <Card sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Iconify icon="solar:folder-cloud-bold-duotone" width={28} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Where files are kept
          </Typography>
          {lib ? (
            <Label variant="soft" color="success">
              SharePoint
            </Label>
          ) : (
            <Label variant="soft" color="warning">
              Personal OneDrive
            </Label>
          )}
        </Stack>

        {lib ? (
          <Stack spacing={0.75}>
            <Typography variant="body2">
              New versions are saved in{' '}
              <Link href={lib.driveWebUrl || lib.siteUrl} target="_blank" rel="noopener">
                {lib.siteName} › {lib.driveName}
              </Link>
              , in <b>Document Management / practice / type / client / document ID</b>.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connected by {lib.connectedBy}, {fDateTime(lib.connectedAt)}. Who can open the files
              in SharePoint is set on the site; in the dashboard, everyone with Document Management
              access can.
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Files are saved in the personal OneDrive of <b>{storage.legacyAccount}</b>, so only that
            account can open them in OneDrive. Connect a SharePoint library to keep them on a shared
            site.
          </Typography>
        )}

        {canManage && (
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Typography variant="subtitle2">
              {lib ? 'Change the library' : 'Connect a SharePoint library'}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="SharePoint site address"
                placeholder="https://iotatechnologies.sharepoint.com/sites/DocumentManagement"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                disabled={connecting || storage.needsSql}
              />
              <TextField
                size="small"
                label="Library (optional)"
                placeholder="Documents"
                value={library}
                onChange={(e) => setLibrary(e.target.value)}
                disabled={connecting || storage.needsSql}
                sx={{ minWidth: 200 }}
              />
              <LoadingButton
                variant="contained"
                loading={connecting}
                disabled={!siteUrl.trim() || storage.needsSql}
                onClick={connect}
              >
                Connect
              </LoadingButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              The API checks it can write there before switching. Files already saved stay where
              they are until they are copied below.
            </Typography>
          </Stack>
        )}
      </Card>

      {lib && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Files in the personal OneDrive
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {storage.inLegacy
              ? `${storage.inLegacy} version${storage.inLegacy === 1 ? ' is' : 's are'} still in ${storage.legacyAccount}'s OneDrive; ${storage.inLibrary} ${storage.inLibrary === 1 ? 'is' : 'are'} in SharePoint.`
              : `All ${storage.inLibrary} versions are in SharePoint.`}{' '}
            Copying puts each file in the same folder in SharePoint and points the document at the
            copy. The originals are left in place; delete them yourself once you have checked.
          </Typography>

          {copy && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={total ? ((copy.copied + copy.failed.length) / total) * 100 : 100}
              />
              <Typography variant="caption">
                {copy.copied} copied
                {copy.failed.length ? `, ${copy.failed.length} failed` : ''}
                {copy.remaining ? `, ${copy.remaining} to go` : ''}
              </Typography>
              {copy.failed.slice(0, 10).map((f) => (
                <Typography key={f.versionId} variant="caption" color="error.main">
                  {f.documentId} v{f.version}: {f.error}
                </Typography>
              ))}
            </Stack>
          )}

          {canManage && storage.inLegacy > 0 && (
            <LoadingButton
              variant="outlined"
              sx={{ mt: 2 }}
              loading={copy?.running}
              onClick={runCopy}
              startIcon={<Iconify icon="solar:copy-bold" />}
            >
              Copy {storage.inLegacy} to SharePoint
            </LoadingButton>
          )}
        </Card>
      )}
    </Stack>
  );
}
