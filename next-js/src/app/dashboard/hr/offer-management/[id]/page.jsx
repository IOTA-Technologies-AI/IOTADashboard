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
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { stampNdaPdf } from 'src/utils/nda-pdf';
import { stampForOffice, DEFAULT_IOTA_OFFICE } from 'src/utils/iota-offices';
import {
  getOffer,
  voidOffer,
  amendOffer,
  rejectOffer,
  approveOffer,
  resubmitOffer,
  iotaSignOffer,
  commentOnOffer,
  sendOfferForSigning,
  remindEmployeeToSign,
  createSignatureHandoff,
  requestOfferIotaResign,
  setOfferSignatureZones,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { useManagerApprovers } from 'src/actions/offer-settings';
import {
  base64ToBlobUrl,
  getOfferDocument,
  setOfferStampPlacements,
} from 'src/actions/offer-documents';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { NdaSignatureCanvas } from 'src/components/nda';
import { celebrate } from 'src/components/success-moment';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  LETTERS,
  mainLetterOf,
  OfferLetterPDF,
  offerSignatures,
  drawsSignatures,
  SigningLetterPDF,
  signingLettersOf,
  readingLettersOf,
} from 'src/components/offer-letter';

import { OfferQuestions } from 'src/sections/offer/offer-questions';
import { SignatureLog } from 'src/sections/signatures/signature-log';
import { SignatoryPicker } from 'src/sections/offer/signatory-picker';
import { OfferLetterCheck } from 'src/sections/offer/offer-letter-check';
import { fileSignedLetters } from 'src/sections/offer/file-signed-letters';
import { SignatoryThumbnail, ResignRequestDialog } from 'src/sections/signatures/signature-review';

import { useAuthContext } from 'src/auth/hooks';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  pending_iota_signatures: 'warning',
  pending_employee_signature: 'info',
  fully_signed: 'success',
  void: 'error',
};

const STATUS_LABEL = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_employee_signature: 'Pending Employee Signature',
  fully_signed: 'Fully Signed',
  archived: 'Archived',
  void: 'Void',
};

const STAGE_LABEL = {
  manager: 'Manager',
  admin: 'Admin or Super Admin',
};

const APPROVAL_CHAIN = ['manager', 'admin'];

