'use client';

import { use, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { getNdaByToken, partnerSignNda } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { NdaHtmlTemplate, NdaSignatureCanvas } from 'src/components/nda';

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartnerNdaSignPage({ params }) {
  const { token } = use(params);

  const [nda, setNda] = useState(null);
  const [signatory, setSignatory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getNdaByToken(token);
        setNda(data.nda);
        setSignatory(data.signatory);
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || 'Invalid or expired signing link.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSign = async () => {
    if (!signatureData) {
      toast.error('Please draw your signature first');
      return;
    }
    try {
      setSigning(true);
      // Best-effort IP capture (works in browser)
      let ipAddress = '';
      try {
        const resp = await fetch('https://api.ipify.org?format=json');
        const json = await resp.json();
        ipAddress = json.ip || '';
      } catch {
        // Silently ignore — IP is supplementary
      }
      await partnerSignNda(token, signatureData, ipAddress);
      setDone(true);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to submit signature. Please try again.';
      toast.error(msg);
    } finally {
      setSigning(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          px: 3,
          bgcolor: 'background.default',
        }}
      >
        <Card sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
          <Iconify icon="solar:close-circle-bold" color="error.main" width={48} sx={{ mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Unable to Sign
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Card>
      </Box>
    );
  }

  if (done) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          px: 3,
          bgcolor: 'background.default',
        }}
      >
        <Card sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
          <Iconify icon="solar:check-circle-bold" color="success.main" width={48} sx={{ mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Thank You!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your signature has been recorded. IOTA Technologies will send you a copy of the executed
            agreement once all parties have signed.
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 5, px: { xs: 2, md: 4 } }}>
      {/* ── Header ── */}
      <Box sx={{ maxWidth: 960, mx: 'auto', mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* IOTA logo placeholder — replace with your actual logo */}
          <Box
            component="img"
            src="/logo/logo-single.svg"
            alt="IOTA Technologies"
            sx={{ height: 36 }}
          />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Non-Disclosure Agreement
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {nda?.ndaNumber} · Secure signing portal
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Stack spacing={3}>
          {/* Greeting */}
          <Alert severity="info" icon={<Iconify icon="solar:pen-bold" />}>
            <Typography variant="body2">
              Hello <strong>{signatory?.name}</strong>, you have been invited to sign a
              Non-Disclosure Agreement on behalf of <strong>{nda?.partnerCompanyName}</strong>.
              Please review the document below and draw your signature to proceed.
            </Typography>
          </Alert>

          {/* NDA document */}
          <Card sx={{ p: 0, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
              }}
            >
              <Typography variant="subtitle2">
                Agreement Document — Please read in full before signing
              </Typography>
            </Box>
            <Box sx={{ p: 3, maxHeight: 700, overflowY: 'auto' }}>
              <NdaHtmlTemplate nda={nda} showSignatures />
            </Box>
          </Card>

          {/* Signature */}
          <Card sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Your Signature
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              By applying your signature below, you confirm that you have read, understood, and
              agree to the terms of this Non-Disclosure Agreement. Your signature, along with a
              timestamp and your IP address, will be permanently recorded in the document audit log.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <NdaSignatureCanvas onSave={setSignatureData} label="Draw your signature here" />
            {signatureData && (
              <Box sx={{ mt: 2 }}>
                <LoadingButton
                  variant="contained"
                  size="large"
                  loading={signing}
                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                  onClick={handleSign}
                >
                  I Agree & Sign
                </LoadingButton>
              </Box>
            )}
          </Card>

          {/* Footer disclaimer */}
          <Typography variant="caption" color="text.secondary" textAlign="center">
            This is a legally binding document. By signing, you agree to the terms contained herein.
            This signature portal is provided by IOTA Technologies. All data is securely stored. If
            you did not expect this email or believe you received it in error, please contact{' '}
            <strong>legal@iotatechnologies.io</strong>.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
