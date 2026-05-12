'use client';

import { use, useState, useEffect, useMemo, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { getNdaByToken, partnerSignNda, requestNdaOtp, verifyNdaOtp } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { NdaHtmlTemplate, NdaSignatureCanvas } from 'src/components/nda';

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartnerNdaSignPage({ params }) {
  const { token } = use(params);

  const [nda, setNda] = useState(null);
  const [signatory, setSignatory] = useState(null);
  const [signerEmail, setSignerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  // ── OTP / identity verification state ─────────────────────────────────────
  // When requireOtp is false on the NDA we skip straight to 'otp-verified'.
  // When requireOtp is true we auto-send the OTP on page load (no manual click needed)
  // so the user lands directly at the code-entry step.
  // 'otp-gate'     : loading — will auto-send if required
  // 'otp-sending'  : auto-send in progress
  // 'otp-sent'     : code dispatched — waiting for user to enter it
  // 'otp-verified' : identity confirmed (or not required) — show full signing flow
  const [verifyStep, setVerifyStep] = useState('otp-gate');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sessionToken, setSessionToken] = useState('');

  // ── Consent checkbox ──────────────────────────────────────────────────────
  const [consentChecked, setConsentChecked] = useState(false);

  // For zone preview canvas
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [zonePreviewPage, setZonePreviewPage] = useState(1);
  const zonePreviewRef = useRef(null);
  const zoneCanvasRef = useRef(null);

  // For external_upload NDAs: create a blob URL to show the uploaded PDF in an iframe
  const uploadedDocBlobUrl = useMemo(() => {
    if (
      nda?.documentSource === 'external_upload' &&
      nda?.uploadedDocumentBase64 &&
      nda?.uploadedDocumentName?.toLowerCase().endsWith('.pdf')
    ) {
      const bytes = Uint8Array.from(atob(nda.uploadedDocumentBase64), (c) => c.charCodeAt(0));
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    }
    return null;
  }, [nda?.documentSource, nda?.uploadedDocumentBase64, nda?.uploadedDocumentName]);

  // Revoke blob URL on unmount / change
  useEffect(() => {
    return () => {
      if (uploadedDocBlobUrl) URL.revokeObjectURL(uploadedDocBlobUrl);
    };
  }, [uploadedDocBlobUrl]);

  // Find this signatory's index in partnerSignatories
  const signatoryIndex = useMemo(() => {
    if (!nda?.partnerSignatories || !signerEmail) return -1;
    return nda.partnerSignatories.findIndex((s) => s.email === signerEmail);
  }, [nda, signerEmail]);

  // Zones assigned to this signatory
  const myZones = useMemo(() => {
    if (signatoryIndex < 0) return [];
    return (nda?.partnerSignatureZones || []).filter(
      (z) => z.partnerSignatoryIndex === signatoryIndex
    );
  }, [nda, signatoryIndex]);

  // Initialise zone preview page to first zone's page
  useEffect(() => {
    if (myZones.length > 0) {
      setZonePreviewPage(myZones[0].page || 1);
    }
  }, [myZones.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load pdfjs for zone preview (only when there are zones)
  useEffect(() => {
    if (!uploadedDocBlobUrl || myZones.length === 0) {
      setPdfJsDoc(null);
      return;
    }
    let cancelled = false;
    import('pdfjs-dist').then(async (pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      try {
        const doc = await pdfjsLib.getDocument(uploadedDocBlobUrl).promise;
        if (!cancelled) setPdfJsDoc(doc);
      } catch (e) {
        console.error('pdfjs load error', e);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uploadedDocBlobUrl, myZones.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render zone preview canvas
  useEffect(() => {
    if (!pdfJsDoc || !zoneCanvasRef.current) return;
    const canvas = zoneCanvasRef.current;
    const pageNum = Math.min(zonePreviewPage, pdfJsDoc.numPages);
    let cancelled = false;
    pdfJsDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = canvas.parentElement?.offsetWidth || viewport.width;
      const scale = containerWidth / viewport.width;
      const scaledVp = page.getViewport({ scale });
      canvas.width = scaledVp.width;
      canvas.height = scaledVp.height;
      page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledVp });
    });
    return () => {
      cancelled = true;
    };
  }, [pdfJsDoc, zonePreviewPage]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getNdaByToken(token);
        setNda(data.nda);
        setSignatory(data.signatory);
        setSignerEmail(data.signerEmail || '');

        // If OTP is not required for this NDA, skip the gate entirely
        if (!data.nda?.requireOtp) {
          setVerifyStep('otp-verified');
          return;
        }

        // OTP is required — auto-send the code so the user lands directly at the entry step
        try {
          setSendingOtp(true);
          setVerifyStep('otp-sending');
          const otpData = await requestNdaOtp(token);
          setMaskedEmail(otpData.maskedEmail || data.signerEmail || '');
          setVerifyStep('otp-sent');
        } catch (otpErr) {
          // Auto-send failed; fall back to the manual "Send Code" card
          console.error('[OTP auto-send]', otpErr);
          setVerifyStep('otp-gate');
        } finally {
          setSendingOtp(false);
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || 'Invalid or expired signing link.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSign = async () => {
    if (!signatureData) {
      toast.error('Please draw your signature first');
      return;
    }
    if (nda?.requireConsent && !consentChecked) {
      toast.error('Please confirm you have read and agree to the terms');
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
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      await partnerSignNda(token, signatureData, ipAddress, sessionToken || null, ua);
      setDone(true);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to submit signature. Please try again.';
      toast.error(msg);
    } finally {
      setSigning(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      const data = await requestNdaOtp(token);
      setMaskedEmail(data.maskedEmail || signerEmail);
      setVerifyStep('otp-sent');
      toast.success('Verification code sent to your email');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send verification code.';
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    try {
      setVerifyingOtp(true);
      const data = await verifyNdaOtp(token, otpCode);
      setSessionToken(data.sessionToken);
      setVerifyStep('otp-verified');
      toast.success('Identity verified — you may now sign the document');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Incorrect or expired code. Please try again.';
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
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

          {/* ── Identity verification gate (shown only when requireOtp is true) ── */}
          {nda?.requireOtp && verifyStep === 'otp-sending' && (
            <Card sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Iconify icon="solar:shield-check-bold" color="warning.main" width={28} />
                <Typography variant="h6">Sending Verification Code…</Typography>
                <CircularProgress size={20} color="warning" />
              </Stack>
            </Card>
          )}

          {nda?.requireOtp && verifyStep === 'otp-gate' && (
            <Card sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Iconify icon="solar:shield-check-bold" color="warning.main" width={28} />
                <Typography variant="h6">Identity Verification Required</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                To protect the integrity of this document we need to verify your identity before you
                can sign. We&apos;ll send a one-time 6-digit code to your registered email address.
              </Typography>
              <LoadingButton
                variant="contained"
                color="warning"
                loading={sendingOtp}
                startIcon={<Iconify icon="solar:letter-bold" />}
                onClick={handleSendOtp}
              >
                Send Verification Code
              </LoadingButton>
            </Card>
          )}

          {nda?.requireOtp && verifyStep === 'otp-sent' && (
            <Card sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Iconify icon="solar:shield-check-bold" color="warning.main" width={28} />
                <Typography variant="h6">Enter Verification Code</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                A 6-digit code has been sent to <strong>{maskedEmail}</strong>. The code is valid
                for 10 minutes.
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <TextField
                  label="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                  size="small"
                  sx={{ width: 160 }}
                />
                <LoadingButton
                  variant="contained"
                  color="warning"
                  loading={verifyingOtp}
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6}
                >
                  Verify Code
                </LoadingButton>
                <LoadingButton
                  variant="outlined"
                  color="inherit"
                  size="small"
                  loading={sendingOtp}
                  onClick={handleSendOtp}
                >
                  Resend
                </LoadingButton>
              </Stack>
            </Card>
          )}

          {nda?.requireOtp && verifyStep === 'otp-verified' && (
            <Alert severity="success" icon={<Iconify icon="solar:shield-check-bold" />}>
              <Typography variant="body2">
                Identity verified. You may now review the document and apply your signature below.
              </Typography>
            </Alert>
          )}

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
            <Box sx={{ p: uploadedDocBlobUrl ? 0 : 3, maxHeight: 700, overflowY: 'auto' }}>
              {uploadedDocBlobUrl ? (
                /* External upload: show the actual vendor-uploaded PDF */
                <Box
                  component="iframe"
                  src={uploadedDocBlobUrl}
                  title="Agreement Document"
                  sx={{ width: '100%', height: 700, border: 'none', display: 'block' }}
                />
              ) : (
                /* IOTA-generated template */
                <NdaHtmlTemplate nda={nda} showSignatures showAuditTrail={false} />
              )}
            </Box>
          </Card>

          {/* Signature zone preview — show where on the document the partner needs to sign */}
          {myZones.length > 0 && uploadedDocBlobUrl && (
            <Card sx={{ p: 2, border: '2px dashed', borderColor: 'warning.main' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Your signature location{myZones.length > 1 ? 's' : ''} in the document
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                The highlighted area{myZones.length > 1 ? 's' : ''} show
                {myZones.length > 1 ? '' : 's'} where your signature will be embedded.
              </Typography>

              {/* Zone page chips for navigation */}
              {[...new Set(myZones.map((z) => z.page || 1))]
                .sort((a, b) => a - b)
                .map((pg) => (
                  <Chip
                    key={pg}
                    label={`Page ${pg}`}
                    size="small"
                    variant={zonePreviewPage === pg ? 'filled' : 'outlined'}
                    color="warning"
                    onClick={() => setZonePreviewPage(pg)}
                    sx={{ mr: 0.75, mb: 1.5, cursor: 'pointer' }}
                  />
                ))}

              {/* Page navigation */}
              {pdfJsDoc && pdfJsDoc.numPages > 1 && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Page:
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setZonePreviewPage((p) => Math.max(1, p - 1))}
                    disabled={zonePreviewPage <= 1}
                  >
                    <Iconify icon="solar:arrow-left-bold" width={16} />
                  </IconButton>
                  <Typography variant="body2">{zonePreviewPage}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setZonePreviewPage((p) => p + 1)}
                    disabled={zonePreviewPage >= pdfJsDoc.numPages}
                  >
                    <Iconify icon="solar:arrow-right-bold" width={16} />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary">
                    / {pdfJsDoc.numPages}
                  </Typography>
                </Stack>
              )}

              {/* Canvas preview with zone overlay */}
              <Box
                ref={zonePreviewRef}
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '141.4%',
                  bgcolor: 'common.white',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  boxShadow: 2,
                }}
              >
                <canvas
                  ref={zoneCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                />
                {myZones
                  .filter((z) => (z.page || 1) === zonePreviewPage)
                  .map((zone) => (
                    <Box
                      key={zone.id}
                      sx={{
                        position: 'absolute',
                        left: `${zone.xPct}%`,
                        top: `${zone.yPct}%`,
                        width: `${zone.widthPct}%`,
                        height: `${zone.heightPct}%`,
                        border: '2px dashed',
                        borderColor: 'warning.main',
                        bgcolor: 'rgba(255,152,0,0.18)',
                        borderRadius: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          color: 'warning.dark',
                          letterSpacing: 0.5,
                        }}
                      >
                        SIGN HERE
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Card>
          )}

          {/* Signature */}
          {(() => {
            const otpBlocked = nda?.requireOtp && verifyStep !== 'otp-verified';
            const signEnabled = signatureData && (!nda?.requireConsent || consentChecked);
            return (
              <Card
                sx={{
                  p: 3,
                  border: '2px solid',
                  borderColor: otpBlocked ? 'divider' : 'primary.main',
                  opacity: otpBlocked ? 0.45 : 1,
                  pointerEvents: otpBlocked ? 'none' : 'auto',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Your Signature
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  By applying your signature below, you confirm that you have read, understood, and
                  agree to the terms of this Non-Disclosure Agreement. Your signature, along with a
                  timestamp and your IP address, will be permanently recorded in the document audit
                  log.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <NdaSignatureCanvas
                  onSave={setSignatureData}
                  label="Draw or type your signature here"
                />

                {/* Consent checkbox — only shown when requireConsent is true on the NDA */}
                {nda?.requireConsent && (
                  <FormControlLabel
                    sx={{ mt: 2, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        color="primary"
                        sx={{ pt: 0 }}
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        I confirm that I have fully read and understood this Non-Disclosure
                        Agreement and I agree to be legally bound by its terms. I acknowledge that
                        this electronic signature has the same legal effect as a handwritten
                        signature.
                      </Typography>
                    }
                  />
                )}

                {signEnabled && (
                  <Box sx={{ mt: 2 }}>
                    <LoadingButton
                      variant="contained"
                      size="large"
                      loading={signing}
                      startIcon={<Iconify icon="solar:check-circle-bold" />}
                      onClick={handleSign}
                    >
                      I Agree &amp; Sign
                    </LoadingButton>
                  </Box>
                )}
              </Card>
            );
          })()}

          {/* Footer disclaimer */}
          <Typography variant="caption" color="text.secondary" textAlign="center">
            This is a legally binding document. By signing, you agree to the terms contained herein.
            This signature portal is provided by IOTA Technologies. All data is securely stored. If
            you did not expect this email or believe you received it in error, please contact{' '}
            <strong>legal@iotatechnologies.ai</strong>.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