const ACTION_LABEL = {
  sent_for_iota_signing: 'Sent for IOTA Signing',
  sent_to_employee: 'Sent to the Employee to Sign',
  filed_in_document_management: 'Filed in Document Management',
  iota_signed: 'IOTA Signed',
  employee_signed: 'Employee Signed',
  employee_reminder_sent: 'Employee Reminder Sent',
  pdf_uploaded_to_onedrive: 'PDF Uploaded to OneDrive',
  employee_email_verified: 'Employee verified their email',
  employee_question: 'Employee asked a question',
  iota_replied: 'IOTA replied',
  amendment_started: 'Amendment started',
  resubmitted_for_approval: 'Resubmitted for approval',
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
  // The generated letters the employee signs (HR ticks one or both when sending).
  // Send the other letter (the detailed GOSI letter) for the employee to read too.
  const [sendReading, setSendReading] = useState(true);
  // Which letter the preview shows.
  const [previewLetter, setPreviewLetter] = useState(null);
  const [newIotaSignatories, setNewIotaSignatories] = useState([
    { name: '', email: '', title: '' },
  ]);

  // IOTA signing
  const [signatureData, setSignatureData] = useState('');
  const [signatureMeta, setSignatureMeta] = useState(null); // how it was captured (pad → API)
  const [signing, setSigning] = useState(false);
  const [resignTarget, setResignTarget] = useState(null); // IOTA signatory being sent back

  // Signature zones
  const [signatureZones, setSignatureZones] = useState([]);
  // Company stamp placements (uploaded letters), and what a click places.
  const [stampPlacements, setStampPlacements] = useState([]);
  const [placeMode, setPlaceMode] = useState('signature'); // 'signature' | 'stamp'
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

  // Amendment: back to draft, edited, approved again
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amending, setAmending] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Void: withdrawn for good, with a reason; the employee can get a new offer
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const userEmail = user?.email || '';

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // The API re-checks the role (admin or super admin) and the status.
  const canAmend =
    isAdminOrSuperAdmin &&
    ['approved', 'rejected', 'pending_employee_signature'].includes(offer?.status) &&
    !offer?.employeeSignedAt;

  // Any offer short of fully signed; the API re-checks the role and the status.
  const canVoid =
    isAdminOrSuperAdmin &&
    !!offer?.status &&
    !['fully_signed', 'void', 'archived'].includes(offer.status);
  // Approval emails the candidate, so from then on they are told why.
  const voidEmailsCandidate = [
    'approved',
    'pending_employee_signature',
    'pending_iota_signatures',
  ].includes(offer?.status);

  // People on appConfig offers › managerApprovers can act at the manager stage too.
  // The API re-checks the stage and the caller.
  const { isApprover: isManagerApprover } = useManagerApprovers();
  const canAct =
    offer?.status === 'pending_approval' &&
    offer?.currentApprovalStage &&
    (offer.currentApprovalStage === user?.role ||
      (offer.currentApprovalStage === 'admin' && user?.role === 'superAdmin') ||
      (offer.currentApprovalStage === 'manager' && isManagerApprover));

  // A super admin can send an IOTA signature back until the employee has signed.
  // The API re-checks both the role and the state.
  const canSendSignatureBack =
    user?.role === 'superAdmin' &&
    (offer?.status === 'pending_iota_signatures' ||
      (offer?.status === 'pending_employee_signature' && !offer?.employeeSignedAt));

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

  const handleAmend = async () => {
    const reason = amendReason.trim();
    if (!reason) return;
    setAmending(true);
    try {
      await amendOffer(id, reason);
      toast.success('The offer is back in draft. Edit it, then submit it for approval again.');
      setAmendOpen(false);
      router.push(paths.dashboard.hr.offerManagement.edit(id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'The amendment could not be started.');
    } finally {
      setAmending(false);
    }
  };

  const handleVoid = async () => {
    const reason = voidReason.trim();
    if (!reason) return;
    setVoiding(true);
    try {
      setOffer(await voidOffer(id, reason));
      setVoidOpen(false);
      toast.success(
        voidEmailsCandidate
          ? 'Offer voided. The candidate has been emailed the reason.'
          : 'Offer voided. The employee can now be given a new offer.'
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || 'The offer could not be voided.');
    } finally {
      setVoiding(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      setOffer(await resubmitOffer(id));
      toast.success('Submitted for approval again.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'The offer could not be submitted.');
    } finally {
      setResubmitting(false);
    }
  };

  // Sync signature zones from offer
  useEffect(() => {
    if (offer?.signatureZones) setSignatureZones(offer.signatureZones);
  }, [offer?.signatureZones]);

  useEffect(() => {
    setStampPlacements(Array.isArray(offer?.stampPlacements) ? offer.stampPlacements : []);
  }, [offer?.stampPlacements]);

  const isUploaded = offer?.documentSource === 'uploaded';
  // Zones belong to the main letter (the one-page offer); the other letter is only read.
  const zonesOnPreview =
    isUploaded || (previewLetter || signingLettersOf(offer)[0]) === mainLetterOf(offer);

  // Generate PDF blob for zone preview — or, for an uploaded letter, the letter itself
  useEffect(() => {
    if (!offer) return undefined;
    let cancelled = false;
    const generate = async () => {
      if (offer.documentSource === 'uploaded') {
        if (!offer.sourceDocumentFileId) return;
        try {
          const { base64 } = await getOfferDocument(offer.id);
          if (!cancelled) setOfferPdfBlobUrl(base64ToBlobUrl(base64));
        } catch (e) {
          console.error('Loading the uploaded letter failed:', e);
        }
        return;
      }
      try {
        const letter = previewLetter || signingLettersOf(offer)[0];
        const blob = await pdf(
          <SigningLetterPDF
            offer={offer}
            letter={letter}
            signatures={drawsSignatures(offer, letter) ? offerSignatures(offer) : null}
          />
        ).toBlob();
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
  }, [offer?.id, offer?.sourceDocumentFileId, offer?.updatedAt, previewLetter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob URL on unmount
  useEffect(
    () => () => {
      if (offerPdfBlobUrl) URL.revokeObjectURL(offerPdfBlobUrl);
    },
    [offerPdfBlobUrl]
  );

  // Load pdfjs from blob URL
  useEffect(() => {
    if (!offerPdfBlobUrl) {
      setPdfJsDoc(null);
      return undefined;
    }
    let cancelled = false;
    let task = null;
    import('pdfjs-dist').then(async (pdfjsLib) => {
      if (cancelled) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      task = pdfjsLib.getDocument(offerPdfBlobUrl);
      try {
        const doc = await task.promise;
        if (!cancelled) setPdfJsDoc(doc);
      } catch (e) {
        if (!cancelled) console.error('pdfjs load error', e);
      }
    });
    return () => {
      cancelled = true;
      // Free this copy of the document; a new one is loaded for each change.
      if (task) {
        setPdfJsDoc(null);
        task.destroy();
      }
    };
  }, [offerPdfBlobUrl]);

  // Render sig zone preview canvas
  useEffect(() => {
    if (!pdfJsDoc || !sigZoneCanvasRef.current) return undefined;
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
      if (placeMode === 'stamp') {
        // Stamps are positioned by their centre.
        setStampPlacements((prev) => [
          ...prev,
          {
            id: `stamp-${Date.now()}`,
            page: sigZonePreviewPage,
            xPct: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
            yPct: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
            widthPct: 18,
          },
        ]);
        return;
      }
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
    [
      placeMode,
      sigZonePreviewPage,
      selectedSigZoneSignatory,
      selectedZoneIsEmployee,
      offer?.iotaSignatories,
    ]
  );

  // Sig zone drag
  useEffect(() => {
    if (!draggingSigZone) return undefined;
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
        celebrate({
          kind: 'sent',
          chip: 'Approved',
          documentId: offer?.contractNumber,
          title: 'Offer fully approved',
          description: 'The offer letter has been sent to the candidate.',
        });
      } else {
        toast.success('Approved and forwarded to next reviewer.');
      }
    } catch {
      toast.error('Failed to approve offer');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, approveComment, offer?.currentApprovalStage, offer?.contractNumber]);

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
    } catch {
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
    } catch {
      toast.error('Failed to save comment');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, reviewComment]);

  const handleSendForSigning = async () => {
    const valid = newIotaSignatories.filter((s) => s.name.trim() && s.email.trim());
    if (valid.length === 0) {
      toast.error('Choose who signs for IOTA.');
      return;
    }
    try {
      setActionLoading(true);
      const main = mainLetterOf(offer);
      const other = main === 'one_page' ? 'detailed' : 'one_page';
      const updated = await sendOfferForSigning(
        id,
        valid,
        userEmail,
        isUploaded ? undefined : [main],
        isUploaded ? undefined : sendReading ? [other] : []
      );
      setOffer(updated);
      setSendForSigningOpen(false);
      setNewIotaSignatories([{ name: '', email: '', title: '' }]);
      celebrate({
        kind: 'sent',
        chip: 'Sent for signature',
        documentId: offer?.contractNumber,
        title: `Offer sent to ${offer?.candidateName || 'the employee'}`,
        description: "They sign first; IOTA's signatories are emailed as soon as they have.",
      });
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
      const updated = await iotaSignOffer(id, signatureData, userEmail, '', signatureMeta || {});
      setOffer(updated);
      setSignatureData('');
      if (updated.status === 'fully_signed') {
        toast.success('Signed by everyone. Filing the letters in Document Management…');
        await handleFinalize(updated);
      } else if (updated.status === 'pending_employee_signature') {
        celebrate({
          kind: 'sent',
          chip: 'Sent for signature',
          documentId: offer?.contractNumber,
          title: `Offer sent to ${offer?.candidateName || 'the employee'}`,
          description: "Signing link emailed. You'll be notified when they sign.",
        });
      } else {
        toast.success('Your signature has been recorded.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit signature');
    } finally {
      setSigning(false);
    }
  };

  const handleRequestResign = async (reason) => {
    try {
      const updated = await requestOfferIotaResign(id, resignTarget.email, reason);
      setOffer(updated);
      toast.success(`${resignTarget.name || resignTarget.email} has been asked to sign again.`);
      setResignTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send the signature back');
    }
  };

  const handleSaveSignatureZones = async () => {
    try {
      setSigZoneSaving(true);
      const updated = await setOfferSignatureZones(id, signatureZones);
      if (isUploaded) await setOfferStampPlacements(id, stampPlacements);
      setOffer(updated);
      toast.success('Signature zones saved.');
    } catch {
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

  /** One signed letter (or the uploaded letter) as base64, with its signatures. */
  const buildProcessedPdf = async (letter, current = offer) => {
    let fileBase64;
    if (current.documentSource === 'uploaded') {
      fileBase64 = (await getOfferDocument(current.id)).base64;
    } else if (drawsSignatures(current, letter)) {
      // The letter draws its signatures into its own signature block.
      const blob = await pdf(
        <SigningLetterPDF offer={current} letter={letter} signatures={offerSignatures(current)} />
      ).toBlob();
      return uint8ToBase64(new Uint8Array(await blob.arrayBuffer()));
    } else {
      const blob = await pdf(<SigningLetterPDF offer={current} letter={letter} />).toBlob();
      fileBase64 = uint8ToBase64(new Uint8Array(await blob.arrayBuffer()));
    }
    const offer = current; // eslint-disable-line no-shadow

    // Signatures (with each signer's name and date) and stamps, through the
    // same code the NDAs use. The employee is the "partner" side.
    const allZones = Array.isArray(offer.signatureZones) ? offer.signatureZones : [];
    const stamps = Array.isArray(offer.stampPlacements) ? offer.stampPlacements : [];
    if (allZones.length > 0 || stamps.length > 0) {
      ({ base64: fileBase64 } = await stampNdaPdf({
        base64: fileBase64,
        nda: {
          iotaOffice: offer.iotaOffice || DEFAULT_IOTA_OFFICE,
          iotaSignatories: offer.iotaSignatories || [],
          partnerSignatories: [
            {
              name: offer.candidateName,
              email: offer.candidateEmail,
              signedAt: offer.employeeSignedAt,
              signatureData: offer.employeeSignatureData,
              signatureId: offer.employeeSignatureId,
            },
          ],
        },
        signatureZones: allZones.filter((z) => !z.isEmployee),
        partnerSignatureZones: allZones
          .filter((z) => z.isEmployee)
          .map((z) => ({ ...z, partnerSignatoryIndex: 0 })),
        stampPlacements: stamps,
      }));
    }
    return fileBase64;
  };

  /** The detailed letter, for GOSI records — not the one sent for signature. */
  const [downloadingGosi, setDownloadingGosi] = useState(false);
  const handleDownloadGosi = async () => {
    try {
      setDownloadingGosi(true);
      const blob = await pdf(<OfferLetterPDF offer={offer} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${offer.contractNumber}-${offer.candidateName.replace(/\s+/g, '_')}_GOSI.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate the detailed letter');
    } finally {
      setDownloadingGosi(false);
    }
  };

  const handleDownloadProcessed = async () => {
    try {
      setDownloadProcessing(true);
      const letters = isUploaded ? ['uploaded'] : signingLettersOf(offer);
      for (const letter of letters) {
        const fileBase64 = await buildProcessedPdf(letter);
        const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        const blobOut = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blobOut);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${offer.contractNumber}-${offer.candidateName.replace(/\s+/g, '_')}_${letter === 'detailed' ? 'Detailed_' : ''}Offer.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadProcessing(false);
    }
  };

  /**
   * File the signed letters in Document Management: each is stamped with its
   * classification and document ID, kept in OneDrive, and linked here.
   */
  const handleFinalize = async (current = offer) => {
    try {
      setDownloadProcessing(true);
      const letters =
        current.documentSource === 'uploaded' ? ['uploaded'] : signingLettersOf(current);
      const updated = await fileSignedLetters(current, letters, async (letter) => {
        const base64 = await buildProcessedPdf(letter, current);
        return new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
          type: 'application/pdf',
        });
      });
      setOffer(updated);
      celebrate({
        kind: 'signed',
        chip: 'Signed by all parties',
        documentId: offer?.contractNumber,
        title: letters.length > 1 ? 'Offer letters filed' : 'Offer letter filed',
        description: 'Stamped with its classification and document ID, and kept in OneDrive.',
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to finalize offer');
    } finally {
      setDownloadProcessing(false);
    }
  };

  // Opens this offer's letter (the PDF that is signed) on its own, to print from the PDF viewer.
  const handlePrint = () => {
    if (!offerPdfBlobUrl) {
      toast.info('The letter is still being prepared — try again in a moment.');
      return;
    }
    const printWindow = window.open(offerPdfBlobUrl, '_blank');
    if (!printWindow)
      toast.error('Popup blocked — please allow popups for this site and try again.');
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
                  setSendReading(true);
                  setSendForSigningOpen(true);
                }}
              >
                Send for Signing
              </Button>
            )}
            {canAmend && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Iconify icon="solar:pen-new-square-bold" />}
                onClick={() => {
                  setAmendReason('');
                  setAmendOpen(true);
                }}
              >
                Amend offer
              </Button>
            )}
            {canVoid && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Iconify icon="solar:close-circle-bold" />}
                onClick={() => {
                  setVoidReason('');
                  setVoidOpen(true);
                }}
              >
                Void offer
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
            {offer.letterTerms?.letterFormat === 'one_page' && (
              <Tooltip title="The full offer letter, for GOSI records. The one-page offer is what the employee signs.">
                <LoadingButton
                  variant="outlined"
                  color="inherit"
                  loading={downloadingGosi}
                  startIcon={<Iconify icon="solar:file-text-bold" />}
                  onClick={handleDownloadGosi}
                >
                  Detailed letter (GOSI)
                </LoadingButton>
              </Tooltip>
            )}
            {offer.status === 'fully_signed' && (
              <LoadingButton
                variant="contained"
                color="success"
                loading={downloadProcessing}
                startIcon={<Iconify icon="solar:cloud-upload-bold" />}
                onClick={() => handleFinalize()}
              >
                {offer.letterTerms?.signedDocuments?.length
                  ? 'File again'
                  : 'File in Document Management'}
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
                  : ['rejected', 'void'].includes(offer.status)
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
                {offer.status === 'void' && (
                  <Typography variant="body2">
                    Voided by <strong>{offer.voidedBy}</strong>
                    {offer.voidedAt
                      ? ` on ${new Date(offer.voidedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''}
                    : {offer.voidReason}
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

            {offer.status === 'draft' && (
              <Alert
                severity="warning"
                action={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      color="inherit"
                      variant="outlined"
                      onClick={() => router.push(paths.dashboard.hr.offerManagement.edit(id))}
                    >
                      Edit offer
                    </Button>
                    <LoadingButton
                      size="small"
                      color="inherit"
                      variant="contained"
                      loading={resubmitting}
                      onClick={handleResubmit}
                    >
                      Submit for approval
                    </LoadingButton>
                  </Stack>
                }
              >
                This offer is being amended. Edit it, then submit it for approval again.
              </Alert>
            )}

            {Object.keys(offer.letterTerms?.clauseOverrides || {}).length > 0 && (
              <Alert severity="warning" icon={<Iconify icon="solar:pen-new-square-bold" />}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  This offer changes the wording of the detailed letter
                </Typography>
                <Stack spacing={1.5}>
                  {Object.entries(offer.letterTerms.clauseOverrides)
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                    .map(([n, c]) => (
                      <Box key={n}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {n} {c.title}
                          {c.editedBy ? (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {' '}
                              · changed by {c.editedBy}
                            </Typography>
                          ) : null}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                          {c.text}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Alert>
            )}

            <OfferQuestions offer={offer} />

            {/* The signed letters in Document Management */}
            {offer.letterTerms?.signedDocuments?.length > 0 && (
              <Alert severity="success" icon={<Iconify icon="solar:shield-check-bold" />}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Signed letters filed in Document Management, stamped with their classification and
                  document ID.
                </Typography>
                <Stack spacing={1}>
                  {offer.letterTerms.signedDocuments.map((d) => (
                    <Stack
                      key={d.documentId}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      flexWrap="wrap"
                    >
                      <Typography variant="subtitle2">
                        {LETTERS[d.letter]?.label ?? 'Offer letter'}
                      </Typography>
                      <Chip size="small" label={d.documentId} sx={{ fontFamily: 'monospace' }} />
                      {d.webUrl && (
                        <Button
                          size="small"
                          variant="outlined"
                          href={d.webUrl}
                          target="_blank"
                          rel="noopener"
                        >
                          Open in OneDrive
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Alert>
            )}

            {/* OneDrive link (offers filed before Document Management) */}
            {offer.onedriveWebUrl && !offer.letterTerms?.signedDocuments?.length && (
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

            {isUploaded ? (
              <OfferLetterCheck offer={offer} onChange={() => getOffer(id).then(setOffer)} />
            ) : null}

            {/* Offer Letter Document Preview */}
            {isUploaded ? (
              <Card sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Uploaded Letter
                </Typography>
                {offerPdfBlobUrl ? (
                  <Box
                    component="iframe"
                    title="Offer letter"
                    src={offerPdfBlobUrl}
                    sx={{ width: 1, height: 900, border: 0, bgcolor: 'background.default' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {offer.sourceDocumentFileId ? 'Loading the letter…' : 'No letter uploaded yet.'}
                  </Typography>
                )}
              </Card>
            ) : (
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1">Document Preview</Typography>
                  <Tooltip title="The letter exactly as it will be signed. Print opens it on its own.">
                    <Iconify icon="solar:info-circle-bold" color="text.secondary" />
                  </Tooltip>
                  <Box sx={{ flexGrow: 1 }} />
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={previewLetter || signingLettersOf(offer)[0]}
                    onChange={(e, v) => v && setPreviewLetter(v)}
                  >
                    {(offer.status === 'approved' ||
                    offer.status === 'draft' ||
                    offer.status === 'pending_approval'
                      ? Object.keys(LETTERS)
                      : [...signingLettersOf(offer), ...readingLettersOf(offer)]
                    ).map((l) => (
                      <ToggleButton key={l} value={l}>
                        {LETTERS[l].short}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
                {offerPdfBlobUrl ? (
                  <Box
                    component="iframe"
                    title="Offer letter"
                    src={offerPdfBlobUrl}
                    sx={{ width: 1, height: 900, border: 0, borderRadius: 1 }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}
              </Card>
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
                <NdaSignatureCanvas
                  onSave={(data, meta) => {
                    setSignatureData(data);
                    setSignatureMeta(meta);
                  }}
                  phoneHandoff={{ create: () => createSignatureHandoff('offer', id) }}
                  label="Draw your signature"
                />
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
                      <SignatoryThumbnail
                        signatory={s}
                        canSendBack={canSendSignatureBack}
                        sendBackBlocked=""
                        onSendBack={() => setResignTarget(s)}
                      />
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

            {/* Signature zones go on the main letter only; the other is for reading. */}
            {(offer.status === 'pending_iota_signatures' || offer.status === 'approved') &&
              isAdminOrSuperAdmin &&
              !isUploaded &&
              !zonesOnPreview && (
                <Alert severity="info">
                  The {LETTERS[previewLetter]?.label.toLowerCase() ?? 'letter'} is for the employee
                  to read and is not signed. Switch to the{' '}
                  {LETTERS[mainLetterOf(offer)].label.toLowerCase()} to place signatures.
                </Alert>
              )}

            {/* Signature zones drag-to-place */}
            {(offer.status === 'pending_iota_signatures' || offer.status === 'approved') &&
              isAdminOrSuperAdmin &&
              zonesOnPreview &&
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
                      disabled={signatureZones.length === 0 && stampPlacements.length === 0}
                    >
                      {isUploaded ? 'Save Zones & Stamps' : 'Save Zones'}
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

                  {isUploaded ? (
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      <Chip
                        icon={<Iconify icon="solar:pen-bold" />}
                        label="Place signatures"
                        color={placeMode === 'signature' ? 'primary' : 'default'}
                        variant={placeMode === 'signature' ? 'filled' : 'outlined'}
                        onClick={() => setPlaceMode('signature')}
                      />
                      <Chip
                        icon={<Iconify icon="solar:verified-check-bold" />}
                        label="Place company stamp"
                        color={placeMode === 'stamp' ? 'primary' : 'default'}
                        variant={placeMode === 'stamp' ? 'filled' : 'outlined'}
                        onClick={() => setPlaceMode('stamp')}
                      />
                    </Stack>
                  ) : null}

                  {/* Signatory / employee selector */}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mb: 2,
                      ...(placeMode === 'stamp' ? { opacity: 0.4, pointerEvents: 'none' } : {}),
                    }}
                    flexWrap="wrap"
                  >
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
                    {stampPlacements
                      .filter((p) => (p.page || 1) === sigZonePreviewPage)
                      .map((p) => (
                        <Box
                          key={p.id}
                          sx={{
                            position: 'absolute',
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            width: `${p.widthPct}%`,
                            transform: 'translate(-50%, -50%)',
                            opacity: 0.85,
                          }}
                        >
                          <Box
                            component="img"
                            src={stampForOffice(offer?.iotaOffice || DEFAULT_IOTA_OFFICE)}
                            alt="Company stamp"
                            sx={{ width: '100%', display: 'block' }}
                          />
                          <IconButton
                            size="small"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setStampPlacements((prev) => prev.filter((x) => x.id !== p.id));
                            }}
                            sx={{
                              position: 'absolute',
                              top: -10,
                              right: -10,
                              bgcolor: 'background.paper',
                              boxShadow: 1,
                              width: 22,
                              height: 22,
                            }}
                          >
                            <Iconify icon="mingcute:close-line" width={14} />
                          </IconButton>
                        </Box>
                      ))}
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
                  {stampPlacements.length > 0 && (
                    <Button
                      size="small"
                      color="error"
                      sx={{ mt: 1, ml: 1 }}
                      onClick={() => setStampPlacements([])}
                    >
                      Clear Stamps
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

            {/* Signature Log — every signature with its ID, method and hash */}
            <SignatureLog
              entries={[
                ...iotaSignatories.map((s) => ({ ...s, side: 'IOTA' })),
                {
                  side: 'Employee',
                  name: offer.candidateName,
                  email: offer.candidateEmail,
                  signedAt: offer.employeeSignedAt,
                  signatureData: offer.employeeSignatureData,
                  signatureId: offer.employeeSignatureId,
                  signatureHash: offer.employeeSignatureHash,
                  signatureMethod: offer.employeeSignatureMethod,
                },
              ]}
            />

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
                } else if (stage === 'admin' && offer.approvedBy) {
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
      {/* Send an IOTA signature back (super admin) */}
      <ResignRequestDialog
        open={!!resignTarget}
        onClose={() => setResignTarget(null)}
        signatory={resignTarget}
        documentLabel="offer letter"
        downstreamNote={
          offer.status === 'pending_employee_signature'
            ? 'This offer has already gone to the employee. It returns to IOTA signing and their signing link stops working; a fresh link is emailed once all IOTA signatures are in again.'
            : ''
        }
        onSubmit={handleRequestResign}
      />

      {/* ── Amend Dialog ───────────────────────────────────────────────── */}
      <Dialog open={amendOpen} onClose={() => setAmendOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Amend offer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The offer goes back to draft and the candidate&apos;s signing link stops working. Once
            edited, it is approved again from the manager stage and sent to the candidate afresh.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for the amendment"
            value={amendReason}
            onChange={(e) => setAmendReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmendOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="warning"
            loading={amending}
            disabled={!amendReason.trim()}
            onClick={handleAmend}
          >
            Amend offer
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Void Dialog ────────────────────────────────────────────────── */}
      <Dialog open={voidOpen} onClose={() => setVoidOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Void offer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The offer is withdrawn for good and kept on record as Void. Its links stop working, and
            the employee appears again among onboarded employees, ready for a new offer.
            {offer.employeeSignedAt ? ' The candidate has signed it; that signature lapses.' : ''}
          </Typography>
          {voidEmailsCandidate ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {offer.candidateName} will be emailed this reason and told a new offer letter is on
              its way. Write it for them to read.
            </Alert>
          ) : null}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={voiding}
            disabled={voidReason.trim().length < 3}
            onClick={handleVoid}
          >
            Void offer
          </LoadingButton>
        </DialogActions>
      </Dialog>

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
        <DialogTitle>Send for Signing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {offer.candidateName || 'The employee'} is emailed first to sign. As soon as they have,
            IOTA&apos;s signatories below are emailed in order. Once everyone has signed, the
            letters are stamped and filed in Document Management.
          </Typography>
          {!isUploaded && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Letters
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                The employee signs the{' '}
                <strong>{LETTERS[mainLetterOf(offer)].label.toLowerCase()}</strong>.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sendReading}
                    onChange={(e) => setSendReading(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      Include the{' '}
                      {LETTERS[
                        mainLetterOf(offer) === 'one_page' ? 'detailed' : 'one_page'
                      ].label.toLowerCase()}{' '}
                      for them to read
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shown beside the letter they sign; it is not signed.
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Signing for IOTA
          </Typography>
          <SignatoryPicker value={newIotaSignatories} onChange={setNewIotaSignatories} />
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
