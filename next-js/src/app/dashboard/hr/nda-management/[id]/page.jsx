'use client';

import { pdf } from '@react-pdf/renderer';
import { use, useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import {
  getNda,
  cancelNda,
  updateNda,
  finalizeNda,
  iotaSignNda,
  setNdaSignatureZones,
  setNdaStampPlacements,
  submitNdaForIotaSigning,
  remindPartnerSignatories,
  uploadExternalNdaDocument,
  setNdaPartnerSignatureZones,
  markNdaFullyExecuted,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { NdaPdfDocument, NdaHtmlTemplate, NdaSignatureCanvas } from 'src/components/nda';

import { useAuthContext } from 'src/auth/hooks';
//End of Imports
// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  pending_iota_signatures: 'warning',
  pending_partner_signatures: 'info',
  fully_executed: 'success',
  expired: 'error',
  cancelled: 'error',
};

const STATUS_LABEL = {
  draft: 'Draft',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_partner_signatures: 'Pending Partner Signatures',
  fully_executed: 'Fully Executed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const ACTION_LABEL = {
  created: 'Created',
  submitted_for_iota_signing: 'Submitted for IOTA Signing',
  iota_signed: 'IOTA Signed',
  partner_signing_tokens_issued: 'Partner Signing Links Issued',
  partner_signed: 'Partner Signed',
  partner_reminder_sent: 'Partner Reminder Sent',
  document_uploaded: 'Document Uploaded',
  pdf_uploaded_to_onedrive: 'PDF Uploaded to OneDrive',
  cancelled: 'Cancelled',
};

const formatAction = (action) =>
  ACTION_LABEL[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const SECTION_META = [
  { key: 'definitions', label: '3. Definitions' },
  { key: 'obligations', label: '4. Obligations of the Receiving Party' },
  { key: 'exclusions', label: '5. Exclusions from Confidentiality' },
  { key: 'termDuration', label: '6. Term and Duration' },
  { key: 'returnDestruction', label: '7. Return or Destruction of Information' },
  { key: 'remedies', label: '8. Remedies' },
  { key: 'noLicense', label: '9. No License' },
  { key: 'generalProvisions', label: '10. General Provisions' },
];

const SECTION_DEFAULTS = {
  definitions: `"Confidential Information" means any information disclosed by one Party ("Disclosing Party") to the other ("Receiving Party"), directly or indirectly, in writing, orally, or by inspection of tangible objects, which is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes, without limitation: technical data, trade secrets, know-how, research, product plans, products, services, customer lists, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, business plans, financial data, pricing, and any other business information.

Confidential Information does not include information that (i) was already publicly known at the time of disclosure; (ii) becomes publicly known after disclosure through no fault of the Receiving Party; (iii) was already in the Receiving Party's possession free of restrictions prior to disclosure; or (iv) is independently developed by the Receiving Party without reference to the Confidential Information.`,

  obligations: `The Receiving Party agrees to:
1. Hold all Confidential Information in strict confidence and not disclose it to any third party without the prior written consent of the Disclosing Party.
2. Use the Confidential Information solely for the Purpose and for no other purpose whatsoever.
3. Limit access to the Confidential Information to its employees, contractors, and advisors who (a) have a need to know such information for the Purpose, and (b) are bound by confidentiality obligations no less restrictive than those herein.
4. Protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information, but no less than reasonable care.
5. Promptly notify the Disclosing Party in writing upon becoming aware of any unauthorized disclosure, misappropriation, or use of the Confidential Information.`,

  exclusions: `The obligations of confidentiality under this Agreement do not apply to information that the Receiving Party can demonstrate:
1. Was already known to the Receiving Party at the time of disclosure without restriction;
2. Is or becomes publicly available through no act or omission of the Receiving Party;
3. Is rightfully obtained from a third party without restriction and without breach of this Agreement;
4. Is required to be disclosed by applicable law, regulation, or court order, provided the Receiving Party gives the Disclosing Party prompt written notice prior to such disclosure and reasonably cooperates with any effort by the Disclosing Party to seek a protective order; or
5. Is independently developed by the Receiving Party without use of or reference to the Confidential Information.`,

  termDuration: `This Agreement shall commence on the Effective Date and remain in force for the duration specified on the cover page, unless earlier terminated by mutual written consent of the Parties. The obligations of confidentiality shall survive the expiration or termination of this Agreement for a further period of three (3) years.`,

  returnDestruction: `Upon written request by the Disclosing Party, or upon termination or expiration of this Agreement, the Receiving Party shall promptly return or, at the Disclosing Party's option, destroy all tangible materials embodying Confidential Information (in any form and including all copies and extracts). The Receiving Party shall certify in writing that it has complied with this obligation within ten (10) business days of such request.`,

  remedies: `The Parties acknowledge that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages would be an inadequate remedy. Accordingly, in addition to any other legal or equitable remedies that may be available, the Disclosing Party shall be entitled to seek injunctive or other equitable relief to prevent any actual or threatened breach of this Agreement, without the requirement of posting any bond or other security.`,

  noLicense: `Nothing in this Agreement shall be construed to grant either Party any right, title, interest, or license in or to the Confidential Information of the other Party, or any intellectual property rights therein. Any use of Confidential Information beyond the Purpose requires the prior written consent of the Disclosing Party.`,

  generalProvisions: `1. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of Riyadh, Saudi Arabia.
2. Entire Agreement. This Agreement constitutes the entire understanding between the Parties with respect to its subject matter and supersedes all prior negotiations, understandings, and agreements, whether written or oral.
3. Amendments. No amendment or modification of this Agreement shall be valid unless made in writing and signed by both Parties.
4. Severability. If any provision of this Agreement is found to be unenforceable, invalid, or illegal, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.
5. Waiver. Failure by either Party to enforce any provision of this Agreement shall not constitute a waiver of that Party's right to enforce such provision in the future.
6. Counterparts. This Agreement may be executed in counterparts, including electronic form, each of which shall be deemed an original and all of which together shall constitute one and the same instrument. Electronic signatures shall be deemed valid and binding.
7. Notices. All notices under this Agreement shall be in writing and delivered by email with acknowledgment of receipt to the representative signatories listed below.`,
};

function DetailRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function getDocumentExtension(fileName = '') {
  const normalized = String(fileName).toLowerCase().trim();
  const parts = normalized.split('.');
  return parts.length > 1 ? parts.at(-1) : '';
}

function isPdfDocument(fileName = '') {
  return getDocumentExtension(fileName) === 'pdf';
}

function isWordDocument(fileName = '') {
  const extension = getDocumentExtension(fileName);
  return extension === 'doc' || extension === 'docx';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NdaDetailsPage({ params }) {
  const { id } = use(params);
  const { user } = useAuthContext();
  const printRef = useRef(null);
  const docFileInputRef = useRef(null);

  const [nda, setNda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [clausesEditing, setClausesEditing] = useState(false);
  const [editedClauses, setEditedClauses] = useState([]);
  const [sectionEditDialog, setSectionEditDialog] = useState({ open: false, key: '', text: '' });
  const [stampPlacements, setStampPlacements] = useState([]);
  const [stampSaving, setStampSaving] = useState(false);
  const [stampPreviewPage, setStampPreviewPage] = useState(1);
  const [draggingStamp, setDraggingStamp] = useState(null);
  const [resizingStamp, setResizingStamp] = useState(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const stampPreviewRef = useRef(null);
  const stampCanvasRef = useRef(null);
  const [signatureZones, setSignatureZones] = useState([]);
  const [sigZoneSaving, setSigZoneSaving] = useState(false);
  const [sigZonePreviewPage, setSigZonePreviewPage] = useState(1);
  const [draggingSigZone, setDraggingSigZone] = useState(null);
  const sigZonePreviewRef = useRef(null);
  const sigZoneCanvasRef = useRef(null);
  const sigZoneDragMovedRef = useRef(false); // true when a drag move occurred — suppresses next click
  const [selectedSigZoneSignatory, setSelectedSigZoneSignatory] = useState(0); // index of IOTA signatory to assign to new zones

  // Partner signature zones state
  const [partnerSignatureZones, setPartnerSignatureZones] = useState([]);
  const [partnerSigZoneSaving, setPartnerSigZoneSaving] = useState(false);
  const [partnerSigZonePreviewPage, setPartnerSigZonePreviewPage] = useState(1);
  const [draggingPartnerSigZone, setDraggingPartnerSigZone] = useState(null);
  const [selectedPartnerSigZoneSignatory, setSelectedPartnerSigZoneSignatory] = useState(0);
  const [sigStampTab, setSigStampTab] = useState(0); // 0 = Signature Zones, 1 = Stamp Placement
  const partnerSigZonePreviewRef = useRef(null);
  const partnerSigZoneCanvasRef = useRef(null);
  const partnerSigZoneDragMovedRef = useRef(false);

  // Colors for signature zone overlays per signatory (up to 6)
  const SIG_ZONE_COLORS = [
    { border: '#1565c0', bg: 'rgba(21,101,192,0.12)' }, // blue
    { border: '#2e7d32', bg: 'rgba(46,125,50,0.12)' }, // green
    { border: '#6a1b9a', bg: 'rgba(106,27,154,0.12)' }, // purple
    { border: '#e65100', bg: 'rgba(230,81,0,0.12)' }, // orange
    { border: '#00838f', bg: 'rgba(0,131,143,0.12)' }, // teal
    { border: '#558b2f', bg: 'rgba(85,139,47,0.12)' }, // lime
  ];

  // Colors for partner signature zone overlays per signatory (warm palette)
  const PARTNER_SIG_ZONE_COLORS = [
    { border: '#b71c1c', bg: 'rgba(183,28,28,0.10)' }, // red
    { border: '#e65100', bg: 'rgba(230,81,0,0.10)' }, // deep-orange
    { border: '#827717', bg: 'rgba(130,119,23,0.10)' }, // yellow-dark
    { border: '#ad1457', bg: 'rgba(173,20,87,0.10)' }, // pink
    { border: '#4527a0', bg: 'rgba(69,39,160,0.10)' }, // deep-purple
    { border: '#00695c', bg: 'rgba(0,105,92,0.10)' }, // teal-green
  ];
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [downloadProcessing, setDownloadProcessing] = useState(false);
  const [remindPartnerLoading, setRemindPartnerLoading] = useState(false);
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [wetSigFile, setWetSigFile] = useState(null); // { name, base64 } for fully-executed upload
  const [wetSigLoading, setWetSigLoading] = useState(false);
  const wetSigInputRef = useRef(null);

  const userEmail = user?.email || '';
  const uploadedDocumentName = nda?.uploadedDocumentName || '';
  const isExternalUpload = nda?.documentSource === 'external_upload';
  const isUploadedPdf = isPdfDocument(uploadedDocumentName);
  const isUploadedWordDocument = isWordDocument(uploadedDocumentName);

  const pendingIotaSignature =
    nda?.status === 'pending_iota_signatures' &&
    Array.isArray(nda?.iotaSignatories) &&
    nda.iotaSignatories.some((s) => s.email === userEmail && !s.signedAt);

  const fetchNda = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNda(id);
      setNda(data);
    } catch (err) {
      console.error('Failed to fetch NDA:', err);
      toast.error('Failed to load NDA');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNda();
  }, [fetchNda]);

  useEffect(() => {
    if (nda?.stampPlacements) {
      setStampPlacements(nda.stampPlacements);
    }
  }, [nda?.stampPlacements]);

  useEffect(() => {
    if (nda?.signatureZones) setSignatureZones(nda.signatureZones);
  }, [nda?.signatureZones]);

  useEffect(() => {
    let url = null;
    if (nda?.uploadedDocumentBase64 && isUploadedPdf) {
      const bytes = Uint8Array.from(atob(nda.uploadedDocumentBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      url = URL.createObjectURL(blob);
      setDocBlobUrl(url);
    } else {
      setDocBlobUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [nda?.uploadedDocumentBase64, nda?.uploadedDocumentName, isUploadedPdf]);

  // Load pdfjs document whenever the blob URL changes
  useEffect(() => {
    let cancelled = false;
    if (!docBlobUrl) {
      setPdfJsDoc(null);
    } else {
      import('pdfjs-dist').then(async (pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        try {
          const doc = await pdfjsLib.getDocument(docBlobUrl).promise;
          if (!cancelled) setPdfJsDoc(doc);
        } catch (e) {
          console.error('pdfjs load error', e);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [docBlobUrl]);

  // Render stamp preview canvas whenever the page or loaded doc changes
  useEffect(() => {
    let cancelled = false;
    if (pdfJsDoc && stampCanvasRef.current) {
      const canvas = stampCanvasRef.current;
      const pageNum = Math.min(stampPreviewPage, pdfJsDoc.numPages);
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
    }
    return () => {
      cancelled = true;
    };
  }, [pdfJsDoc, stampPreviewPage]);

  // Render sig zone preview canvas whenever the page or loaded doc changes
  useEffect(() => {
    let cancelled = false;
    if (pdfJsDoc && sigZoneCanvasRef.current) {
      const canvas = sigZoneCanvasRef.current;
      const pageNum = Math.min(sigZonePreviewPage, pdfJsDoc.numPages);
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
    }
    return () => {
      cancelled = true;
    };
  }, [pdfJsDoc, sigZonePreviewPage]);

  // Load partnerSignatureZones from NDA data
  useEffect(() => {
    if (nda?.partnerSignatureZones) setPartnerSignatureZones(nda.partnerSignatureZones);
  }, [nda?.partnerSignatureZones]);

  // Render partner sig zone preview canvas
  useEffect(() => {
    let cancelled = false;
    if (pdfJsDoc && partnerSigZoneCanvasRef.current) {
      const canvas = partnerSigZoneCanvasRef.current;
      const pageNum = Math.min(partnerSigZonePreviewPage, pdfJsDoc.numPages);
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
    }
    return () => {
      cancelled = true;
    };
  }, [pdfJsDoc, partnerSigZonePreviewPage]);

  const handleSubmitForSigning = async () => {
    try {
      setActionLoading(true);
      const updated = await submitNdaForIotaSigning(id, userEmail);
      setNda(updated);
      toast.success('NDA submitted for IOTA signatures. Signatories have been emailed.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit for signing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemindPartner = async () => {
    try {
      setRemindPartnerLoading(true);
      const updated = await remindPartnerSignatories(id, userEmail);
      setNda(updated);
      toast.success('Reminder emails sent to unsigned partner signatories.');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send reminder');
    } finally {
      setRemindPartnerLoading(false);
    }
  };

  const handleWetSigFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setWetSigFile({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleMarkFullyExecuted = async () => {
    try {
      setWetSigLoading(true);
      const updated = await markNdaFullyExecuted(
        id,
        userEmail,
        wetSigFile?.name,
        wetSigFile?.base64
      );
      setNda(updated);
      setWetSigFile(null);
      toast.success(
        wetSigFile
          ? 'NDA marked as Fully Executed and document uploaded to OneDrive.'
          : 'NDA marked as Fully Executed.'
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to mark as fully executed'
      );
    } finally {
      setWetSigLoading(false);
    }
  };

  const handleIotaSign = async () => {
    if (!signatureData) {
      toast.error('Please draw your signature first');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await iotaSignNda(id, signatureData, userEmail);
      setNda(updated);
      setSignatureData('');
      if (updated.status === 'pending_partner_signatures') {
        toast.success('All IOTA signatures collected. Partner signatories have been emailed.');
      } else {
        toast.success('Your signature has been recorded.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit signature');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    // Chunked btoa to avoid call-stack overflow on large PDFs
    const uint8ToBase64 = (bytes) => {
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    };

    try {
      setActionLoading(true);

      const latestNda = await getNda(id);
      setNda(latestNda);

      const latestUploadedDocumentName = latestNda.uploadedDocumentName || '';
      const latestIsUploadedPdfDoc = isPdfDocument(latestUploadedDocumentName);
      const sourceStampPlacements = Array.isArray(latestNda.stampPlacements)
        ? latestNda.stampPlacements
        : [];
      const sourceSignatureZones = Array.isArray(latestNda.signatureZones)
        ? latestNda.signatureZones
        : [];
      const sourcePartnerSignatureZones = Array.isArray(latestNda.partnerSignatureZones)
        ? latestNda.partnerSignatureZones
        : [];

      const allIotaSigned =
        !Array.isArray(latestNda.iotaSignatories) ||
        latestNda.iotaSignatories.every((signatory) => !!signatory.signedAt);
      const allPartnerSigned =
        !Array.isArray(latestNda.partnerSignatories) ||
        latestNda.partnerSignatories.every((signatory) => !!signatory.signedAt);

      if (!allIotaSigned || !allPartnerSigned) {
        toast.error('All signatories must sign before the NDA can be finalized.');
        return;
      }

      if (latestNda.documentSource === 'external_upload' && !latestIsUploadedPdfDoc) {
        toast.error(
          'Word documents (DOC/DOCX) must be converted to PDF before finalization so signatures and stamps can be embedded.'
        );
        return;
      }

      let fileBase64;
      const docIsExternalUpload = latestNda.documentSource === 'external_upload';

      if (docIsExternalUpload) {
        if (!latestNda.uploadedDocumentBase64) {
          toast.error('No document uploaded. Please upload the partner document first.');
          return;
        }
        fileBase64 = latestNda.uploadedDocumentBase64;
      } else {
        // Generate PDF from react-pdf template
        const blob = await pdf(<NdaPdfDocument nda={latestNda} />).toBlob();
        const arrayBuffer = await blob.arrayBuffer();
        fileBase64 = uint8ToBase64(new Uint8Array(arrayBuffer));
      }

      // Apply IOTA signature zones, partner signature zones + stamp placements when the document is a PDF
      const isPdf = !docIsExternalUpload || latestIsUploadedPdfDoc;
      if (
        isPdf &&
        (sourceStampPlacements.length > 0 ||
          sourceSignatureZones.length > 0 ||
          sourcePartnerSignatureZones.length > 0)
      ) {
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Embed IOTA signature zones first
        if (sourceSignatureZones.length > 0) {
          const signatories = Array.isArray(latestNda?.iotaSignatories)
            ? latestNda.iotaSignatories
            : [];
          for (const zone of sourceSignatureZones) {
            const pageIdx = Math.max(0, (zone.page || 1) - 1);
            const page = pages[pageIdx];
            if (!page) continue;
            const { width: pw, height: ph } = page.getSize();
            const zoneX = (zone.xPct / 100) * pw;
            const zoneY = ph - (zone.yPct / 100) * ph;
            const zoneW = (zone.widthPct / 100) * pw;
            const zoneH = (zone.heightPct / 100) * ph;

            const signatoryIdx = zone.iotaSignatoryIndex ?? 0;
            const signatory = signatories[signatoryIdx];
            const sigData = signatory?.signatureData || null;

            if (sigData && sigData.startsWith('data:image')) {
              try {
                const base64 = sigData.split(',')[1];
                const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const sigImage = sigData.includes('image/png')
                  ? await pdfDoc.embedPng(sigBytes)
                  : await pdfDoc.embedJpg(sigBytes);
                page.drawImage(sigImage, {
                  x: zoneX,
                  y: zoneY - zoneH,
                  width: zoneW,
                  height: zoneH,
                  opacity: 1,
                });
              } catch (embedErr) {
                throw new Error(
                  `Failed to embed IOTA signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
                );
              }
            } else {
              throw new Error(
                `Missing signature data for IOTA signatory ${signatory?.email || 'unknown signatory'}.`
              );
            }
          }
        }

        // Embed partner signature zones
        if (sourcePartnerSignatureZones.length > 0) {
          const partnerSignatories = Array.isArray(latestNda?.partnerSignatories)
            ? latestNda.partnerSignatories
            : [];
          for (const zone of sourcePartnerSignatureZones) {
            const pageIdx = Math.max(0, (zone.page || 1) - 1);
            const page = pages[pageIdx];
            if (!page) continue;
            const { width: pw, height: ph } = page.getSize();
            const zoneX = (zone.xPct / 100) * pw;
            const zoneY = ph - (zone.yPct / 100) * ph;
            const zoneW = (zone.widthPct / 100) * pw;
            const zoneH = (zone.heightPct / 100) * ph;
            const signatory = partnerSignatories[zone.partnerSignatoryIndex ?? 0];
            const sigData = signatory?.signatureData || null;
            if (sigData && sigData.startsWith('data:image')) {
              try {
                const base64 = sigData.split(',')[1];
                const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const sigImage = sigData.includes('image/png')
                  ? await pdfDoc.embedPng(sigBytes)
                  : await pdfDoc.embedJpg(sigBytes);
                page.drawImage(sigImage, {
                  x: zoneX,
                  y: zoneY - zoneH,
                  width: zoneW,
                  height: zoneH,
                  opacity: 1,
                });
              } catch (embedErr) {
                throw new Error(
                  `Failed to embed partner signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
                );
              }
            } else {
              throw new Error(
                `Missing signature data for partner signatory ${signatory?.email || 'unknown signatory'}.`
              );
            }
          }
        }

        // Embed IOTA stamp
        if (sourceStampPlacements.length > 0) {
          const stampRes = await fetch('/logo/iota-stamp.png');
          if (stampRes.ok) {
            const stampArrayBuffer = await stampRes.arrayBuffer();
            const stampImage = await pdfDoc.embedPng(new Uint8Array(stampArrayBuffer));
            for (const placement of sourceStampPlacements) {
              const pageIdx = Math.max(0, (placement.page || 1) - 1);
              const page = pages[pageIdx];
              if (!page) continue;
              const { width: pw, height: ph } = page.getSize();
              const stampW = (placement.widthPct / 100) * pw;
              const stampH = stampW * (stampImage.height / stampImage.width);
              page.drawImage(stampImage, {
                x: (placement.xPct / 100) * pw - stampW / 2,
                y: ph - (placement.yPct / 100) * ph - stampH / 2,
                width: stampW,
                height: stampH,
                opacity: 0.85,
              });
            }
          }
        }

        const saved = await pdfDoc.save();
        fileBase64 = uint8ToBase64(saved);
      }

      const updated = await finalizeNda(id, fileBase64);
      setNda(updated);
      toast.success('NDA finalized and uploaded to OneDrive.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize NDA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const updated = await cancelNda(id, userEmail, cancelReason);
      setNda(updated);
      setCancelDialogOpen(false);
      setCancelReason('');
      toast.success('NDA cancelled.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel NDA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveClauses = async () => {
    try {
      setActionLoading(true);
      const updated = await updateNda(id, { clauses: editedClauses });
      setNda(updated);
      setClausesEditing(false);
      toast.success('Clauses saved.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save clauses');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSectionOverride = async (key, text) => {
    try {
      setActionLoading(true);
      const updated = await updateNda(id, {
        sectionOverrides: { ...(nda.sectionOverrides || {}), [key]: text || null },
      });
      setNda(updated);
      setSectionEditDialog({ open: false, key: '', text: '' });
      toast.success('Section updated.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update section');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    const isExternalPdf =
      nda.documentSource === 'external_upload' &&
      isPdfDocument(nda.uploadedDocumentName) &&
      nda.uploadedDocumentBase64;

    if (nda.documentSource === 'external_upload' && !isPdfDocument(nda.uploadedDocumentName)) {
      toast.error(
        'Word documents cannot be printed as embedded PDFs. Download the original file instead.'
      );
      return;
    }

    if (isExternalPdf) {
      // For external PDFs: embed current stamps + sig zones inline, open in new tab and print
      const uint8ToBase64 = (bytes) => {
        let binary = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
      };
      try {
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = Uint8Array.from(atob(nda.uploadedDocumentBase64), (c) => c.charCodeAt(0));
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Embed signature zones (with actual sig data if available)
        const signatories = Array.isArray(nda?.iotaSignatories) ? nda.iotaSignatories : [];
        for (const zone of signatureZones) {
          const pageIdx = Math.max(0, (zone.page || 1) - 1);
          const page = pages[pageIdx];
          if (!page) continue;
          const { width: pw, height: ph } = page.getSize();
          const zoneX = (zone.xPct / 100) * pw;
          const zoneY = ph - (zone.yPct / 100) * ph;
          const zoneW = (zone.widthPct / 100) * pw;
          const zoneH = (zone.heightPct / 100) * ph;
          const signatory = signatories[zone.iotaSignatoryIndex ?? 0];
          const sigData = signatory?.signatureData || null;
          if (sigData && sigData.startsWith('data:image')) {
            try {
              const base64 = sigData.split(',')[1];
              const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
              const sigImage = sigData.includes('image/png')
                ? await pdfDoc.embedPng(sigBytes)
                : await pdfDoc.embedJpg(sigBytes);
              page.drawImage(sigImage, {
                x: zoneX,
                y: zoneY - zoneH,
                width: zoneW,
                height: zoneH,
                opacity: 1,
              });
            } catch (embedErr) {
              throw new Error(
                `Failed to embed IOTA signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
              );
            }
          } else {
            throw new Error(
              `Missing signature data for IOTA signatory ${signatory?.email || 'unknown signatory'}.`
            );
          }
        }

        // Embed stamp placements
        if (stampPlacements.length > 0) {
          const stampRes = await fetch('/logo/iota-stamp.png');
          if (stampRes.ok) {
            const stampImage = await pdfDoc.embedPng(new Uint8Array(await stampRes.arrayBuffer()));
            for (const placement of stampPlacements) {
              const pageIdx = Math.max(0, (placement.page || 1) - 1);
              const page = pages[pageIdx];
              if (!page) continue;
              const { width: pw, height: ph } = page.getSize();
              const stampW = (placement.widthPct / 100) * pw;
              const stampH = stampW * (stampImage.height / stampImage.width);
              page.drawImage(stampImage, {
                x: (placement.xPct / 100) * pw - stampW / 2,
                y: ph - (placement.yPct / 100) * ph - stampH / 2,
                width: stampW,
                height: stampH,
                opacity: 0.85,
              });
            }
          }
        }

        // Embed partner signature zones
        if (partnerSignatureZones.length > 0) {
          const partnerSignatories = Array.isArray(nda?.partnerSignatories)
            ? nda.partnerSignatories
            : [];
          for (const zone of partnerSignatureZones) {
            const pageIdx = Math.max(0, (zone.page || 1) - 1);
            const page = pages[pageIdx];
            if (!page) continue;
            const { width: pw, height: ph } = page.getSize();
            const zoneX = (zone.xPct / 100) * pw;
            const zoneY = ph - (zone.yPct / 100) * ph;
            const zoneW = (zone.widthPct / 100) * pw;
            const zoneH = (zone.heightPct / 100) * ph;
            const signatory = partnerSignatories[zone.partnerSignatoryIndex ?? 0];
            const sigData = signatory?.signatureData || null;
            if (sigData && sigData.startsWith('data:image')) {
              try {
                const base64 = sigData.split(',')[1];
                const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                const sigImage = sigData.includes('image/png')
                  ? await pdfDoc.embedPng(sigBytes)
                  : await pdfDoc.embedJpg(sigBytes);
                page.drawImage(sigImage, {
                  x: zoneX,
                  y: zoneY - zoneH,
                  width: zoneW,
                  height: zoneH,
                  opacity: 1,
                });
              } catch (embedErr) {
                throw new Error(
                  `Failed to embed partner signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
                );
              }
            } else {
              throw new Error(
                `Missing signature data for partner signatory ${signatory?.email || 'unknown signatory'}.`
              );
            }
          }
        }

        const processed = uint8ToBase64(await pdfDoc.save());
        const bytes = Uint8Array.from(atob(processed), (c) => c.charCodeAt(0));
        const blob = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        // Open the processed PDF in a new tab — the browser PDF viewer has its own
        // print button. Calling window.print() programmatically on a native PDF viewer
        // window is unreliable across browsers and produces blank pages.
        window.open(blob, '_blank');
        // Revoke after a generous delay so the tab has time to receive the blob data
        setTimeout(() => URL.revokeObjectURL(blob), 60000);
      } catch (err) {
        console.error('Print failed', err);
        toast.error('Failed to prepare document for printing');
      }
      return;
    }

    // IOTA-generated NDA: print the HTML render
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Popup blocked — please allow popups for this site and try again.');
      return;
    }
    // Write content with an inline script so print() fires reliably after the
    // document finishes loading (setting printWindow.onload after document.close()
    // is too late — the load event may already have fired).
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${nda?.ndaNumber || 'NDA'}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #000; background: #fff; }
      @page { size: A4; margin: 20mm 18mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    ${content.innerHTML}
    <script>
      window.addEventListener('load', function () {
        window.print();
        window.addEventListener('afterprint', function () { window.close(); });
      });
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };
  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, DOCX and DOC files are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setDocUploading(true);
        const base64 = reader.result.split(',')[1];
        const updated = await uploadExternalNdaDocument(id, file.name, base64);
        setNda(updated);
        toast.success('Document uploaded successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload document');
      } finally {
        setDocUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drop a new stamp onto the preview canvas
  const handleStampPreviewClick = (e) => {
    if (!isDraft) return;
    const container = stampPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100 * 10) / 10;
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100 * 10) / 10;
    setStampPlacements((prev) => [
      ...prev,
      { id: crypto.randomUUID(), page: stampPreviewPage, xPct, yPct, widthPct: 15 },
    ]);
  };

  // Document-level drag for stamp (fixes onMouseLeave early-cancel on fast movement)
  useEffect(() => {
    if (!draggingStamp) return undefined;
    const handleMove = (e) => {
      const container = stampPreviewRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10)
      );
      const yPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10)
      );
      setStampPlacements((prev) =>
        prev.map((p) => (p.id === draggingStamp ? { ...p, xPct, yPct } : p))
      );
    };
    const handleUp = () => setDraggingStamp(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [draggingStamp]);

  // Document-level drag for stamp resize
  useEffect(() => {
    if (!resizingStamp) return undefined;
    const handleMove = (e) => {
      const container = stampPreviewRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const deltaX = currentX - resizeStartX;
      const containerWidth = rect.width;
      const deltaWidthPct = (deltaX / containerWidth) * 100;
      const newWidthPct = Math.max(5, Math.min(50, resizeStartWidth + deltaWidthPct));
      setStampPlacements((prev) =>
        prev.map((p) => (p.id === resizingStamp ? { ...p, widthPct: newWidthPct } : p))
      );
    };
    const handleUp = () => setResizingStamp(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [resizingStamp, resizeStartWidth, resizeStartX]);

  // Document-level drag for signature zones
  useEffect(() => {
    if (!draggingSigZone) return undefined;
    const handleMove = (e) => {
      const container = sigZonePreviewRef.current;
      if (!container) return;
      sigZoneDragMovedRef.current = true; // mark that actual movement happened
      const rect = container.getBoundingClientRect();
      const xPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10)
      );
      const yPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10)
      );
      setSignatureZones((prev) =>
        prev.map((z) => (z.id === draggingSigZone ? { ...z, xPct, yPct } : z))
      );
    };
    const handleUp = () => setDraggingSigZone(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [draggingSigZone]);

  // Document-level drag for partner signature zones
  useEffect(() => {
    if (!draggingPartnerSigZone) return undefined;
    const handleMove = (e) => {
      const container = partnerSigZonePreviewRef.current;
      if (!container) return;
      partnerSigZoneDragMovedRef.current = true;
      const rect = container.getBoundingClientRect();
      const xPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10)
      );
      const yPct = Math.min(
        100,
        Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10)
      );
      setPartnerSignatureZones((prev) =>
        prev.map((z) => (z.id === draggingPartnerSigZone ? { ...z, xPct, yPct } : z))
      );
    };
    const handleUp = () => setDraggingPartnerSigZone(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [draggingPartnerSigZone]);

  const handleSaveStampPlacements = async () => {
    try {
      setStampSaving(true);
      const updated = await setNdaStampPlacements(id, stampPlacements);
      setNda(updated);
      toast.success('Stamp placements saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save stamp placements');
    } finally {
      setStampSaving(false);
    }
  };

  // Click on sig zone preview to place a new zone
  const handleSigZonePreviewClick = (e) => {
    if (!isDraft) return;
    // Suppress click that is the tail end of a drag operation
    if (sigZoneDragMovedRef.current) {
      sigZoneDragMovedRef.current = false;
      return;
    }
    const container = sigZonePreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setSignatureZones((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        page: sigZonePreviewPage,
        xPct,
        yPct,
        widthPct: 25,
        heightPct: 8,
        iotaSignatoryIndex: selectedSigZoneSignatory,
        label: null,
      },
    ]);
  };

  const handleSaveSignatureZones = async () => {
    try {
      setSigZoneSaving(true);
      const updated = await setNdaSignatureZones(id, signatureZones);
      setNda(updated);
      toast.success('Signature zones saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save signature zones');
    } finally {
      setSigZoneSaving(false);
    }
  };

  const handlePartnerSigZonePreviewClick = (e) => {
    if (!isDraft) return;
    if (partnerSigZoneDragMovedRef.current) {
      partnerSigZoneDragMovedRef.current = false;
      return;
    }
    const container = partnerSigZonePreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setPartnerSignatureZones((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        page: partnerSigZonePreviewPage,
        xPct,
        yPct,
        widthPct: 25,
        heightPct: 8,
        partnerSignatoryIndex: selectedPartnerSigZoneSignatory,
        label: null,
      },
    ]);
  };

  const handleSavePartnerSignatureZones = async () => {
    try {
      setPartnerSigZoneSaving(true);
      const updated = await setNdaPartnerSignatureZones(id, partnerSignatureZones);
      setNda(updated);
      toast.success('Partner signature zones saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save partner signature zones');
    } finally {
      setPartnerSigZoneSaving(false);
    }
  };

  // Download the uploaded document with stamps + signature zones embedded
  const handleDownloadProcessed = async () => {
    const uint8ToBase64 = (bytes) => {
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    };

    if (!nda.uploadedDocumentBase64) {
      toast.error('No document available to download.');
      return;
    }

    const hasOverlays =
      stampPlacements.length > 0 || signatureZones.length > 0 || partnerSignatureZones.length > 0;

    if (nda.documentSource === 'external_upload' && !isUploadedPdf && hasOverlays) {
      toast.error('Word documents cannot be processed with embedded stamps or signatures.');
      return;
    }

    if (!isUploadedPdf || !hasOverlays) {
      // No processing needed — just download the raw file
      const a = document.createElement('a');
      a.href = `data:application/octet-stream;base64,${nda.uploadedDocumentBase64}`;
      a.download = nda.uploadedDocumentName;
      a.click();
      return;
    }

    try {
      setDownloadProcessing(true);
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = Uint8Array.from(atob(nda.uploadedDocumentBase64), (c) => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Embed IOTA signature zones
      if (signatureZones.length > 0) {
        const signatories = Array.isArray(nda?.iotaSignatories) ? nda.iotaSignatories : [];
        for (const zone of signatureZones) {
          const pageIdx = Math.max(0, (zone.page || 1) - 1);
          const page = pages[pageIdx];
          if (!page) continue;
          const { width: pw, height: ph } = page.getSize();
          const zoneX = (zone.xPct / 100) * pw;
          const zoneY = ph - (zone.yPct / 100) * ph;
          const zoneW = (zone.widthPct / 100) * pw;
          const zoneH = (zone.heightPct / 100) * ph;
          const signatory = signatories[zone.iotaSignatoryIndex ?? 0];
          const sigData = signatory?.signatureData || null;
          if (sigData && sigData.startsWith('data:image')) {
            try {
              const base64 = sigData.split(',')[1];
              const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
              const sigImage = sigData.includes('image/png')
                ? await pdfDoc.embedPng(sigBytes)
                : await pdfDoc.embedJpg(sigBytes);
              page.drawImage(sigImage, {
                x: zoneX,
                y: zoneY - zoneH,
                width: zoneW,
                height: zoneH,
                opacity: 1,
              });
            } catch (embedErr) {
              throw new Error(
                `Failed to embed IOTA signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
              );
            }
          } else {
            throw new Error(
              `Missing signature data for IOTA signatory ${signatory?.email || 'unknown signatory'}.`
            );
          }
        }
      }

      // Embed partner signature zones
      if (partnerSignatureZones.length > 0) {
        const partnerSignatories = Array.isArray(nda?.partnerSignatories)
          ? nda.partnerSignatories
          : [];
        for (const zone of partnerSignatureZones) {
          const pageIdx = Math.max(0, (zone.page || 1) - 1);
          const page = pages[pageIdx];
          if (!page) continue;
          const { width: pw, height: ph } = page.getSize();
          const zoneX = (zone.xPct / 100) * pw;
          const zoneY = ph - (zone.yPct / 100) * ph;
          const zoneW = (zone.widthPct / 100) * pw;
          const zoneH = (zone.heightPct / 100) * ph;
          const signatory = partnerSignatories[zone.partnerSignatoryIndex ?? 0];
          const sigData = signatory?.signatureData || null;
          if (sigData && sigData.startsWith('data:image')) {
            try {
              const base64 = sigData.split(',')[1];
              const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
              const sigImage = sigData.includes('image/png')
                ? await pdfDoc.embedPng(sigBytes)
                : await pdfDoc.embedJpg(sigBytes);
              page.drawImage(sigImage, {
                x: zoneX,
                y: zoneY - zoneH,
                width: zoneW,
                height: zoneH,
                opacity: 1,
              });
            } catch (embedErr) {
              throw new Error(
                `Failed to embed partner signature for ${signatory?.email || 'unknown signatory'}: ${embedErr?.message || embedErr}`
              );
            }
          } else {
            throw new Error(
              `Missing signature data for partner signatory ${signatory?.email || 'unknown signatory'}.`
            );
          }
        }
      }

      // Embed IOTA stamp
      if (stampPlacements.length > 0) {
        const stampRes = await fetch('/logo/iota-stamp.png');
        if (stampRes.ok) {
          const stampImage = await pdfDoc.embedPng(new Uint8Array(await stampRes.arrayBuffer()));
          for (const placement of stampPlacements) {
            const pageIdx = Math.max(0, (placement.page || 1) - 1);
            const page = pages[pageIdx];
            if (!page) continue;
            const { width: pw, height: ph } = page.getSize();
            const stampW = (placement.widthPct / 100) * pw;
            const stampH = stampW * (stampImage.height / stampImage.width);
            page.drawImage(stampImage, {
              x: (placement.xPct / 100) * pw - stampW / 2,
              y: ph - (placement.yPct / 100) * ph - stampH / 2,
              width: stampW,
              height: stampH,
              opacity: 0.85,
            });
          }
        }
      }

      const processed = uint8ToBase64(await pdfDoc.save());
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${processed}`;
      a.download = nda.uploadedDocumentName;
      a.click();
    } catch (err) {
      console.error(err);
      toast.error('Failed to process document for download');
    } finally {
      setDownloadProcessing(false);
    }
  };
  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!nda) {
    return (
      <DashboardContent>
        <Alert severity="error">NDA not found.</Alert>
      </DashboardContent>
    );
  }

  const isDraft = nda.status === 'draft';
  const isPendingIota = nda.status === 'pending_iota_signatures';
  const isPendingPartner = nda.status === 'pending_partner_signatures';
  const isFullyExecuted = nda.status === 'fully_executed';
  const isCancellable = ['draft', 'pending_iota_signatures', 'pending_partner_signatures'].includes(
    nda.status
  );

  return (
    <DashboardContent>
      {/* ── Breadcrumbs ── */}
      <CustomBreadcrumbs
        heading={nda.ndaNumber}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'NDA Management', href: paths.dashboard.hr.ndaManagement.root },
          { name: nda.ndaNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
              onClick={handlePrint}
            >
              Print
            </Button>
            {isCancellable && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Iconify icon="solar:close-circle-bold" />}
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel NDA
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* ── Left col: summary + actions ── */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Status card */}
            <Card sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Agreement Details</Typography>
                <Chip
                  label={STATUS_LABEL[nda.status]}
                  color={STATUS_COLOR[nda.status]}
                  size="small"
                />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={0.5}>
                <DetailRow label="NDA Number" value={nda.ndaNumber} />
                <DetailRow label="Title" value={nda.title} />
                <DetailRow label="Partner Company" value={nda.partnerCompanyName} />
                {nda.partnerAddress && (
                  <DetailRow label="Partner Address" value={nda.partnerAddress} />
                )}
                <DetailRow
                  label="Effective Date"
                  value={nda.effectiveDate ? new Date(nda.effectiveDate).toLocaleDateString() : '—'}
                />
                <DetailRow
                  label="Expiry Date"
                  value={
                    nda.isPerpetual
                      ? 'Perpetual'
                      : nda.expiryDate
                        ? new Date(nda.expiryDate).toLocaleDateString()
                        : '—'
                  }
                />
                <DetailRow
                  label="Duration"
                  value={nda.isPerpetual ? 'Perpetual' : `${nda.durationYears} year(s)`}
                />
                <DetailRow label="Created By" value={nda.createdBy} />
                <DetailRow
                  label="Document Type"
                  value={
                    nda.documentSource === 'external_upload'
                      ? 'External Upload'
                      : 'Generated Template'
                  }
                />
                <DetailRow
                  label="Partner Signing"
                  value={
                    nda.partnerSigningMethod === 'manual'
                      ? 'Manual (Wet Signature)'
                      : 'Digital (Email Link)'
                  }
                />
                {nda.onedriveWebUrl && (
                  <Box sx={{ pt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="logos:microsoft-onedrive" />}
                      href={nda.onedriveWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on OneDrive
                    </Button>
                  </Box>
                )}
              </Stack>
            </Card>

            {/* IOTA Signatories */}
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                IOTA Signatories
              </Typography>
              <Stack spacing={1.5}>
                {(nda.iotaSignatories || []).map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify
                      icon={s.signedAt ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'}
                      color={s.signedAt ? 'success.main' : 'text.disabled'}
                      width={18}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.jobTitle} · {s.email}
                      </Typography>
                      {s.signedAt && (
                        <Typography variant="caption" color="success.main" display="block">
                          Signed {new Date(s.signedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Card>

            {/* Partner Signatories */}
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Partner Signatories
              </Typography>
              <Stack spacing={1.5}>
                {(nda.partnerSignatories || []).map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify
                      icon={s.signedAt ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'}
                      color={s.signedAt ? 'success.main' : 'text.disabled'}
                      width={18}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.jobTitle} · {s.email}
                      </Typography>
                      {s.signedAt && (
                        <Typography variant="caption" color="success.main" display="block">
                          Signed {new Date(s.signedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Card>

            {/* Action buttons */}
            {(isDraft || isPendingIota || isPendingPartner) && (
              <Card sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {isDraft && 'NDA is in draft. Use the action panel → to submit for signing.'}
                  {isPendingIota && 'Waiting for IOTA signatories to sign.'}
                  {isPendingPartner &&
                    nda.partnerSigningMethod !== 'manual' &&
                    'Waiting for partner signatories to sign.'}
                  {isPendingPartner &&
                    nda.partnerSigningMethod === 'manual' &&
                    'Partner is signing manually. Once the wet-signed document is received, mark the NDA as Fully Executed below.'}
                </Typography>
              </Card>
            )}

            {/* ── Manual (Wet Signature) — Mark as Fully Executed ── */}
            {isPendingPartner && nda.partnerSigningMethod === 'manual' && (
              <Card sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Mark as Fully Executed
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      The partner is signing via wet (manual) signature. Once you have received the
                      physically signed document, upload it here and mark the NDA as Fully Executed.
                      Uploading the file is optional but recommended — it will be stored in
                      OneDrive.
                    </Typography>
                  </Box>

                  {/* Hidden file input */}
                  <input
                    ref={wetSigInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={handleWetSigFileChange}
                  />

                  {wetSigFile ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:file-check-bold" color="success.main" width={20} />
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                        {wetSigFile.name}
                      </Typography>
                      <Button size="small" color="error" onClick={() => setWetSigFile(null)}>
                        Remove
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:upload-bold" />}
                      onClick={() => wetSigInputRef.current?.click()}
                    >
                      Upload Executed Document
                    </Button>
                  )}

                  <LoadingButton
                    variant="contained"
                    color="success"
                    loading={wetSigLoading}
                    startIcon={<Iconify icon="solar:check-circle-bold" />}
                    onClick={handleMarkFullyExecuted}
                  >
                    {wetSigFile ? 'Mark as Fully Executed & Upload' : 'Mark as Fully Executed'}
                  </LoadingButton>
                </Stack>
              </Card>
            )}

            {/* Audit Log */}
            {nda.auditLog?.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Audit Log
                </Typography>
                <Stack spacing={1.5}>
                  {[...nda.auditLog].reverse().map((entry, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Iconify
                        icon="solar:clock-circle-bold"
                        color="text.secondary"
                        width={16}
                        sx={{ mt: 0.5, flexShrink: 0 }}
                      />
                      <Box>
                        <Typography variant="body2">{formatAction(entry.action)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.performedBy}
                          {' · '}
                          {(() => {
                            const raw = entry.performedAt || entry.timestamp;
                            if (!raw) return '—';
                            const d = new Date(raw);
                            return isNaN(d.getTime()) ? raw : d.toLocaleString();
                          })()}
                          {entry.ipAddress && ` · IP: ${entry.ipAddress}`}
                        </Typography>
                        {entry.notes && (
                          <Typography variant="caption" color="text.disabled" display="block">
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

        {/* ── Right col: document + signature ── */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Signature canvas (shown when this user needs to sign) */}
            {pendingIotaSignature && (
              <Card sx={{ p: 3, border: '2px solid', borderColor: 'warning.main' }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Your signature is required. Draw your signature below and click Apply.
                </Alert>
                <NdaSignatureCanvas onSave={setSignatureData} label="Draw your signature here" />
                {signatureData && (
                  <Box sx={{ mt: 2 }}>
                    <LoadingButton
                      variant="contained"
                      loading={actionLoading}
                      startIcon={<Iconify icon="solar:pen-bold" />}
                      onClick={handleIotaSign}
                    >
                      Submit Signature
                    </LoadingButton>
                  </Box>
                )}
              </Card>
            )}

            {/* Uploaded Document preview (external_upload only) */}
            {nda.documentSource === 'external_upload' && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Uploaded Document
                </Typography>
                {nda.uploadedDocumentName ? (
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:file-text-bold" sx={{ color: 'primary.main' }} />
                      <Typography variant="body2">{nda.uploadedDocumentName}</Typography>
                      {isDraft && (
                        <>
                          <input
                            ref={docFileInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc"
                            style={{ display: 'none' }}
                            onChange={handleUploadDocument}
                          />
                          <Button
                            size="small"
                            startIcon={<Iconify icon="solar:upload-bold" />}
                            onClick={() => docFileInputRef.current?.click()}
                            disabled={docUploading}
                          >
                            Replace
                          </Button>
                        </>
                      )}
                    </Stack>
                    {docBlobUrl ? (
                      <Box
                        component="iframe"
                        src={docBlobUrl}
                        title="Document Preview"
                        sx={{
                          width: '100%',
                          height: 600,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Alert severity="info">
                        DOCX / DOC files cannot be previewed in the browser. Convert them to PDF if
                        you need embedded signatures, stamps, or print processing.
                      </Alert>
                    )}
                    {isUploadedWordDocument && (
                      <Alert severity="warning">
                        Word documents are supported as source files, but PDF-only actions are
                        disabled until the file is converted to PDF.
                      </Alert>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {isUploadedPdf && (
                        <LoadingButton
                          size="small"
                          variant="contained"
                          startIcon={<Iconify icon="solar:download-bold" />}
                          loading={downloadProcessing}
                          onClick={handleDownloadProcessed}
                        >
                          Download with Stamp &amp; Signatures
                        </LoadingButton>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Iconify icon="solar:document-bold" />}
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = `data:application/octet-stream;base64,${nda.uploadedDocumentBase64}`;
                          a.download = nda.uploadedDocumentName;
                          a.click();
                        }}
                      >
                        Download Original
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={1}>
                    <Alert severity="warning">No document uploaded yet.</Alert>
                    {isDraft && (
                      <>
                        <input
                          ref={docFileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc"
                          style={{ display: 'none' }}
                          onChange={handleUploadDocument}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<Iconify icon="solar:upload-bold" />}
                          onClick={() => docFileInputRef.current?.click()}
                          disabled={docUploading}
                        >
                          {docUploading ? 'Uploading...' : 'Upload Document (PDF / DOCX / DOC)'}
                        </Button>
                      </>
                    )}
                  </Stack>
                )}
              </Card>
            )}

            {/* NDA Document preview (iota_generated only) */}
            {(!nda.documentSource || nda.documentSource === 'iota_generated') && (
              <Card sx={{ p: 0, overflow: 'hidden' }}>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle1">Document Preview</Typography>
                  <Tooltip title="Use the Print button above for a clean print">
                    <Iconify icon="solar:info-circle-bold" color="text.secondary" />
                  </Tooltip>
                </Box>
                <Box
                  ref={printRef}
                  sx={{
                    maxHeight: 900,
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  <NdaHtmlTemplate nda={nda} showSignatures />
                </Box>
              </Card>
            )}

            {/* Body Sections (iota_generated only) */}
            {(!nda.documentSource || nda.documentSource === 'iota_generated') && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Body Sections
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 2, display: 'block' }}
                >
                  {isDraft
                    ? 'Click Edit on any section to customise its default legal text for this NDA.'
                    : 'Body sections can only be edited while the NDA is in Draft status.'}
                </Typography>
                <Stack spacing={0}>
                  {SECTION_META.map((sec, i) => {
                    const isOverridden = !!nda.sectionOverrides?.[sec.key];
                    return (
                      <Box
                        key={sec.key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: i < SECTION_META.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{sec.label}</Typography>
                          {isOverridden && (
                            <Chip label="Customised" size="small" color="primary" variant="soft" />
                          )}
                        </Box>
                        {isDraft && (
                          <Button
                            size="small"
                            startIcon={<Iconify icon="solar:pen-bold" />}
                            onClick={() =>
                              setSectionEditDialog({
                                open: true,
                                key: sec.key,
                                text:
                                  nda.sectionOverrides?.[sec.key] ||
                                  SECTION_DEFAULTS[sec.key] ||
                                  '',
                              })
                            }
                          >
                            Edit
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            )}

            {/* Clauses (iota_generated only) */}
            {(!nda.documentSource || nda.documentSource === 'iota_generated') &&
              ((nda.clauses && nda.clauses.length > 0) || isDraft) && (
                <Card sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6">Additional Clauses</Typography>
                    {isDraft && !clausesEditing && (
                      <Button
                        size="small"
                        startIcon={<Iconify icon="solar:pen-bold" />}
                        onClick={() => {
                          setEditedClauses(
                            nda.clauses?.length ? JSON.parse(JSON.stringify(nda.clauses)) : []
                          );
                          setClausesEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>

                  {clausesEditing ? (
                    <Stack spacing={2}>
                      {editedClauses.map((clause, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 1.5 }}
                          >
                            <Typography variant="subtitle2">Clause {i + 1}</Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setEditedClauses((prev) => prev.filter((_, idx) => idx !== i))
                              }
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </Stack>
                          <Stack spacing={1.5}>
                            <TextField
                              label="Clause Title"
                              fullWidth
                              size="small"
                              value={clause.title}
                              onChange={(e) =>
                                setEditedClauses((prev) =>
                                  prev.map((c, idx) =>
                                    idx === i ? { ...c, title: e.target.value } : c
                                  )
                                )
                              }
                            />
                            <TextField
                              label="Clause Content"
                              fullWidth
                              size="small"
                              multiline
                              rows={3}
                              value={clause.content}
                              onChange={(e) =>
                                setEditedClauses((prev) =>
                                  prev.map((c, idx) =>
                                    idx === i ? { ...c, content: e.target.value } : c
                                  )
                                )
                              }
                            />
                          </Stack>
                        </Box>
                      ))}

                      <Button
                        size="small"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() =>
                          setEditedClauses((prev) => [...prev, { title: '', content: '' }])
                        }
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Add Clause
                      </Button>

                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button onClick={() => setClausesEditing(false)}>Cancel</Button>
                        <LoadingButton
                          variant="contained"
                          loading={actionLoading}
                          onClick={handleSaveClauses}
                        >
                          Save Clauses
                        </LoadingButton>
                      </Stack>
                    </Stack>
                  ) : nda.clauses?.length > 0 ? (
                    <Stack spacing={1.5}>
                      {nda.clauses.map((clause, i) => (
                        <Box key={i}>
                          <Typography variant="subtitle2">
                            {clause.title || `Clause ${i + 1}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {clause.content}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No additional clauses. Click Edit to add some.
                    </Typography>
                  )}
                </Card>
              )}

            {/* IOTA Signature & Stamp Placement — combined tabbed card */}
            {nda.documentSource === 'external_upload' && isUploadedPdf && (
              <Card sx={{ p: 3 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="h6">IOTA Signature &amp; Stamp Placement</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isDraft
                      ? 'Place signature zones and stamp positions on the document. Drag any overlay to reposition it (adjustments are only available in Draft status).'
                      : 'Preview of IOTA signature and stamp placements. Signatures appear in their zones once IOTA signatories have signed.'}
                  </Typography>
                </Box>

                <Tabs
                  value={sigStampTab}
                  onChange={(_, v) => setSigStampTab(v)}
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab label="Signature Zones" />
                  <Tab label="Stamp Placement" />
                </Tabs>

                {/* ── Tab 0: IOTA Signature Zones ── */}
                {sigStampTab === 0 && (
                  <>
                    {/* Signatory selector (draft only) */}
                    {isDraft &&
                      Array.isArray(nda?.iotaSignatories) &&
                      nda.iotaSignatories.length > 1 && (
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ flexShrink: 0 }}
                          >
                            Drawing for:
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap">
                            {nda.iotaSignatories.map((sig, idx) => {
                              const color = SIG_ZONE_COLORS[idx % SIG_ZONE_COLORS.length];
                              const isSelected = selectedSigZoneSignatory === idx;
                              return (
                                <Chip
                                  key={idx}
                                  label={sig.name || sig.email || `Signatory ${idx + 1}`}
                                  size="small"
                                  onClick={() => setSelectedSigZoneSignatory(idx)}
                                  sx={{
                                    cursor: 'pointer',
                                    borderWidth: 2,
                                    borderStyle: 'solid',
                                    borderColor: color.border,
                                    bgcolor: isSelected ? color.border : 'transparent',
                                    color: isSelected ? '#fff' : color.border,
                                    fontWeight: isSelected ? 700 : 400,
                                    '&:hover': { bgcolor: color.bg },
                                  }}
                                />
                              );
                            })}
                          </Stack>
                        </Stack>
                      )}

                    {/* Page selector */}
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
                        disabled={pdfJsDoc ? sigZonePreviewPage >= pdfJsDoc.numPages : false}
                      >
                        <Iconify icon="solar:arrow-right-bold" width={16} />
                      </IconButton>
                      {pdfJsDoc && (
                        <Typography variant="caption" color="text.secondary">
                          / {pdfJsDoc.numPages}
                        </Typography>
                      )}
                    </Stack>

                    {/* Visual page preview */}
                    <Box
                      ref={sigZonePreviewRef}
                      onClick={isDraft ? handleSigZonePreviewClick : undefined}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '141.4%',
                        bgcolor: 'common.white',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: isDraft ? 'crosshair' : 'default',
                        boxShadow: 2,
                        userSelect: 'none',
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
                      {!pdfJsDoc && (
                        <Box sx={{ position: 'absolute', inset: 0, p: '8%' }}>
                          {[...Array(14)].map((_, i) => (
                            <Box
                              key={i}
                              sx={{
                                height: 8,
                                bgcolor: 'grey.200',
                                borderRadius: 0.5,
                                mb: 1,
                                width: i % 3 === 0 ? '60%' : '100%',
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Signature zone overlays — show actual signature image once signed */}
                      {signatureZones
                        .filter((z) => (z.page || 1) === sigZonePreviewPage)
                        .map((zone) => {
                          const sigIdx = zone.iotaSignatoryIndex ?? 0;
                          const iotaSignatory = Array.isArray(nda?.iotaSignatories)
                            ? nda.iotaSignatories[sigIdx]
                            : null;
                          const hasSigned = !!iotaSignatory?.signatureData;
                          const zoneColor = SIG_ZONE_COLORS[sigIdx % SIG_ZONE_COLORS.length];
                          const signatoryLabel = iotaSignatory
                            ? iotaSignatory.name || iotaSignatory.email
                            : `Signatory ${sigIdx + 1}`;
                          return (
                            <Box
                              key={zone.id}
                              onMouseDown={
                                isDraft
                                  ? (e) => {
                                      e.stopPropagation();
                                      setDraggingSigZone(zone.id);
                                    }
                                  : undefined
                              }
                              sx={{
                                position: 'absolute',
                                left: `${zone.xPct}%`,
                                top: `${zone.yPct}%`,
                                width: `${zone.widthPct}%`,
                                height: `${zone.heightPct}%`,
                                border: '2px dashed',
                                borderColor: hasSigned ? 'success.main' : zoneColor.border,
                                bgcolor: hasSigned ? 'rgba(76,175,80,0.10)' : zoneColor.bg,
                                opacity: 0.9,
                                borderRadius: 0.5,
                                cursor: isDraft ? 'move' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              {hasSigned ? (
                                <img
                                  src={iotaSignatory.signatureData}
                                  alt="signature"
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                  }}
                                />
                              ) : (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: '0.55rem',
                                    color: zoneColor.border,
                                    textAlign: 'center',
                                    px: 0.5,
                                    fontWeight: 600,
                                  }}
                                >
                                  {signatoryLabel}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                    </Box>

                    {/* Zone list */}
                    {signatureZones.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {signatureZones.map((zone, idx) => {
                          const sigIdx = zone.iotaSignatoryIndex ?? 0;
                          const zoneColor = SIG_ZONE_COLORS[sigIdx % SIG_ZONE_COLORS.length];
                          const iotaSignatory = Array.isArray(nda?.iotaSignatories)
                            ? nda.iotaSignatories[sigIdx]
                            : null;
                          const hasSigned = !!iotaSignatory?.signatureData;
                          const signatoryLabel = iotaSignatory
                            ? iotaSignatory.name || iotaSignatory.email
                            : `Signatory ${sigIdx + 1}`;
                          return (
                            <Stack
                              key={zone.id}
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{
                                p: 1,
                                bgcolor: 'background.neutral',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: hasSigned ? '#4caf50' : zoneColor.border,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="caption" sx={{ flex: 1 }}>
                                Zone {idx + 1} — Page {zone.page}
                                {hasSigned && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ color: 'success.main', ml: 0.5 }}
                                  >
                                    ✓ Signed
                                  </Typography>
                                )}
                              </Typography>
                              {isDraft &&
                              Array.isArray(nda?.iotaSignatories) &&
                              nda.iotaSignatories.length > 1 ? (
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                  <Select
                                    value={zone.iotaSignatoryIndex ?? 0}
                                    onChange={(e) =>
                                      setSignatureZones((prev) =>
                                        prev.map((z) =>
                                          z.id === zone.id
                                            ? { ...z, iotaSignatoryIndex: e.target.value }
                                            : z
                                        )
                                      )
                                    }
                                    sx={{ fontSize: '0.75rem' }}
                                  >
                                    {nda.iotaSignatories.map((sig, sIdx) => (
                                      <MenuItem
                                        key={sIdx}
                                        value={sIdx}
                                        sx={{ fontSize: '0.75rem' }}
                                      >
                                        {sig.name || sig.email || `Signatory ${sIdx + 1}`}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  {signatoryLabel}
                                </Typography>
                              )}
                              {isDraft && (
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setSignatureZones((prev) =>
                                      prev.filter((z) => z.id !== zone.id)
                                    )
                                  }
                                >
                                  <Iconify icon="solar:trash-bin-minimalistic-bold" width={14} />
                                </IconButton>
                              )}
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}

                    {signatureZones.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {isDraft
                          ? 'No signature zones placed. Click the preview to add zones.'
                          : 'No IOTA signature zones configured.'}
                      </Typography>
                    )}

                    {isDraft && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <LoadingButton
                          size="small"
                          variant="contained"
                          loading={sigZoneSaving}
                          onClick={handleSaveSignatureZones}
                        >
                          Save Signature Zones
                        </LoadingButton>
                      </Box>
                    )}
                  </>
                )}

                {/* ── Tab 1: Stamp Placement ── */}
                {sigStampTab === 1 && (
                  <>
                    {/* Page selector */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Preview page:
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={stampPreviewPage <= 1}
                        onClick={() => setStampPreviewPage((p) => p - 1)}
                      >
                        <Iconify icon="solar:arrow-left-bold" width={16} />
                      </IconButton>
                      <Typography variant="body2" fontWeight={600}>
                        {stampPreviewPage}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setStampPreviewPage((p) => p + 1)}
                        disabled={pdfJsDoc ? stampPreviewPage >= pdfJsDoc.numPages : false}
                      >
                        <Iconify icon="solar:arrow-right-bold" width={16} />
                      </IconButton>
                      {pdfJsDoc && (
                        <Typography variant="body2" color="text.secondary">
                          / {pdfJsDoc.numPages}
                        </Typography>
                      )}
                    </Stack>

                    {/* Visual page preview with stamp overlay */}
                    <Box
                      ref={stampPreviewRef}
                      onClick={isDraft ? handleStampPreviewClick : undefined}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '141.4%',
                        bgcolor: 'common.white',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: isDraft ? 'crosshair' : 'default',
                        boxShadow: 2,
                        userSelect: 'none',
                      }}
                    >
                      <canvas
                        ref={stampCanvasRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'block',
                        }}
                      />
                      {!pdfJsDoc && (
                        <Box sx={{ position: 'absolute', inset: 0, p: '8%' }}>
                          {[...Array(14)].map((_, i) => (
                            <Box
                              key={i}
                              sx={{ height: 8, bgcolor: 'grey.100', borderRadius: 0.5, mb: 1.2 }}
                            />
                          ))}
                        </Box>
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: 0,
                          right: 0,
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography variant="caption" color="text.disabled">
                          Page {stampPreviewPage}
                          {pdfJsDoc ? ` / ${pdfJsDoc.numPages}` : ''}
                        </Typography>
                      </Box>
                      {stampPlacements
                        .filter((sp) => sp.page === stampPreviewPage)
                        .map((sp) => (
                          <Box
                            key={sp.id}
                            onMouseDown={(e) => {
                              if (!isDraft) return;
                              e.stopPropagation();
                              setDraggingStamp(sp.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              position: 'absolute',
                              left: `${sp.xPct}%`,
                              top: `${sp.yPct}%`,
                              width: `${sp.widthPct}%`,
                              transform: 'translate(-50%, -50%)',
                              cursor: isDraft ? 'grab' : 'default',
                              zIndex: 10,
                              '&:active': { cursor: 'grabbing' },
                            }}
                          >
                            <Box sx={{ position: 'relative', width: '100%', display: 'block' }}>
                              <Box
                                component="img"
                                src="/logo/iota-stamp.png"
                                alt="IOTA Stamp"
                                draggable={false}
                                sx={{ width: '100%', opacity: 0.85, display: 'block' }}
                              />
                              {isDraft && (
                                <Box
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const container = stampPreviewRef.current;
                                    if (!container) return;
                                    const rect = container.getBoundingClientRect();
                                    setResizingStamp(sp.id);
                                    setResizeStartX(e.clientX - rect.left);
                                    setResizeStartWidth(sp.widthPct);
                                  }}
                                  sx={{
                                    position: 'absolute',
                                    bottom: -6,
                                    right: -6,
                                    width: 12,
                                    height: 12,
                                    bgcolor: 'primary.main',
                                    borderRadius: '50%',
                                    cursor: 'nwse-resize',
                                    border: '2px solid',
                                    borderColor: 'common.white',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                  }}
                                />
                              )}
                            </Box>
                            {isDraft && (
                              <IconButton
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: -10,
                                  right: -10,
                                  bgcolor: 'error.main',
                                  color: 'common.white',
                                  width: 18,
                                  height: 18,
                                  '&:hover': { bgcolor: 'error.dark' },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStampPlacements((prev) => prev.filter((p) => p.id !== sp.id));
                                }}
                              >
                                <Iconify icon="mingcute:close-line" width={12} />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      {/* Read-only sig zone overlays */}
                      {signatureZones
                        .filter((z) => (z.page || 1) === stampPreviewPage)
                        .map((zone) => {
                          const sigIdx = zone.iotaSignatoryIndex ?? 0;
                          const zoneColor = SIG_ZONE_COLORS[sigIdx % SIG_ZONE_COLORS.length];
                          const signatoryLabel =
                            Array.isArray(nda?.iotaSignatories) && nda.iotaSignatories[sigIdx]
                              ? nda.iotaSignatories[sigIdx].name ||
                                nda.iotaSignatories[sigIdx].email
                              : `Sig ${sigIdx + 1}`;
                          return (
                            <Box
                              key={zone.id}
                              sx={{
                                position: 'absolute',
                                left: `${zone.xPct}%`,
                                top: `${zone.yPct}%`,
                                width: `${zone.widthPct}%`,
                                height: `${zone.heightPct}%`,
                                border: '2px dashed',
                                borderColor: zoneColor.border,
                                bgcolor: zoneColor.bg,
                                opacity: 0.65,
                                borderRadius: 0.5,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                zIndex: 5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.5rem',
                                  color: zoneColor.border,
                                  textAlign: 'center',
                                  px: 0.5,
                                  fontWeight: 600,
                                }}
                              >
                                {signatoryLabel}
                              </Typography>
                            </Box>
                          );
                        })}
                    </Box>

                    {stampPlacements.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        No stamp placements configured.
                        {isDraft && ' Click the preview to add stamp positions.'}
                      </Typography>
                    ) : (
                      <Stack spacing={0} sx={{ mt: 1.5 }}>
                        {stampPlacements.map((sp, idx) => (
                          <Box
                            key={sp.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 1,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box
                                component="img"
                                src="/logo/iota-stamp.png"
                                alt="IOTA Stamp"
                                sx={{ height: 28, opacity: 0.85 }}
                              />
                              <Typography variant="body2">
                                Stamp {idx + 1} — Page {sp.page} ({sp.widthPct.toFixed(1)}%)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (drag to move, blue circle to resize)
                              </Typography>
                            </Stack>
                            {isDraft && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  setStampPlacements((prev) => prev.filter((p) => p.id !== sp.id))
                                }
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {isDraft && (
                      <Box sx={{ mt: 2 }}>
                        <LoadingButton
                          size="small"
                          variant="contained"
                          loading={stampSaving}
                          onClick={handleSaveStampPlacements}
                          startIcon={<Iconify icon="solar:diskette-bold" />}
                        >
                          Save Placements
                        </LoadingButton>
                      </Box>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Partner Signature Zones — mark where each partner rep signs on the uploaded PDF */}
            {nda.documentSource === 'external_upload' &&
              isUploadedPdf &&
              (nda.status === 'draft' ||
                nda.status === 'pending_partner_signatures' ||
                nda.status === 'pending_iota_signatures' ||
                nda.status === 'fully_signed') && (
                <Card sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Partner Signature Zones</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isDraft
                        ? 'Click on the page preview to mark where each partner representative should sign. Drag zones to reposition.'
                        : 'Click to view where partner signatures will be placed in the document.'}
                    </Typography>
                  </Box>

                  {/* Signatory selector (draft only) */}
                  {isDraft &&
                    Array.isArray(nda?.partnerSignatories) &&
                    nda.partnerSignatories.length > 1 && (
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                          Drawing for:
                        </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap">
                          {nda.partnerSignatories.map((sig, idx) => {
                            const color =
                              PARTNER_SIG_ZONE_COLORS[idx % PARTNER_SIG_ZONE_COLORS.length];
                            const isSelected = selectedPartnerSigZoneSignatory === idx;
                            return (
                              <Chip
                                key={idx}
                                label={sig.name || sig.email || `Partner ${idx + 1}`}
                                size="small"
                                onClick={() => setSelectedPartnerSigZoneSignatory(idx)}
                                sx={{
                                  cursor: 'pointer',
                                  borderWidth: 2,
                                  borderStyle: 'solid',
                                  borderColor: color.border,
                                  bgcolor: isSelected ? color.border : 'transparent',
                                  color: isSelected ? '#fff' : color.border,
                                  fontWeight: isSelected ? 700 : 400,
                                  '&:hover': { bgcolor: color.bg },
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </Stack>
                    )}

                  {/* Page selector */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Page:
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setPartnerSigZonePreviewPage((p) => Math.max(1, p - 1))}
                      disabled={partnerSigZonePreviewPage <= 1}
                    >
                      <Iconify icon="solar:arrow-left-bold" width={16} />
                    </IconButton>
                    <Typography variant="body2">{partnerSigZonePreviewPage}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => setPartnerSigZonePreviewPage((p) => p + 1)}
                      disabled={pdfJsDoc ? partnerSigZonePreviewPage >= pdfJsDoc.numPages : false}
                    >
                      <Iconify icon="solar:arrow-right-bold" width={16} />
                    </IconButton>
                    {pdfJsDoc && (
                      <Typography variant="caption" color="text.secondary">
                        / {pdfJsDoc.numPages}
                      </Typography>
                    )}
                  </Stack>

                  {/* Visual page preview */}
                  <Box
                    ref={partnerSigZonePreviewRef}
                    onClick={isDraft ? handlePartnerSigZonePreviewClick : undefined}
                    sx={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '141.4%',
                      bgcolor: 'common.white',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: isDraft ? 'crosshair' : 'default',
                      boxShadow: 2,
                      userSelect: 'none',
                    }}
                  >
                    <canvas
                      ref={partnerSigZoneCanvasRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'block',
                      }}
                    />
                    {!pdfJsDoc && (
                      <Box sx={{ position: 'absolute', inset: 0, p: '8%' }}>
                        {[...Array(14)].map((_, i) => (
                          <Box
                            key={i}
                            sx={{
                              height: 8,
                              bgcolor: 'grey.200',
                              borderRadius: 0.5,
                              mb: 1,
                              width: i % 3 === 0 ? '60%' : '100%',
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Render partner signature zone overlays for current page */}
                    {partnerSignatureZones
                      .filter((z) => (z.page || 1) === partnerSigZonePreviewPage)
                      .map((zone) => {
                        const sigIdx = zone.partnerSignatoryIndex ?? 0;
                        const zoneColor =
                          PARTNER_SIG_ZONE_COLORS[sigIdx % PARTNER_SIG_ZONE_COLORS.length];
                        const signatoryLabel =
                          Array.isArray(nda?.partnerSignatories) && nda.partnerSignatories[sigIdx]
                            ? nda.partnerSignatories[sigIdx].name ||
                              nda.partnerSignatories[sigIdx].email
                            : `Partner ${sigIdx + 1}`;
                        const signatory =
                          Array.isArray(nda?.partnerSignatories) && nda.partnerSignatories[sigIdx];
                        const hasSigned = !!signatory?.signatureData;
                        return (
                          <Box
                            key={zone.id}
                            onMouseDown={
                              isDraft
                                ? (e) => {
                                    e.stopPropagation();
                                    setDraggingPartnerSigZone(zone.id);
                                  }
                                : undefined
                            }
                            sx={{
                              position: 'absolute',
                              left: `${zone.xPct}%`,
                              top: `${zone.yPct}%`,
                              width: `${zone.widthPct}%`,
                              height: `${zone.heightPct}%`,
                              border: '2px dashed',
                              borderColor: zoneColor.border,
                              bgcolor: hasSigned ? 'rgba(76,175,80,0.12)' : zoneColor.bg,
                              opacity: 0.9,
                              borderRadius: 0.5,
                              cursor: isDraft ? 'move' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {hasSigned ? (
                              <img
                                src={signatory.signatureData}
                                alt="signature"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.55rem',
                                  color: zoneColor.border,
                                  textAlign: 'center',
                                  px: 0.5,
                                  fontWeight: 600,
                                }}
                              >
                                {signatoryLabel}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                  </Box>

                  {/* Zone list */}
                  {partnerSignatureZones.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {partnerSignatureZones.map((zone, idx) => {
                        const sigIdx = zone.partnerSignatoryIndex ?? 0;
                        const zoneColor =
                          PARTNER_SIG_ZONE_COLORS[sigIdx % PARTNER_SIG_ZONE_COLORS.length];
                        const signatoryLabel =
                          Array.isArray(nda?.partnerSignatories) && nda.partnerSignatories[sigIdx]
                            ? nda.partnerSignatories[sigIdx].name ||
                              nda.partnerSignatories[sigIdx].email
                            : `Partner ${sigIdx + 1}`;
                        const hasSigned =
                          Array.isArray(nda?.partnerSignatories) &&
                          !!nda.partnerSignatories[sigIdx]?.signatureData;
                        return (
                          <Stack
                            key={zone.id}
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{
                              p: 1,
                              bgcolor: 'background.neutral',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: hasSigned ? '#4caf50' : zoneColor.border,
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="caption" sx={{ flex: 1 }}>
                              Zone {idx + 1} — Page {zone.page}
                              {hasSigned && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ color: 'success.main', ml: 0.5 }}
                                >
                                  ✓ Signed
                                </Typography>
                              )}
                            </Typography>
                            {isDraft &&
                            Array.isArray(nda?.partnerSignatories) &&
                            nda.partnerSignatories.length > 1 ? (
                              <FormControl size="small" sx={{ minWidth: 140 }}>
                                <Select
                                  value={zone.partnerSignatoryIndex ?? 0}
                                  onChange={(e) =>
                                    setPartnerSignatureZones((prev) =>
                                      prev.map((z) =>
                                        z.id === zone.id
                                          ? { ...z, partnerSignatoryIndex: e.target.value }
                                          : z
                                      )
                                    )
                                  }
                                  sx={{ fontSize: '0.75rem' }}
                                >
                                  {nda.partnerSignatories.map((sig, sIdx) => (
                                    <MenuItem key={sIdx} value={sIdx} sx={{ fontSize: '0.75rem' }}>
                                      {sig.name || sig.email || `Partner ${sIdx + 1}`}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                {signatoryLabel}
                              </Typography>
                            )}
                            {isDraft && (
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setPartnerSignatureZones((prev) =>
                                    prev.filter((z) => z.id !== zone.id)
                                  )
                                }
                              >
                                <Iconify icon="solar:trash-bin-minimalistic-bold" width={14} />
                              </IconButton>
                            )}
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}

                  {partnerSignatureZones.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No partner signature zones placed.
                      {isDraft && ' Click the preview to add zones.'}
                    </Typography>
                  )}

                  {isDraft && (
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <LoadingButton
                        size="small"
                        variant="contained"
                        loading={partnerSigZoneSaving}
                        onClick={handleSavePartnerSignatureZones}
                      >
                        Save Partner Zones
                      </LoadingButton>
                    </Box>
                  )}
                </Card>
              )}

            {/* IOTA Stamp Placements — standalone (only for iota_generated / word-doc NDAs) */}
            {!(nda.documentSource === 'external_upload' && isUploadedPdf) && (
              <Card sx={{ p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">IOTA Stamp Placements</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isDraft
                      ? 'Click anywhere on the page preview to place the IOTA stamp. Drag placed stamps to reposition. Drag the blue circle in the bottom-right corner to resize. Stamps are embedded during the OneDrive upload.'
                      : 'Stamp placements are locked once the NDA leaves draft status.'}
                  </Typography>
                </Box>

                {/* Page selector */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Preview page:
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={stampPreviewPage <= 1}
                    onClick={() => setStampPreviewPage((p) => p - 1)}
                  >
                    <Iconify icon="solar:arrow-left-bold" width={16} />
                  </IconButton>
                  <Typography variant="body2" fontWeight={600}>
                    {stampPreviewPage}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setStampPreviewPage((p) => p + 1)}
                    disabled={pdfJsDoc ? stampPreviewPage >= pdfJsDoc.numPages : false}
                  >
                    <Iconify icon="solar:arrow-right-bold" width={16} />
                  </IconButton>
                  {pdfJsDoc && (
                    <Typography variant="body2" color="text.secondary">
                      / {pdfJsDoc.numPages}
                    </Typography>
                  )}
                </Stack>

                {/* Visual page preview with stamp overlay */}
                <Box
                  ref={stampPreviewRef}
                  onClick={isDraft ? handleStampPreviewClick : undefined}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '141.4%',
                    bgcolor: 'common.white',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: isDraft ? 'crosshair' : 'default',
                    boxShadow: 2,
                    userSelect: 'none',
                  }}
                >
                  {/* Actual PDF page rendering via pdfjs */}
                  <canvas
                    ref={stampCanvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'block',
                    }}
                  />
                  {/* Fallback placeholder when no PDF is loaded */}
                  {!pdfJsDoc && (
                    <Box sx={{ position: 'absolute', inset: 0, p: '8%' }}>
                      {[...Array(14)].map((_, i) => (
                        <Box
                          key={i}
                          sx={{ height: 8, bgcolor: 'grey.100', borderRadius: 0.5, mb: 1.2 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      Page {stampPreviewPage}
                      {pdfJsDoc ? ` / ${pdfJsDoc.numPages}` : ''}
                    </Typography>
                  </Box>
                  {stampPlacements
                    .filter((sp) => sp.page === stampPreviewPage)
                    .map((sp) => (
                      <Box
                        key={sp.id}
                        onMouseDown={(e) => {
                          if (!isDraft) return;
                          e.stopPropagation();
                          setDraggingStamp(sp.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          position: 'absolute',
                          left: `${sp.xPct}%`,
                          top: `${sp.yPct}%`,
                          width: `${sp.widthPct}%`,
                          transform: 'translate(-50%, -50%)',
                          cursor: isDraft ? 'grab' : 'default',
                          zIndex: 10,
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            display: 'block',
                          }}
                        >
                          <Box
                            component="img"
                            src="/logo/iota-stamp.png"
                            alt="IOTA Stamp"
                            draggable={false}
                            sx={{ width: '100%', opacity: 0.85, display: 'block' }}
                          />
                          {/* Resize handle in bottom-right corner */}
                          {isDraft && (
                            <Box
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const container = stampPreviewRef.current;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                setResizingStamp(sp.id);
                                setResizeStartX(e.clientX - rect.left);
                                setResizeStartWidth(sp.widthPct);
                              }}
                              sx={{
                                position: 'absolute',
                                bottom: -6,
                                right: -6,
                                width: 12,
                                height: 12,
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                                cursor: 'nwse-resize',
                                border: '2px solid',
                                borderColor: 'common.white',
                                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                '&:hover': {
                                  bgcolor: 'primary.dark',
                                },
                              }}
                            />
                          )}
                        </Box>
                        {isDraft && (
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -10,
                              right: -10,
                              bgcolor: 'error.main',
                              color: 'common.white',
                              width: 18,
                              height: 18,
                              '&:hover': { bgcolor: 'error.dark' },
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStampPlacements((prev) => prev.filter((p) => p.id !== sp.id));
                            }}
                          >
                            <Iconify icon="mingcute:close-line" width={12} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  {/* Read-only sig zone overlays so user knows where signatures go */}
                  {signatureZones
                    .filter((z) => (z.page || 1) === stampPreviewPage)
                    .map((zone) => {
                      const sigIdx = zone.iotaSignatoryIndex ?? 0;
                      const zoneColor = SIG_ZONE_COLORS[sigIdx % SIG_ZONE_COLORS.length];
                      const signatoryLabel =
                        Array.isArray(nda?.iotaSignatories) && nda.iotaSignatories[sigIdx]
                          ? nda.iotaSignatories[sigIdx].name || nda.iotaSignatories[sigIdx].email
                          : `Sig ${sigIdx + 1}`;
                      return (
                        <Box
                          key={zone.id}
                          sx={{
                            position: 'absolute',
                            left: `${zone.xPct}%`,
                            top: `${zone.yPct}%`,
                            width: `${zone.widthPct}%`,
                            height: `${zone.heightPct}%`,
                            border: '2px dashed',
                            borderColor: zoneColor.border,
                            bgcolor: zoneColor.bg,
                            opacity: 0.65,
                            borderRadius: 0.5,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            zIndex: 5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.5rem',
                              color: zoneColor.border,
                              textAlign: 'center',
                              px: 0.5,
                              fontWeight: 600,
                            }}
                          >
                            {signatoryLabel}
                          </Typography>
                        </Box>
                      );
                    })}
                </Box>

                {stampPlacements.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    No stamp placements configured.
                    {isDraft && ' Click “Add Placement” to mark stamp positions.'}
                  </Typography>
                ) : (
                  <Stack spacing={0} sx={{ mt: 1.5 }}>
                    {stampPlacements.map((sp, idx) => (
                      <Box
                        key={sp.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            component="img"
                            src="/logo/iota-stamp.png"
                            alt="IOTA Stamp"
                            sx={{ height: 28, opacity: 0.85 }}
                          />
                          <Typography variant="body2">
                            Stamp {idx + 1} — Page {sp.page} ({sp.widthPct.toFixed(1)}%)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (drag on preview to move, blue circle to resize)
                          </Typography>
                        </Stack>
                        {isDraft && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setStampPlacements((prev) => prev.filter((p) => p.id !== sp.id))
                            }
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}

                {isDraft && (
                  <Box sx={{ mt: 2 }}>
                    <LoadingButton
                      size="small"
                      variant="contained"
                      loading={stampSaving}
                      onClick={handleSaveStampPlacements}
                      startIcon={<Iconify icon="solar:diskette-bold" />}
                    >
                      Save Placements
                    </LoadingButton>
                  </Box>
                )}
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* ── Section edit dialog ── */}
      <Dialog
        open={sectionEditDialog.open}
        onClose={() => setSectionEditDialog({ open: false, key: '', text: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {SECTION_META.find((s) => s.key === sectionEditDialog.key)?.label || 'Edit Section'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Edit the text below. Line breaks are preserved. To reset to the original legal text,
            click &ldquo;Reset to Default&rdquo;.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={14}
            value={sectionEditDialog.text}
            onChange={(e) => setSectionEditDialog((prev) => ({ ...prev, text: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() =>
              setSectionEditDialog((prev) => ({
                ...prev,
                text: SECTION_DEFAULTS[prev.key] || '',
              }))
            }
          >
            Reset to Default
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setSectionEditDialog({ open: false, key: '', text: '' })}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={actionLoading}
            onClick={() => handleSaveSectionOverride(sectionEditDialog.key, sectionEditDialog.text)}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Cancel dialog ── */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancel NDA?</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Back</Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={actionLoading}
            onClick={handleCancel}
          >
            Cancel NDA
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Floating Action Panel ── */}
      {(isDraft ||
        isFullyExecuted ||
        isPendingPartner ||
        nda.documentSource === 'external_upload') && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            right: 24,
            top: 160,
            zIndex: 1200,
            width: 214,
            p: 1.5,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: 1,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Actions
          </Typography>
          <Stack spacing={1}>
            {isDraft && (
              <LoadingButton
                variant="contained"
                size="small"
                fullWidth
                loading={actionLoading}
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={handleSubmitForSigning}
              >
                Submit for IOTA Signing
              </LoadingButton>
            )}

            {isPendingPartner &&
              nda.partnerSigningMethod !== 'manual' &&
              Array.isArray(nda.partnerSignatories) &&
              nda.partnerSignatories.some((s) => !s.signedAt) && (
                <LoadingButton
                  variant="outlined"
                  size="small"
                  fullWidth
                  loading={remindPartnerLoading}
                  startIcon={<Iconify icon="solar:bell-bing-bold" />}
                  onClick={handleRemindPartner}
                >
                  Remind Partner
                </LoadingButton>
              )}

            {isPendingPartner && nda.partnerSigningMethod === 'manual' && (
              <LoadingButton
                variant="contained"
                color="success"
                size="small"
                fullWidth
                loading={wetSigLoading}
                startIcon={<Iconify icon="solar:check-circle-bold" />}
                onClick={handleMarkFullyExecuted}
              >
                {wetSigFile ? 'Mark Fully Executed & Upload' : 'Mark as Fully Executed'}
              </LoadingButton>
            )}

            {isFullyExecuted && !nda.onedriveFileId && (
              <LoadingButton
                variant="contained"
                color="success"
                size="small"
                fullWidth
                loading={actionLoading}
                startIcon={<Iconify icon="logos:microsoft-onedrive" />}
                onClick={handleFinalize}
                disabled={isExternalUpload && isUploadedWordDocument}
              >
                {isExternalUpload && isUploadedWordDocument
                  ? 'Convert to PDF to Upload'
                  : 'Upload to OneDrive'}
              </LoadingButton>
            )}

            {isExternalUpload && isUploadedWordDocument && (
              <Alert severity="warning" sx={{ py: 1 }}>
                Convert the Word document to PDF before uploading so signatures and stamps can be
                embedded correctly.
              </Alert>
            )}

            {nda.documentSource === 'external_upload' && nda.uploadedDocumentBase64 && (
              <>
                {isUploadedPdf && (
                  <LoadingButton
                    variant="contained"
                    size="small"
                    fullWidth
                    loading={downloadProcessing}
                    startIcon={<Iconify icon="solar:download-bold" />}
                    onClick={handleDownloadProcessed}
                  >
                    Download with Stamps
                  </LoadingButton>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<Iconify icon="solar:document-bold" />}
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = `data:application/octet-stream;base64,${nda.uploadedDocumentBase64}`;
                    a.download = nda.uploadedDocumentName;
                    a.click();
                  }}
                >
                  Download Original
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </DashboardContent>
  );
}
