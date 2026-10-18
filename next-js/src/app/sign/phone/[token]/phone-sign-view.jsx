'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { getHandoffCapture, submitHandoffCapture } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { NdaSignatureCanvas } from 'src/components/nda';

// ----------------------------------------------------------------------

/**
 * The phone side of "Sign on my phone". Draw, then send the image back to the
 * computer that showed the QR code. Nothing is signed here: the signer checks
 * the signature on the computer and submits it there.
 */
export function PhoneSignView({ token }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getHandoffCapture(token)
      .then(setInfo)
      .catch((err) =>
        setError(err?.response?.data?.message || 'This code is not valid. Scan it again.')
      );
  }, [token]);

  const handleSend = async () => {
    setSending(true);
    try {
      await submitHandoffCapture(token, signatureData);
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'The signature could not be sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  let body;
  if (sent) {
    body = (
      <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center', py: 4 }}>
        <Iconify icon="solar:check-circle-bold" width={56} sx={{ color: 'success.main' }} />
        <Typography variant="h6">Sent to your computer</Typography>
        <Typography variant="body2" color="text.secondary">
          Go back to your computer, check the signature, and finish signing there. You can close
          this page.
        </Typography>
      </Stack>
    );
  } else if (error) {
    body = (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  } else if (!info) {
    body = (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else {
    body = (
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2">{info.signerName}</Typography>
          <Typography variant="caption" color="text.secondary">
            Signature for {info.documentLabel}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Sign with your finger across the box. Turning your phone sideways gives you more room.
        </Typography>
        <NdaSignatureCanvas width={500} height={220} onSave={(data) => setSignatureData(data)} />
        <LoadingButton
          variant="contained"
          size="large"
          fullWidth
          loading={sending}
          disabled={!signatureData}
          onClick={handleSend}
          startIcon={<Iconify icon="solar:smartphone-2-bold" />}
        >
          Send to computer
        </LoadingButton>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
          This code works once and expires{' '}
          {new Date(info.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
        </Typography>
      </Stack>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3, px: 2 }}>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Sign on your phone
        </Typography>
        {body}
      </Card>
    </Container>
  );
}
