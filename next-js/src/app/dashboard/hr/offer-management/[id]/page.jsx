'use client';

import { pdf } from '@react-pdf/renderer';
import { use, useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { NdaSignatureCanvas } from 'src/components/nda';

import { OfferLetterPDF } from 'src/components/offer-letter/offer-letter-pdf';

import {
  getOffer,
  approveOffer,
  rejectOffer,
  commentOnOffer,
  iotaSignOffer,
  finalizeOffer,
  setOfferSignatureZones,
  sendOfferForSigning,
  remindEmployeeToSign,
} from 'src/utils/apiHelper';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  pending_iota_signatures: 'warning',
  pending_employee_signature: 'info',
  fully_signed: 'success',
};

const STATUS_LABEL = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_employee_signature: 'Pending Employee Signature',
  fully_signed: 'Fully Signed',
};

const STAGE_LABEL = {
  manager: 'Manager',
  admin: 'Admin',
  superAdmin: 'Super Admin',
};

const APPROVAL_CHAIN = ['manager', 'admin', 'superAdmin'];

const ACTION_LABEL = {
  sent_for_iota_signing: 'Sent for IOTA Signing',
  iota_signed: 'IOTA Signed',
  employee_signed: 'Employee Signed',
  employee_reminder_sent: 'Employee Reminder Sent',
  pdf_uploaded_to_onedrive: 'PDF Uploaded to OneDrive',
};

