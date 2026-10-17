'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
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

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { apiMessage, decodeDocumentId } from 'src/actions/documents';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

function Row({ label, value, hint }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box>
        <Typography variant="body2">{value}</Typography>
        {hint ? (
          <Typography variant="caption" color="text.disabled">
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

/**
 * Read an IOTA document ID (e.g. 9XDE-9BFB-3K7L, printed on every offer letter)
 * back as text: who issued it, what it is, for which client and candidate, and when.
 */
export function DocumentIdLookup({ open, onClose, initialId = '' }) {
  const [id, setId] = useState(initialId);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookUp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await decodeDocumentId(id));
    } catch (err) {
      setError(apiMessage(err, 'That ID could not be read.'));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Look up a document ID</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" direction="row" spacing={1.5} onSubmit={lookUp} sx={{ mb: 2 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Document ID"
            placeholder="9XDE-9BFB-3K7L"
            value={id}
            onChange={(e) => setId(e.target.value)}
            slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: 'monospace' } } }}
          />
          <LoadingButton type="submit" variant="contained" loading={loading} disabled={!id.trim()}>
            Read
          </LoadingButton>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {result ? (
          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', mb: 1 }}>
              {result.display}
            </Typography>
            <Row label="Document" value={`${result.docType.name} (${result.docType.code})`} />
            <Row label="Issued by" value={`${result.company.name} (${result.company.code})`} />
            <Row label="Country" value={`${result.country.name} (${result.country.code})`} />
            <Row label="Client" value={`${result.client.name} (${result.client.code})`} />
            <Row
              label="Candidate"
              value={result.candidate.name}
              hint={`Candidate number ${result.candidate.id}`}
            />
            <Row label="Issued" value={result.issuedAtKsa} hint={result.issuedAt} />
            {result.offer ? (
              <Row
                label="Offer"
                value={
                  <Stack direction="row" spacing={1} alignItems="center" component="span">
                    <Button
                      size="small"
                      component={RouterLink}
                      href={paths.dashboard.hr.offerManagement.details(result.offer.id)}
                      onClick={close}
                      sx={{ px: 0, minWidth: 0 }}
                    >
                      Open the offer
                    </Button>
                    <Label>{result.offer.status}</Label>
                  </Stack>
                }
              />
            ) : (
              <Row label="Offer" value="No offer in the ERP carries this ID." />
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
