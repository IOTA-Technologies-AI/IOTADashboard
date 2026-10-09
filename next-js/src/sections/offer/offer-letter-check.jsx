'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import { uploadOfferLetter, verifyOfferDocument } from 'src/actions/offer-documents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS = {
  match: { label: 'Matches', color: 'success' },
  mismatch: { label: 'Differs', color: 'error' },
  missing: { label: 'Not stated', color: 'warning' },
};

const EDITABLE = ['draft', 'pending_approval', 'approved', 'rejected'];

/**
 * An uploaded offer letter: replace it, and check it against the offer's own
 * data — every field the letter should state, side by side with what it says.
 */
export function OfferLetterCheck({ offer, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);

  const verification = offer.documentVerification;
  const items = verification?.items || [];
  const problems = items.filter((i) => i.status !== 'match');
  const canReplace = EDITABLE.includes(offer.status);

  const runCheck = async () => {
    setChecking(true);
    try {
      const v = await verifyOfferDocument(offer.id);
      await onChange?.();
      const n = v.items.filter((i) => i.status !== 'match').length;
      toast[n ? 'warning' : 'success'](
        n
          ? `${n} discrepanc${n === 1 ? 'y' : 'ies'} found — see the highlighted rows.`
          : 'The letter matches the offer details.'
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'The check failed.');
    } finally {
      setChecking(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      toast.error('Upload the offer letter as a PDF.');
      return;
    }
    setUploading(true);
    try {
      await uploadOfferLetter(offer.id, file);
      toast.success('Letter uploaded. Checking it against the offer details…');
      await onChange?.();
      setUploading(false);
      await runCheck();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'The upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6">Uploaded offer letter</Typography>
          <Typography variant="caption" color="text.secondary">
            {offer.sourceDocumentName || 'No letter uploaded yet'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {canReplace ? (
            <LoadingButton
              variant="outlined"
              loading={uploading}
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={() => inputRef.current?.click()}
            >
              {offer.sourceDocumentFileId ? 'Replace letter' : 'Upload letter'}
            </LoadingButton>
          ) : null}
          {offer.sourceDocumentFileId ? (
            <LoadingButton
              variant={verification ? 'outlined' : 'contained'}
              loading={checking}
              startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
              onClick={runCheck}
            >
              {verification ? 'Check again' : 'Check against offer details'}
            </LoadingButton>
          ) : null}
        </Stack>
      </Stack>

      {checking ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Reading the letter and comparing it with the offer details…
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      ) : null}

      {!offer.sourceDocumentFileId ? (
        <Alert severity="info">
          Upload the offer letter (PDF) to check it and place signatures.
        </Alert>
      ) : !verification ? (
        <Alert severity="warning">
          Not checked yet. The letter must be checked against the offer details before it can be
          sent for signing.
        </Alert>
      ) : (
        <>
          <Alert severity={problems.length ? 'error' : 'success'} sx={{ mb: 2 }}>
            {problems.length
              ? `${problems.length} detail${problems.length === 1 ? '' : 's'} in the letter differ from the offer or are missing. Correct the letter (or the offer) before sending it.`
              : 'Every detail in the letter matches the offer.'}{' '}
            Checked {fDateTime(offer.documentVerifiedAt)}.
          </Alert>
          {verification.summary ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {verification.summary}
            </Typography>
          ) : null}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Detail</TableCell>
                <TableCell>Offer says</TableCell>
                <TableCell>Letter says</TableCell>
                <TableCell>Result</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((i) => (
                <TableRow
                  key={i.field}
                  sx={
                    i.status === 'mismatch'
                      ? { bgcolor: 'error.lighter' }
                      : i.status === 'missing'
                        ? { bgcolor: 'warning.lighter' }
                        : undefined
                  }
                >
                  <TableCell>{i.label}</TableCell>
                  <TableCell>{i.expected || '—'}</TableCell>
                  <TableCell>
                    {i.found || '—'}
                    {i.note ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {i.note}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={STATUS[i.status]?.color}>
                      {STATUS[i.status]?.label}
                    </Label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {verification.concerns?.length ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Worth a second look:</strong>
              {verification.concerns.map((c) => (
                <div key={c}>• {c}</div>
              ))}
            </Alert>
          ) : null}
        </>
      )}
    </Card>
  );
}
