'use client';

import { pdf } from '@react-pdf/renderer';
import { use, useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { getOfferByToken, employeeSignOffer } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { NdaSignatureCanvas } from 'src/components/nda';
import { OfferLetterHTML } from 'src/components/offer-letter/offer-letter-html';
import { OfferLetterPDF } from 'src/components/offer-letter/offer-letter-pdf';

// ── Component ────────────────────────────────────────────────────────────────

export default function SignOfferPage({ params }) {
  const { token } = use(params);

  const [offerData, setOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);

  const [signatureData, setSignatureData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Zone preview (pdfjs)
  const [offerPdfBlobUrl, setOfferPdfBlobUrl] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const sigZonePreviewRef = useRef(null);
  const sigZoneCanvasRef = useRef(null);

  // Fetch offer by token
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await getOfferByToken(token);
        setOfferData(data);
      } catch (err) {
        setError(err?.response?.data?.message || 'This signing link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  // Generate PDF blob for zone preview
  useEffect(() => {
    if (!offerData?.offer) return;
    const offer = offerData.offer;
    let cancelled = false;
    const generate = async () => {
      try {
        const offerFields = {
          employeeName: offer.candidateName,
          passportNumber: offer.passportNumber || '',
          dateOfBirth: offer.dateOfBirth || '',
          nationality: offer.nationality || '',
          position: offer.position,
          department: offer.department,
          contractNumber: offer.contractNumber,
          contractType: offer.contractType,
          startDate: offer.startDate,
          contractDuration: offer.contractDuration || '',
          probationPeriod: offer.probationPeriod || '',
          basicSalary: offer.basicSalary,
          housingAllowance: offer.housingAllowance,
          transportationAllowance: offer.transportationAllowance,
          otherAllowances: offer.otherAllowances,
          totalSalary: offer.totalSalary,
          workingHours: offer.workingHours || '',
          annualLeaveDays: offer.annualLeaveDays || '',
          noticePeriod: offer.noticePeriod || '',
          currency: offer.currency || 'SAR',
        };
        const blob = await pdf(<OfferLetterPDF data={offerFields} />).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setOfferPdfBlobUrl(url);
      } catch (e) {
        console.error('Zone preview PDF generation failed:', e);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [offerData?.offer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (offerPdfBlobUrl) URL.revokeObjectURL(offerPdfBlobUrl);
    };
  }, [offerPdfBlobUrl]);

  // Load pdfjs doc
  useEffect(() => {
    if (!offerPdfBlobUrl) { setPdfJsDoc(null); return; }
    let cancelled = false;
    import('pdfjs-dist').then(async (pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      try {
        const doc = await pdfjsLib.getDocument(offerPdfBlobUrl).promise;
        if (!cancelled) setPdfJsDoc(doc);
      } catch (e) { console.error(e); }
    });
    return () => { cancelled = true; };
  }, [offerPdfBlobUrl]);

  // Render employee zone preview
  useEffect(() => {
    if (!pdfJsDoc || !sigZoneCanvasRef.current) return;
    const offer = offerData?.offer;
    const zone = offer?.employeeSignatureZone;
    const pageNum = zone?.page || 1;
    let cancelled = false;
    pdfJsDoc.getPage(Math.min(pageNum, pdfJsDoc.numPages)).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = sigZoneCanvasRef.current?.parentElement?.offsetWidth || viewport.width;
      const scale = containerWidth / viewport.width;
      const scaledVp = page.getViewport({ scale });
      const canvas = sigZoneCanvasRef.current;
      canvas.width = scaledVp.width;
      canvas.height = scaledVp.height;
      page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledVp });
    });
    return () => { cancelled = true; };
  }, [pdfJsDoc, offerData?.offer?.employeeSignatureZone]);

  const handleSubmit = useCallback(async () => {
    if (!signatureData) return;
    try {
      setSubmitting(true);
      let ipAddress = '';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) { const j = await ipRes.json(); ipAddress = j.ip || ''; }
      } catch { /* ignore */ }
      await employeeSignOffer(token, signatureData, ipAddress);
      setSigned(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit your signature. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  }, [token, signatureData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !signed) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb', p: 3 }}>
        <Card sx={{ p: 4, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <Iconify icon="solar:close-circle-bold" width={56} sx={{ color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>Link Unavailable</Typography>
          <Typography variant="body2" color="text.secondary">{error}</Typography>
        </Card>
      </Box>
    );
  }

  if (signed) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb', p: 3 }}>
        <Card sx={{ p: 4, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <Iconify icon="solar:check-circle-bold" width={56} sx={{ color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>Signature Submitted!</Typography>
          <Typography variant="body2" color="text.secondary">
            Your signature has been recorded. IOTA Technologies will share your fully-executed offer letter shortly.
          </Typography>
        </Card>
      </Box>
    );
  }

  const offer = offerData?.offer;
  const signerName = offerData?.signerName;
  const empZone = offer?.employeeSignatureZone;
  const iotaSignatories = Array.isArray(offer?.iotaSignatories) ? offer.iotaSignatories : [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', py: 4 }}>
      <Container maxWidth="md">

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component="img" src="/logo/logo-full.svg" alt="IOTA Technologies" sx={{ height: 48, mb: 2 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Offer Letter Signing
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hello {signerName || offer?.candidateName}, please review and sign your offer letter below.
          </Typography>
        </Box>

        {/* Offer summary */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>{offer?.position}</Typography>
            <Typography variant="subtitle1" color="text.secondary">— {offer?.department}</Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Contract</Typography>
              <Typography variant="body2" fontWeight={600}>{offer?.contractNumber}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Start Date</Typography>
              <Typography variant="body2" fontWeight={600}>{offer?.startDate}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Package</Typography>
              <Typography variant="body2" fontWeight={600}>{offer?.currency || 'SAR'} {Number(offer?.totalSalary || 0).toLocaleString()}/month</Typography>
            </Box>
          </Stack>
        </Card>

        {/* Offer letter preview */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Your Offer Letter</Typography>
          <Divider sx={{ mb: 2 }} />
          <OfferLetterHTML
            data={{
              employeeName: offer?.candidateName,
              passportNumber: offer?.passportNumber,
              dateOfBirth: offer?.dateOfBirth,
              nationality: offer?.nationality,
              position: offer?.position,
              department: offer?.department,
              contractNumber: offer?.contractNumber,
              contractType: offer?.contractType,
              startDate: offer?.startDate,
              contractDuration: offer?.contractDuration,
              probationPeriod: offer?.probationPeriod,
              basicSalary: offer?.basicSalary,
              housingAllowance: offer?.housingAllowance,
              transportationAllowance: offer?.transportationAllowance,
              otherAllowances: offer?.otherAllowances,
              totalSalary: offer?.totalSalary,
              workingHours: offer?.workingHours,
              annualLeaveDays: offer?.annualLeaveDays,
              noticePeriod: offer?.noticePeriod,
              currency: offer?.currency || 'SAR',
            }}
            showSignatures
            iotaSignatories={iotaSignatories}
            employeeSignatureData={null}
          />
        </Card>

        {/* Employee signature zone preview (pdfjs) */}
        {empZone && pdfJsDoc && (
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Your Signature Zone</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your signature will be placed in the highlighted area on the document.
            </Typography>
            <Box ref={sigZonePreviewRef} sx={{ position: 'relative', width: '100%', paddingTop: '141.4%', bgcolor: 'common.white', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}>
              <canvas ref={sigZoneCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} />
              <Box sx={{ position: 'absolute', left: `${empZone.xPct}%`, top: `${empZone.yPct}%`, width: `${empZone.widthPct}%`, height: `${empZone.heightPct}%`, border: '2px dashed #f57c00', bgcolor: 'rgba(245,124,0,0.13)', borderRadius: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#f57c00' }}>Your Signature</Typography>
              </Box>
            </Box>
          </Card>
        )}

        {/* IOTA signatories already signed */}
        {iotaSignatories.filter((s) => s.signedAt).length > 0 && (
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Signed by IOTA</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              {iotaSignatories.filter((s) => s.signedAt).map((s, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'success.main' }} />
                  <Typography variant="body2"><strong>{s.name}</strong>{s.title ? `, ${s.title}` : ''} — signed {new Date(s.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        )}

        {/* Signature canvas */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Your Signature</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Draw your signature in the box below. By signing, you confirm your acceptance of this offer letter.
          </Typography>
          <NdaSignatureCanvas onSave={setSignatureData} label="Draw your signature here" />
        </Card>

        {/* Submit */}
        {signatureData && (
          <Alert severity="info" sx={{ mb: 2 }}>
            By clicking &quot;Sign Offer Letter&quot;, you are electronically signing and accepting the terms of this offer.
          </Alert>
        )}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LoadingButton
            variant="contained"
            size="large"
            loading={submitting}
            disabled={!signatureData}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
            onClick={handleSubmit}
            sx={{ px: 6, py: 1.5 }}
          >
            Sign Offer Letter
          </LoadingButton>
        </Box>

      </Container>
    </Box>
  );
}
