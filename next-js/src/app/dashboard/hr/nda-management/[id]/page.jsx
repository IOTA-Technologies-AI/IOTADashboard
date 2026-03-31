'use client';

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
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  getNda,
  cancelNda,
  finalizeNda,
  iotaSignNda,
  submitNdaForIotaSigning,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { NdaHtmlTemplate, NdaSignatureCanvas } from 'src/components/nda';

import { useAuthContext } from 'src/auth/hooks';

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

// ── Component ────────────────────────────────────────────────────────────────

export default function NdaDetailsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthContext();
  const printRef = useRef(null);

  const [nda, setNda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const userEmail = user?.email || '';

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

  const handleSubmitForSigning = async () => {
    try {
      setActionLoading(true);
      const updated = await submitNdaForIotaSigning(id);
      setNda(updated);
      toast.success('NDA submitted for IOTA signatures. Signatories have been emailed.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit for signing');
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
    try {
      setActionLoading(true);
      const updated = await finalizeNda(id, '');
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
      const updated = await cancelNda(id, cancelReason);
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

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${nda?.ndaNumber || 'NDA'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Georgia, 'Times New Roman', serif; color: #000; background: #fff; }
            @page { size: A4; margin: 20mm 18mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Allow images (signatures) to load before printing
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    // Fallback in case onload already fired
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.close();
      }
    }, 800);
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
              Print / Download
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
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Actions
              </Typography>
              <Stack spacing={1.5}>
                {isDraft && (
                  <LoadingButton
                    variant="contained"
                    loading={actionLoading}
                    startIcon={<Iconify icon="solar:pen-bold" />}
                    onClick={handleSubmitForSigning}
                    fullWidth
                  >
                    Submit for IOTA Signing
                  </LoadingButton>
                )}

                {isFullyExecuted && !nda.onedriveFileId && (
                  <LoadingButton
                    variant="contained"
                    color="success"
                    loading={actionLoading}
                    startIcon={<Iconify icon="logos:microsoft-onedrive" />}
                    onClick={handleFinalize}
                    fullWidth
                  >
                    Upload to OneDrive
                  </LoadingButton>
                )}

                {(isDraft || isPendingIota || isPendingPartner) && (
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    {isDraft && 'NDA is in draft. Submit to begin signing.'}
                    {isPendingIota && 'Waiting for IOTA signatories to sign.'}
                    {isPendingPartner && 'Waiting for partner signatories to sign.'}
                  </Typography>
                )}
              </Stack>
            </Card>
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

            {/* NDA Document preview */}
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
                <Tooltip title="Use Print / Download button above for a clean print">
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
                        <Typography variant="body2">{entry.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.actorEmail} · {new Date(entry.timestamp).toLocaleString()}
                          {entry.ipAddress && ` · IP: ${entry.ipAddress}`}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

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
    </DashboardContent>
  );
}
