'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getVendors, updateProformaInvoice } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/**
 * Edits the parts of a proforma a human owns: the supplier it gets dispatched
 * to, the cover-page wording, and the special instructions printed on page 2.
 *
 * The line items, totals and customer are a snapshot of the source invoice and
 * are deliberately not editable here — the backend ignores them too.
 */
export function ProformaSupplierDialog({ open, onClose, proforma, onSaved }) {
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplier, setSupplier] = useState(null);
  const [brandTitle, setBrandTitle] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [preparedForName, setPreparedForName] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoadingVendors(true);
    getVendors()
      .then((list) => setVendors(list || []))
      .finally(() => setLoadingVendors(false));
  }, [open]);

  // Reset the form to the record every time the dialog opens, so a cancelled
  // edit never leaks into the next one.
  useEffect(() => {
    if (!open || !proforma) return;
    setBrandTitle(proforma.brandTitle || '');
    setDocumentTitle(proforma.documentTitle || 'PROFORMA INVOICE');
    setPreparedForName(proforma.preparedForName || '');
    setSpecialInstructions(proforma.specialInstructions || '');
    setSupplier(
      proforma.supplierId
        ? {
            id: proforma.supplierId,
            vendorName: proforma.supplierName,
            email: proforma.supplierEmail,
            primaryContactName: proforma.supplierContactName,
          }
        : null
    );
  }, [open, proforma]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateProformaInvoice(proforma.proformaId, {
        supplierId: supplier ? String(supplier.id) : null,
        supplierName: supplier?.vendorName || supplier?.name || null,
        supplierEmail: supplier?.email || null,
        supplierContactName: supplier?.primaryContactName || supplier?.contactPerson || null,
        brandTitle: brandTitle.trim() || null,
        documentTitle: documentTitle.trim() || 'PROFORMA INVOICE',
        preparedForName: preparedForName.trim() || null,
        specialInstructions: specialInstructions.trim() || null,
      });
      toast.success('Proforma invoice updated.');
      onSaved?.(updated);
      onClose();
    } catch {
      toast.error('Failed to update the proforma. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!proforma) return null;

  const vendorLabel = (option) => option?.vendorName || option?.name || '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Proforma details</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Supplier
            </Typography>
            <Autocomplete
              options={vendors}
              value={supplier}
              loading={loadingVendors}
              onChange={(_, value) => setSupplier(value)}
              getOptionLabel={vendorLabel}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supplier"
                  helperText="The proforma is emailed here on dispatch. Suppliers without an email address cannot be dispatched to."
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingVendors ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
            {supplier && !supplier.email && (
              <Typography variant="caption" sx={{ color: 'warning.main', mt: 1, display: 'block' }}>
                This supplier has no email address on file — add one in the Vendor module before
                dispatching.
              </Typography>
            )}
          </Box>

          <Divider />

          <Typography variant="subtitle2">Cover page</Typography>

          <TextField
            fullWidth
            label="Brand / product line"
            value={brandTitle}
            onChange={(e) => setBrandTitle(e.target.value)}
            helperText="Printed above the document title, e.g. LOGRYTHM. Leave blank to omit the line."
          />

          <TextField
            fullWidth
            label="Document title"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
          />

          <TextField
            fullWidth
            label="Prepared for"
            value={preparedForName}
            onChange={(e) => setPreparedForName(e.target.value)}
            helperText="Contact name shown under 'Prepared For' on the cover."
          />

          <Divider />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Special instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            helperText="Printed on page 2, opposite the customer block."
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
