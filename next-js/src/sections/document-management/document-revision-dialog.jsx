'use client';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import {
  extensionOf,
  uploadedFile,
  isAcceptedFile,
  DOCUMENT_ACCEPT,
  sendDocumentVersion,
} from 'src/actions/document-management';

import { Upload } from 'src/components/upload';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/**
 * Upload a revision made outside the dashboard (e.g. the customer's marked-up
 * copy, or a version edited by hand) as the document's next version.
 */
export function DocumentRevisionDialog({ open, onClose, document, onUploaded }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const nextVersion = (document?.currentVersion ?? 0) + 1;

  const reset = () => {
    setFile(null);
    setNote('');
    setError('');
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleDrop = (accepted) => {
    const picked = accepted[0];
    if (!picked) return;
    if (!isAcceptedFile(picked)) {
      setError('Upload a PDF, Word, Excel, PowerPoint or image file.');
      return;
    }
    setError('');
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const sent = await sendDocumentVersion(document.documentId, {
        render: uploadedFile(file, document),
        origin: 'uploaded',
        extension: extensionOf(file.name),
        note: note.trim() || undefined,
      });
      toast.success(`Version ${sent.version} saved to OneDrive as ${sent.fileName}.`);
      reset();
      onUploaded?.(sent.version);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'The upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload new version</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The file is kept in OneDrive as{' '}
            <Typography component="span" variant="subtitle2" color="text.primary">
              {document
                ? `${document.display}_v${nextVersion}.${file ? extensionOf(file.name) : 'pdf'}`
                : ''}
            </Typography>
            . Earlier versions stay as they are.
          </Typography>

          <Upload
            value={file}
            onDrop={handleDrop}
            onDelete={() => setFile(null)}
            accept={DOCUMENT_ACCEPT}
            disabled={busy}
          />

          <TextField
            label="What changed"
            placeholder="e.g. Customer asked for a 24-month term"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            disabled={busy}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton variant="contained" onClick={handleUpload} loading={busy} disabled={!file}>
          Save as v{nextVersion}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