const formatAction = (action) =>
  ACTION_LABEL[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Per-signatory zone colors (IOTA)
const SIG_ZONE_COLORS = [
  { border: '#1565c0', bg: 'rgba(21,101,192,0.12)' },
  { border: '#2e7d32', bg: 'rgba(46,125,50,0.12)' },
  { border: '#6a1b9a', bg: 'rgba(106,27,154,0.12)' },
  { border: '#e65100', bg: 'rgba(230,81,0,0.12)' },
  { border: '#00838f', bg: 'rgba(0,131,143,0.12)' },
  { border: '#558b2f', bg: 'rgba(85,139,47,0.12)' },
];

// Employee zone color (orange)
const EMP_ZONE_COLOR = { border: '#f57c00', bg: 'rgba(245,124,0,0.13)' };

function DetailRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OfferManagementDetailsPage({ params }) {
  const { id } = use(params);
  const { user } = useAuthContext();
  const router = useRouter();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Approval dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // Send for signing dialog
  const [sendForSigningOpen, setSendForSigningOpen] = useState(false);
  const [newIotaSignatories, setNewIotaSignatories] = useState([
    { name: '', email: '', title: '' },
  ]);

  // IOTA signing
  const [signatureData, setSignatureData] = useState('');
  const [signing, setSigning] = useState(false);

  // Signature zones
  const [signatureZones, setSignatureZones] = useState([]);
  const [sigZoneSaving, setSigZoneSaving] = useState(false);
  const [sigZonePreviewPage, setSigZonePreviewPage] = useState(1);
  const [draggingSigZone, setDraggingSigZone] = useState(null);
  const [selectedSigZoneSignatory, setSelectedSigZoneSignatory] = useState(0);
  const [selectedZoneIsEmployee, setSelectedZoneIsEmployee] = useState(false);
  const sigZonePreviewRef = useRef(null);
  const sigZoneCanvasRef = useRef(null);
  const sigZoneDragMovedRef = useRef(false);

  // PDF generation for zone preview (IOTA-generated offer PDF)
  const [offerPdfBlobUrl, setOfferPdfBlobUrl] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);

  // Download / finalize
  const [downloadProcessing, setDownloadProcessing] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);

  const userEmail = user?.email || '';

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  const canAct =
    offer?.status === 'pending_approval' &&
    offer?.currentApprovalStage &&
    offer.currentApprovalStage === user?.role;

  const pendingIotaSignature =
    offer?.status === 'pending_iota_signatures' &&
    Array.isArray(offer?.iotaSignatories) &&
    offer.iotaSignatories.some((s) => s.email === userEmail && !s.signedAt);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOffer = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOffer(id);
      setOffer(data);
    } catch (err) {
      console.error('Failed to fetch offer:', err);
      toast.error('Failed to load offer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  // Sync signature zones from offer
  useEffect(() => {
    if (offer?.signatureZones) setSignatureZones(offer.signatureZones);
  }, [offer?.signatureZones]);

  // Generate PDF blob for zone preview
  useEffect(() => {
    if (!offer) return;
    let cancelled = false;
    const generate = async () => {
      try {
        const offerData = {
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
        const blob = await pdf(<OfferLetterPDF data={offerData} />).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setOfferPdfBlobUrl(url);
      } catch (e) {
        console.error('PDF generation for zone preview failed:', e);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [offer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (offerPdfBlobUrl) URL.revokeObjectURL(offerPdfBlobUrl);
    };
  }, [offerPdfBlobUrl]);

  // Load pdfjs from blob URL
  useEffect(() => {
    if (!offerPdfBlobUrl) {
      setPdfJsDoc(null);
      return;
    }
    let cancelled = false;
    import('pdfjs-dist').then(async (pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      try {
        const doc = await pdfjsLib.getDocument(offerPdfBlobUrl).promise;
        if (!cancelled) setPdfJsDoc(doc);
      } catch (e) {
        console.error('pdfjs load error', e);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [offerPdfBlobUrl]);

  // Render sig zone preview canvas
  useEffect(() => {
    if (!pdfJsDoc || !sigZoneCanvasRef.current) return;
    const canvas = sigZoneCanvasRef.current;
    const pageNum = Math.min(sigZonePreviewPage, pdfJsDoc.numPages);
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
  }, [pdfJsDoc, sigZonePreviewPage]);

  // ── Sig zone click-to-place ────────────────────────────────────────────────

  const handleSigZonePreviewClick = useCallback(
    (e) => {
      if (sigZoneDragMovedRef.current) return;
      if (!sigZonePreviewRef.current) return;
      const rect = sigZonePreviewRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100 - 7;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100 - 3;
      const newZone = {
        id: `zone-${Date.now()}`,
        page: sigZonePreviewPage,
        xPct: Math.max(0, Math.min(86, xPct)),
        yPct: Math.max(0, Math.min(94, yPct)),
        widthPct: 14,
        heightPct: 6,
        iotaSignatoryIndex: selectedZoneIsEmployee ? null : selectedSigZoneSignatory,
        isEmployee: selectedZoneIsEmployee,
        label: selectedZoneIsEmployee
          ? 'Employee'
          : offer?.iotaSignatories?.[selectedSigZoneSignatory]?.name ||
            `Signatory ${selectedSigZoneSignatory + 1}`,
      };
      setSignatureZones((prev) => [...prev, newZone]);
    },
    [sigZonePreviewPage, selectedSigZoneSignatory, selectedZoneIsEmployee, offer?.iotaSignatories]
  );

  // Sig zone drag
  useEffect(() => {
    if (!draggingSigZone) return;
    const onMove = (e) => {
      sigZoneDragMovedRef.current = true;
      if (!sigZonePreviewRef.current) return;
      const rect = sigZonePreviewRef.current.getBoundingClientRect();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const xPct = ((x - rect.left) / rect.width) * 100 - 7;
      const yPct = ((y - rect.top) / rect.height) * 100 - 3;
      setSignatureZones((prev) =>
        prev.map((z) =>
          z.id === draggingSigZone
            ? { ...z, xPct: Math.max(0, Math.min(86, xPct)), yPct: Math.max(0, Math.min(94, yPct)) }
            : z
        )
      );
    };
    const onUp = () => {
      setDraggingSigZone(null);
      setTimeout(() => {
        sigZoneDragMovedRef.current = false;
      }, 0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingSigZone]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = useCallback(async () => {
    try {
      setActionLoading(true);
      const updated = await approveOffer(id, user?.displayName || user?.email, approveComment);
      setOffer(updated);
      setApproveOpen(false);
      setApproveComment('');
      if (offer?.currentApprovalStage === 'superAdmin') {
        toast.success('Offer fully approved! Offer letter has been sent to the candidate.');
      } else {
        toast.success('Approved and forwarded to next reviewer.');
      }
    } catch (err) {
      toast.error('Failed to approve offer');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, approveComment, offer?.currentApprovalStage]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await rejectOffer(id, user?.displayName || user?.email, rejectReason);
      setOffer(updated);
      setRejectOpen(false);
      setRejectReason('');
      toast.success('Offer rejected.');
    } catch (err) {
      toast.error('Failed to reject offer');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, rejectReason]);

  const handleComment = useCallback(async () => {
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await commentOnOffer(id, user?.displayName || user?.email, reviewComment);
      setOffer(updated);
      setCommentOpen(false);
      setReviewComment('');
      toast.success('Comment saved.');
    } catch (err) {
      toast.error('Failed to save comment');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, reviewComment]);

  const handleSendForSigning = async () => {
    const valid = newIotaSignatories.filter((s) => s.name.trim() && s.email.trim());
    if (valid.length === 0) {
      toast.error('Add at least one signatory with name and email');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await sendOfferForSigning(id, valid, userEmail);
      setOffer(updated);
      setSendForSigningOpen(false);
      setNewIotaSignatories([{ name: '', email: '', title: '' }]);
      toast.success('Offer sent for IOTA signatures. First signatory has been emailed.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send for signing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIotaSign = async () => {
    if (!signatureData) {
      toast.error('Please draw your signature first');
      return;
    }
    try {
      setSigning(true);
      const updated = await iotaSignOffer(id, signatureData, userEmail);
      setOffer(updated);
      setSignatureData('');
      if (updated.status === 'pending_employee_signature') {
        toast.success('All IOTA signatures collected. Employee has been emailed.');
      } else {
        toast.success('Your signature has been recorded.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit signature');
    } finally {
      setSigning(false);
    }
  };

  const handleSaveSignatureZones = async () => {
    try {
      setSigZoneSaving(true);
      const updated = await setOfferSignatureZones(id, signatureZones);
      setOffer(updated);
      toast.success('Signature zones saved.');
    } catch (err) {
      toast.error('Failed to save signature zones');
    } finally {
      setSigZoneSaving(false);
    }
  };

  const handleRemindEmployee = async () => {
    try {
      setRemindLoading(true);
      const updated = await remindEmployeeToSign(id, userEmail);
      setOffer(updated);
      toast.success('Reminder email sent to employee.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reminder');
    } finally {
      setRemindLoading(false);
    }
  };

  const uint8ToBase64 = (bytes) => {
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk)
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
  };

  const buildProcessedPdf = async () => {
    const offerData = {
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
    const blob = await pdf(<OfferLetterPDF data={offerData} />).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    let fileBase64 = uint8ToBase64(new Uint8Array(arrayBuffer));

    const allZones = Array.isArray(offer.signatureZones) ? offer.signatureZones : [];
    if (allZones.length > 0) {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const zone of allZones) {
        const pageIdx = Math.max(0, (zone.page || 1) - 1);
        const page = pages[pageIdx];
        if (!page) continue;
        const { width: pw, height: ph } = page.getSize();
        const zX = (zone.xPct / 100) * pw;
        const zY = ph - (zone.yPct / 100) * ph;
        const zW = (zone.widthPct / 100) * pw;
        const zH = (zone.heightPct / 100) * ph;

        let sigData = null;
        if (zone.isEmployee) {
          sigData = offer.employeeSignatureData || null;
        } else {
          const idx = zone.iotaSignatoryIndex ?? 0;
          sigData = offer.iotaSignatories?.[idx]?.signatureData || null;
        }

        if (sigData && sigData.startsWith('data:image')) {
          try {
            const b64 = sigData.split(',')[1];
            const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const sigImage = sigData.includes('image/png')
              ? await pdfDoc.embedPng(sigBytes)
              : await pdfDoc.embedJpg(sigBytes);
            page.drawImage(sigImage, { x: zX, y: zY - zH, width: zW, height: zH, opacity: 1 });
          } catch {
            page.drawRectangle({
              x: zX,
              y: zY - zH,
              width: zW,
              height: zH,
              borderColor: rgb(0.2, 0.2, 0.7),
              borderWidth: 1,
              opacity: 0.5,
            });
          }
        }
      }

      const finalBytes = await pdfDoc.save();
      fileBase64 = uint8ToBase64(finalBytes);
    }
    return fileBase64;
  };

  const handleDownloadProcessed = async () => {
    try {
      setDownloadProcessing(true);
      const fileBase64 = await buildProcessedPdf();
      const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
      const blobOut = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blobOut);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${offer.contractNumber}-${offer.candidateName.replace(/\s+/g, '_')}_Offer.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadProcessing(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setDownloadProcessing(true);
      const fileBase64 = await buildProcessedPdf();
      const updated = await finalizeOffer(id, fileBase64);
      setOffer(updated);
      toast.success('Offer letter uploaded to OneDrive successfully.');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to finalize offer');
    } finally {
      setDownloadProcessing(false);
    }
  };

  const handlePrint = async () => {
    try {
      const offerData = {
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
      const blob = await pdf(<OfferLetterPDF data={offerData} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error('Failed to generate PDF for printing');
    }
  };

  // ── Loading / not-found states ─────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!offer) {
    return (
      <DashboardContent>
        <Alert severity="error">Offer not found.</Alert>
      </DashboardContent>
    );
  }

  const statusLabel =
    STATUS_LABEL[offer.status] ||
    (offer.status || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const iotaSignatories = Array.isArray(offer.iotaSignatories) ? offer.iotaSignatories : [];
  const auditLog = Array.isArray(offer.auditLog) ? offer.auditLog : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Offer Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Offer Management', href: paths.dashboard.hr.offerManagement.root },
          { name: offer.candidateName },
        ]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {canAct && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                  onClick={() => setApproveOpen(true)}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Iconify icon="eva:message-circle-fill" />}
                  onClick={() => setCommentOpen(true)}
                >
                  Comment
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Iconify icon="eva:close-circle-fill" />}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </>
            )}
            {offer.status === 'approved' && isAdminOrSuperAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => {
                  // Pre-populate from any signatories already saved on the offer
                  if (Array.isArray(offer.iotaSignatories) && offer.iotaSignatories.length > 0) {
                    setNewIotaSignatories(
                      offer.iotaSignatories.map((s) => ({
                        name: s.name || '',
                        email: s.email || '',
                        title: s.title || '',
                      }))
                    );
                  } else {
                    setNewIotaSignatories([{ name: '', email: '', title: '' }]);
                  }
                  setSendForSigningOpen(true);
                }}
              >
                Set Up Signing
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:printer-bold" />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <LoadingButton
              variant="outlined"
              loading={downloadProcessing}
              startIcon={<Iconify icon="solar:download-bold" />}
              onClick={handleDownloadProcessed}
            >
              Download PDF
            </LoadingButton>
            {offer.status === 'fully_signed' && (
              <LoadingButton
                variant="contained"
                color="success"
                loading={downloadProcessing}
                startIcon={<Iconify icon="solar:cloud-upload-bold" />}
                onClick={handleFinalize}
              >
                {offer.onedriveWebUrl ? 'Re-upload to OneDrive' : 'Upload to OneDrive'}
              </LoadingButton>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* ── Left column ─────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Status banner */}
            <Alert
              severity={
                ['approved', 'fully_signed'].includes(offer.status)
                  ? 'success'
                  : offer.status === 'rejected'
                    ? 'error'
                    : ['pending_approval', 'pending_iota_signatures'].includes(offer.status)
                      ? 'warning'
                      : 'info'
              }
              icon={false}
            >
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={statusLabel}
                  color={STATUS_COLOR[offer.status] || 'default'}
                />
                {offer.status === 'approved' && offer.approvedBy && (
                  <Typography variant="body2">
                    Approved by <strong>{offer.approvedBy}</strong>
                  </Typography>
                )}
                {offer.status === 'rejected' && offer.rejectedBy && (
                  <Typography variant="body2">
                    Rejected by <strong>{offer.rejectedBy}</strong>: {offer.rejectionReason}
                  </Typography>
                )}
                {offer.status === 'fully_signed' && offer.employeeSignedAt && (
                  <Typography variant="body2">
                    Employee signed on{' '}
                    <strong>
                      {new Date(offer.employeeSignedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </Typography>
                )}
              </Stack>
            </Alert>

            {/* OneDrive link */}
            {offer.onedriveWebUrl && (
              <Alert severity="success" icon={<Iconify icon="solar:cloud-check-bold" />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2">Signed offer uploaded to OneDrive.</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    href={offer.onedriveWebUrl}
                    target="_blank"
                    rel="noopener"
                  >
                    Open in OneDrive
                  </Button>
                </Stack>
              </Alert>
            )}

            {/* Candidate Information */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Candidate Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow label="Full Name" value={offer.candidateName} />
              <DetailRow label="Email" value={offer.candidateEmail} />
              <DetailRow label="Passport Number" value={offer.passportNumber} />
              <DetailRow label="Date of Birth" value={offer.dateOfBirth} />
              <DetailRow label="Nationality" value={offer.nationality} />
            </Card>

            {/* Role & Contract */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Position &amp; Contract
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow label="Position" value={offer.position} />
              <DetailRow label="Department" value={offer.department} />
              <DetailRow label="Contract Number" value={offer.contractNumber} />
              <DetailRow label="Contract Type" value={offer.contractType} />
              <DetailRow label="Start Date" value={offer.startDate} />
              <DetailRow
                label="Contract Duration"
                value={offer.contractDuration ? `${offer.contractDuration} months` : null}
              />
              <DetailRow
                label="Probation Period"
                value={offer.probationPeriod ? `${offer.probationPeriod} months` : null}
              />
            </Card>

            {/* Employment Terms */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Employment Terms
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow
                label="Working Hours"
                value={offer.workingHours ? `${offer.workingHours} hrs/day` : null}
              />
              <DetailRow
                label="Annual Leave"
                value={offer.annualLeaveDays ? `${offer.annualLeaveDays} days/year` : null}
              />
              <DetailRow
                label="Notice Period"
                value={offer.noticePeriod ? `${offer.noticePeriod} days` : null}
              />
            </Card>

            {/* IOTA Sign card */}
            {pendingIotaSignature && (
              <Card sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Sign Offer Letter
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You are listed as an IOTA signatory on this offer letter. Please draw your
                  signature below to proceed.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <NdaSignatureCanvas onSave={setSignatureData} label="Draw your signature" />
                {signatureData && (
                  <Box sx={{ mt: 2 }}>
                    <LoadingButton
                      variant="contained"
                      loading={signing}
                      startIcon={<Iconify icon="solar:check-circle-bold" />}
                      onClick={handleIotaSign}
                    >
                      Submit Signature
                    </LoadingButton>
                  </Box>
                )}
              </Card>
            )}

            {/* IOTA signatories status */}
            {iotaSignatories.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  IOTA Signatories
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  {iotaSignatories.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: s.signedAt ? 'success.main' : 'action.disabledBackground',
                          color: s.signedAt ? 'common.white' : 'text.disabled',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {s.signedAt ? '✓' : i + 1}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.email}
                          {s.title ? ` — ${s.title}` : ''}
                          {s.signedAt
                            ? ` · Signed ${new Date(s.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : ' · Awaiting signature'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}

            {/* Employee signing status */}
            {(offer.status === 'pending_employee_signature' || offer.status === 'fully_signed') && (
              <Card sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">Employee Signature</Typography>
                  {offer.status === 'pending_employee_signature' && (
                    <LoadingButton
                      size="small"
                      variant="outlined"
                      loading={remindLoading}
                      startIcon={<Iconify icon="solar:bell-bold" />}
                      onClick={handleRemindEmployee}
                    >
                      Remind Employee
                    </LoadingButton>
                  )}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <DetailRow label="Candidate" value={offer.candidateName} />
                <DetailRow label="Email" value={offer.candidateEmail} />
                {offer.status === 'pending_employee_signature' ? (
                  <>
                    <DetailRow label="Status" value="Awaiting signature" />
                    {offer.employeeTokenExpiresAt && (
                      <DetailRow
                        label="Link Expires"
                        value={new Date(offer.employeeTokenExpiresAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      />
                    )}
                  </>
                ) : (
                  <DetailRow
                    label="Signed At"
                    value={
                      offer.employeeSignedAt
                        ? new Date(offer.employeeSignedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : null
                    }
                  />
                )}
              </Card>
            )}

            {/* Signature zones drag-to-place */}
            {(offer.status === 'pending_iota_signatures' || offer.status === 'approved') &&
              isAdminOrSuperAdmin &&
              pdfJsDoc && (
                <Card sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="h6">Signature Zone Placement</Typography>
                    <LoadingButton
                      size="small"
                      variant="contained"
                      loading={sigZoneSaving}
                      onClick={handleSaveSignatureZones}
                      disabled={signatureZones.length === 0}
                    >
                      Save Zones
                    </LoadingButton>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 2, display: 'block' }}
                  >
                    Select a signatory type and click the document to place a signature zone. Drag
                    to reposition.
                  </Typography>

                  {/* Signatory / employee selector */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                    <Chip
                      label="Employee"
                      variant={selectedZoneIsEmployee ? 'filled' : 'outlined'}
                      sx={{
                        borderColor: EMP_ZONE_COLOR.border,
                        color: selectedZoneIsEmployee ? 'common.white' : EMP_ZONE_COLOR.border,
                        bgcolor: selectedZoneIsEmployee ? EMP_ZONE_COLOR.border : undefined,
                      }}
                      onClick={() => {
                        setSelectedZoneIsEmployee(true);
                      }}
                    />
                    {iotaSignatories.map((s, i) => (
                      <Chip
                        key={i}
                        label={`${s.name || `Signatory ${i + 1}`}`}
                        variant={
                          !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                            ? 'filled'
                            : 'outlined'
                        }
                        sx={{
                          borderColor: SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border,
                          color:
                            !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                              ? 'common.white'
                              : SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border,
                          bgcolor:
                            !selectedZoneIsEmployee && selectedSigZoneSignatory === i
                              ? SIG_ZONE_COLORS[i % SIG_ZONE_COLORS.length].border
                              : undefined,
                        }}
                        onClick={() => {
                          setSelectedZoneIsEmployee(false);
                          setSelectedSigZoneSignatory(i);
                        }}
                      />
                    ))}
                  </Stack>

                  {/* Page navigation */}
                  {pdfJsDoc.numPages > 1 && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Page:
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setSigZonePreviewPage((p) => Math.max(1, p - 1))}
                        disabled={sigZonePreviewPage <= 1}
                      >
                        <Iconify icon="solar:arrow-left-bold" width={16} />
                      </IconButton>
                      <Typography variant="body2">{sigZonePreviewPage}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => setSigZonePreviewPage((p) => p + 1)}
                        disabled={sigZonePreviewPage >= pdfJsDoc.numPages}
                      >
                        <Iconify icon="solar:arrow-right-bold" width={16} />
                      </IconButton>
                      <Typography variant="caption" color="text.secondary">
                        / {pdfJsDoc.numPages}
                      </Typography>
                    </Stack>
                  )}

                  {/* Canvas */}
                  <Box
                    ref={sigZonePreviewRef}
                    onClick={handleSigZonePreviewClick}
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
                      cursor: 'crosshair',
                    }}
                  >
                    <canvas
                      ref={sigZoneCanvasRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'block',
                      }}
                    />
                    {signatureZones
                      .filter((z) => (z.page || 1) === sigZonePreviewPage)
                      .map((zone) => {
                        const isEmp = zone.isEmployee;
                        const color = isEmp
                          ? EMP_ZONE_COLOR
                          : SIG_ZONE_COLORS[
                              (zone.iotaSignatoryIndex ?? 0) % SIG_ZONE_COLORS.length
                            ];
                        return (
                          <Box
                            key={zone.id}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              sigZoneDragMovedRef.current = false;
                              setDraggingSigZone(zone.id);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              sigZoneDragMovedRef.current = false;
                              setDraggingSigZone(zone.id);
                            }}
                            sx={{
                              position: 'absolute',
                              left: `${zone.xPct}%`,
                              top: `${zone.yPct}%`,
                              width: `${zone.widthPct}%`,
                              height: `${zone.heightPct}%`,
                              border: '2px dashed',
                              borderColor: color.border,
                              bgcolor: color.bg,
                              borderRadius: 0.5,
                              cursor: 'move',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              px: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: color.border,
                                letterSpacing: 0.4,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {zone.label ||
                                (isEmp ? 'Employee' : `S${(zone.iotaSignatoryIndex ?? 0) + 1}`)}
                            </Typography>
                            <Tooltip title="Remove zone">
                              <IconButton
                                size="small"
                                sx={{ p: 0, minWidth: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSignatureZones((prev) => prev.filter((z) => z.id !== zone.id));
                                }}
                              >
                                <Iconify
                                  icon="eva:close-fill"
                                  width={12}
                                  sx={{ color: color.border }}
                                />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        );
                      })}
                  </Box>

                  {signatureZones.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      sx={{ mt: 1 }}
                      onClick={() => setSignatureZones([])}
                    >
                      Clear All Zones
                    </Button>
                  )}
                </Card>
              )}

            {/* Review Notes */}
            {(offer.approvalComments || offer.rejectionReason) && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Review Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {offer.approvalComments && (
                  <DetailRow label="Comments" value={offer.approvalComments} />
                )}
                {offer.rejectionReason && (
                  <DetailRow label="Rejection Reason" value={offer.rejectionReason} />
                )}
              </Card>
            )}

            {/* Audit Log */}
            {auditLog.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Audit Log
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  {[...auditLog].reverse().map((entry, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Iconify
                        icon="solar:clock-circle-bold"
                        width={16}
                        sx={{ color: 'text.disabled', mt: 0.25, flexShrink: 0 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatAction(entry.action)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.performedBy} ·{' '}
                          {new Date(entry.performedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                        {entry.notes && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            {entry.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* ── Right column ─────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Salary Package */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Salary Package
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {[
                ['Basic Salary', offer.basicSalary],
                ['Housing Allowance', offer.housingAllowance],
                ['Transportation', offer.transportationAllowance],
                ['Other Allowances', offer.otherAllowances],
              ].map(([label, val]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {offer.currency || 'SAR'} {Number(val || 0).toLocaleString()}
                  </Typography>
                </Box>
              ))}
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Total Package</Typography>
                <Typography variant="subtitle1" color="primary" fontWeight={700}>
                  {offer.currency || 'SAR'} {Number(offer.totalSalary || 0).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {/* Meta info */}
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Offer Info
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Created By" value={offer.createdBy} />
            <DetailRow
              label="Created At"
              value={
                offer.createdAt
                  ? new Date(offer.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : null
              }
            />
          </Card>

          {/* Approval chain */}
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Approval Chain
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {APPROVAL_CHAIN.map((stage, idx) => {
                const isCurrent =
                  offer.status === 'pending_approval' && offer.currentApprovalStage === stage;
                const isRejected = offer.status === 'rejected';
                let isDone = false,
                  doneBy = null,
                  doneAt = null;
                if (stage === 'manager' && offer.managerApprovedBy) {
                  isDone = true;
                  doneBy = offer.managerApprovedBy;
                  doneAt = offer.managerApprovedAt;
                } else if (stage === 'admin' && offer.adminApprovedBy) {
                  isDone = true;
                  doneBy = offer.adminApprovedBy;
                  doneAt = offer.adminApprovedAt;
                } else if (stage === 'superAdmin' && offer.approvedBy) {
                  isDone = true;
                  doneBy = offer.approvedBy;
                  doneAt = offer.approvedAt;
                }
                const isPending =
                  !isDone && !isCurrent && offer.status !== 'approved' && !isRejected;
                return (
                  <Box
                    key={stage}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      opacity: isPending ? 0.4 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isDone
                          ? 'success.main'
                          : isCurrent
                            ? 'warning.main'
                            : 'action.disabledBackground',
                        color: isDone || isCurrent ? 'common.white' : 'text.disabled',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          isCurrent ? 'warning.main' : isDone ? 'success.main' : 'text.primary'
                        }
                      >
                        {STAGE_LABEL[stage]}
                        {isCurrent && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'warning.main' }}
                          >
                            (Awaiting)
                          </Typography>
                        )}
                      </Typography>
                      {isDone && doneBy && (
                        <Typography variant="caption" color="text.secondary">
                          {doneBy}
                          {doneAt
                            ? ` · ${new Date(doneAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ── Approve Dialog ─────────────────────────────────────────────── */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Offer Letter</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {offer.currentApprovalStage === 'superAdmin'
              ? `Final approval. This will mark the offer as approved and email the candidate.`
              : `This will forward the offer to the next reviewer.`}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Approval Comments (optional)"
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="success"
            loading={actionLoading}
            onClick={handleApprove}
          >
            Confirm Approval
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Reject Dialog ──────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Offer Letter</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason so the HR team can make changes.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={actionLoading}
            onClick={handleReject}
          >
            Confirm Rejection
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Comment Dialog ─────────────────────────────────────────────── */}
      <Dialog open={commentOpen} onClose={() => setCommentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Modification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a comment requesting changes before approval.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Your Comments"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentOpen(false)}>Cancel</Button>
          <LoadingButton variant="contained" loading={actionLoading} onClick={handleComment}>
            Save Comment
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Send for Signing Dialog ────────────────────────────────────── */}
      <Dialog
        open={sendForSigningOpen}
        onClose={() => setSendForSigningOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set Up IOTA Signing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add the IOTA employees who must sign this offer letter. They will be emailed in order.
          </Typography>
          <Stack spacing={2}>
            {newIotaSignatories.map((s, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  label="Full Name"
                  value={s.name}
                  onChange={(e) =>
                    setNewIotaSignatories((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                    )
                  }
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label="Email"
                  value={s.email}
                  onChange={(e) =>
                    setNewIotaSignatories((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x))
                    )
                  }
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label="Title"
                  value={s.title}
                  onChange={(e) =>
                    setNewIotaSignatories((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                    )
                  }
                  sx={{ flex: 1.5 }}
                />
                {newIotaSignatories.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => setNewIotaSignatories((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Iconify icon="eva:close-fill" />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button
              size="small"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() =>
                setNewIotaSignatories((prev) => [...prev, { name: '', email: '', title: '' }])
              }
            >
              Add Signatory
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendForSigningOpen(false)}>Cancel</Button>
          <LoadingButton variant="contained" loading={actionLoading} onClick={handleSendForSigning}>
            Send for Signing
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
