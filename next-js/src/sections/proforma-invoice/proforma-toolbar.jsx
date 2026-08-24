'use client';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { dispatchProformaInvoice } from 'src/utils/apiHelper';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_COLOR = {
  draft: 'default',
  pending: 'warning',
  approved: 'info',
  dispatched: 'success',
  rejected: 'error',
};

export function ProformaToolbar({
  proforma,
  canApprove = false,
  onOpenApproval,
  onOpenEdit,
  onRefresh,
}) {
  const { value: previewOpen, onFalse: closePreview, onTrue: openPreview } = useBoolean();
  const [dispatching, setDispatching] = useState(false);

  const status = (proforma?.status || 'draft').toLowerCase();
  const isApproved = status === 'approved';
  const isDispatched = status === 'dispatched';
  const canEditDetails = !isDispatched;
  const hasSupplierEmail = !!proforma?.supplierEmail;

  const printUrl = `/proforma-print/${proforma?.proformaId}`;

  // Dispatch emails a real PDF, so it is rendered here with @react-pdf rather
  // than through the browser's print dialog (which cannot hand its output back
  // to us). ./proforma-pdf mirrors the three pages of the HTML template — keep
  // the two in step whenever the template layout changes.
  const handleDispatch = async () => {
    if (!isApproved) {
      toast.error('Approve the proforma before dispatching it.');
      return;
    }
    if (!hasSupplierEmail) {
      toast.error('Tag a supplier with an email address before dispatching.');
      return;
    }

    try {
      setDispatching(true);
      const { pdf: renderPdf } = await import('@react-pdf/renderer');
      const { ProformaPdfDocument } = await import('./proforma-pdf');
      const blob = await renderPdf(<ProformaPdfDocument proforma={proforma} />).toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      // Convert to base64 without hitting btoa's argument-length limit
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      const result = await dispatchProformaInvoice(proforma.proformaId, btoa(binary));
      toast.success(`Proforma dispatched to ${result.sentTo}.`);
      onRefresh?.();
    } catch (err) {
      console.error('[ProformaToolbar] Dispatch failed:', err);
      toast.error('Failed to dispatch the proforma. Please try again.');
    } finally {
      setDispatching(false);
    }
  };

  const renderPreviewDialog = () => (
    <Dialog fullScreen open={previewOpen}>
      <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
        <DialogActions sx={{ p: 1.5 }}>
          <Button color="inherit" variant="contained" onClick={closePreview}>
            Close
          </Button>
        </DialogActions>
        <Box sx={{ flexGrow: 1, height: 1, overflow: 'hidden' }}>
          {proforma && (
            <iframe
              title="proforma-preview"
              src={`${printUrl}?preview=true`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </Box>
      </Box>
    </Dialog>
  );

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'flex',
          mb: { xs: 3, md: 5 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-end', sm: 'center' },
        }}
      >
        <Box sx={{ gap: 1, width: 1, flexGrow: 1, display: 'flex' }}>
          <Tooltip title="View">
            <IconButton onClick={openPreview}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Print / Save as PDF">
            <IconButton onClick={() => window.open(printUrl, '_blank')}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              canEditDetails
                ? 'Edit supplier & cover details'
                : 'Dispatched proformas can no longer be edited'
            }
          >
            <span>
              <IconButton onClick={onOpenEdit} disabled={!canEditDetails}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </span>
          </Tooltip>

          {canApprove && (status === 'draft' || status === 'pending') && (
            <Tooltip title="Review & Approve">
              <IconButton onClick={onOpenApproval} sx={{ color: 'success.main' }}>
                <Iconify icon="solar:check-circle-bold" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip
            title={
              isDispatched
                ? `Already dispatched to ${proforma?.dispatchedTo}`
                : !isApproved
                  ? 'Approve the proforma before dispatching'
                  : !hasSupplierEmail
                    ? 'Tag a supplier with an email address first'
                    : 'Dispatch to supplier'
            }
          >
            <span>
              <IconButton
                onClick={handleDispatch}
                disabled={dispatching || isDispatched || !isApproved || !hasSupplierEmail}
              >
                {dispatching ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Iconify icon="custom:send-fill" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Open source invoice">
            <span>
              <IconButton
                component={RouterLink}
                href={paths.dashboard.invoice.details(proforma?.invoiceId)}
                disabled={!proforma?.invoiceId}
              >
                <Iconify icon="solar:file-text-bold" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Label variant="soft" color={STATUS_COLOR[status] || 'default'} sx={{ px: 2, py: 2 }}>
          {status}
        </Label>
      </Box>

      {renderPreviewDialog()}
    </>
  );
}
