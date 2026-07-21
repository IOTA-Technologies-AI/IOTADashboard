import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { issueInvoice } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

const DOCS_BASE_URL = 'https://docs.iotatechnologies.io';

export function InvoiceToolbar({
  invoice,
  currentStatus,
  onRefresh,
  statusOptions,
  onChangeStatus,
}) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const [issuing, setIssuing] = useState(false);
  const { user } = useAuthContext();

  // Only the creator may edit, and only while pending; super-admins can always.
  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const editStatus = (currentStatus || invoice?.status || '').toLowerCase();
  const isPending = editStatus === 'pending' || editStatus === 'draft';
  const canEdit =
    normalizedRole === 'superAdmin' ||
    (isPending && !!invoice?.createdByEmail && invoice?.createdByEmail === user?.email);

  const isPaid = currentStatus === 'paid';
  const publicLink = invoice?.viewToken ? `${DOCS_BASE_URL}/view/${invoice.viewToken}` : null;

  const handleCopyPublicLink = () => {
    if (!publicLink) return;
    navigator.clipboard
      .writeText(publicLink)
      .then(() => {
        toast.success('Public invoice link copied to clipboard.');
      })
      .catch(() => {
        toast.error('Failed to copy link.');
      });
  };

  const handleIssue = async () => {
    try {
      setIssuing(true);
      // Dynamically import to keep SSR safe
      const [{ pdf: renderPdf }, { InvoicePdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./invoice-pdf'),
      ]);
      const blob = await renderPdf(
        <InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />
      ).toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      // Convert to base64 without btoa size limit
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);
      await issueInvoice(invoice?.invoiceId || invoice?.id, pdfBase64);
      toast.success('Invoice issued and emailed to customer.');
      onRefresh?.();
    } catch (err) {
      console.error('[InvoiceToolbar] Issue failed:', err);
      toast.error('Failed to issue invoice. Please try again.');
    } finally {
      setIssuing(false);
    }
  };

  const renderDetailsDialog = () => (
    <Dialog fullScreen open={open}>
      <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
        <DialogActions sx={{ p: 1.5 }}>
          <Button color="inherit" variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
        <Box sx={{ flexGrow: 1, height: 1, overflow: 'hidden' }}>
          {invoice && (
            <iframe
              title="invoice-preview"
              src={`/invoice-print/${invoice?.id || invoice?.invoiceId}?preview=true`}
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
        <Box
          sx={{
            gap: 1,
            width: 1,
            flexGrow: 1,
            display: 'flex',
          }}
        >
          {canEdit && (
            <Tooltip title="Edit">
              <IconButton
                component={RouterLink}
                href={paths.dashboard.invoice.edit(`${invoice?.id}`)}
              >
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="View">
            <IconButton onClick={onOpen}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Print / Save as PDF">
            <IconButton
              onClick={() =>
                window.open(`/invoice-print/${invoice?.id || invoice?.invoiceId}`, '_blank')
              }
            >
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              isPaid
                ? 'Public link disabled — invoice is paid'
                : publicLink
                  ? 'Copy public invoice link'
                  : 'Public link unavailable — issue the invoice first'
            }
          >
            <span>
              <IconButton onClick={handleCopyPublicLink} disabled={!publicLink || isPaid}>
                <Iconify icon="solar:link-bold" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={issuing ? 'Issuing…' : 'Issue & Email to Customer'}>
            <span>
              <IconButton onClick={handleIssue} disabled={issuing}>
                {issuing ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Iconify icon="custom:send-fill" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        {statusOptions && onChangeStatus && (
          <TextField
            fullWidth
            select
            label="Status"
            value={currentStatus}
            onChange={onChangeStatus}
            sx={{ maxWidth: 160 }}
            slotProps={{
              htmlInput: { id: 'status-select' },
              inputLabel: { htmlFor: 'status-select' },
            }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {renderDetailsDialog()}
    </>
  );
}
