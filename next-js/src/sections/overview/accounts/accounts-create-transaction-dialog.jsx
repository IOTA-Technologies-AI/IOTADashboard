'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { createBankTransaction } from 'src/actions/banking';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const CATEGORIES = [
  'salary',
  'rent',
  'utilities',
  'vendor_payment',
  'customer_receipt',
  'bank_fees',
  'vat',
  'transfer_in',
  'transfer_out',
  'maintenance_fee',
  'other',
];

const CATEGORY_LABELS = {
  salary: 'Salary',
  rent: 'Rent',
  utilities: 'Utilities',
  vendor_payment: 'Vendor Payment',
  customer_receipt: 'Customer Receipt',
  bank_fees: 'Bank Fees',
  vat: 'VAT',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  maintenance_fee: 'Maintenance',
  other: 'Other',
};

const DEFAULT_FORM = {
  transactionType: 'credit',
  bankAccountId: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: '',
  description: '',
  category: 'other',
  referenceNumber: '',
  counterpartyName: '',
};

// ----------------------------------------------------------------------

export function AccountsCreateTransactionDialog({ open, onClose, accounts = [], onCreated }) {
  const theme = useTheme();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isIncoming = form.transactionType === 'credit';

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleTypeChange = (_, newType) => {
    if (newType) setForm((prev) => ({ ...prev, transactionType: newType }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.bankAccountId) {
      setError('Please select a bank account.');
      return;
    }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!form.description.trim()) {
      setError('Please enter a description.');
      return;
    }

    setSaving(true);
    try {
      const result = await createBankTransaction({
        bankAccountId: form.bankAccountId,
        transactionDate: form.transactionDate,
        transactionType: form.transactionType,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        category: form.category,
        referenceNumber: form.referenceNumber.trim() || undefined,
        counterpartyName: form.counterpartyName.trim() || undefined,
        // statementId is omitted (null = manual entry)
      });

      if (result.success) {
        onCreated?.(result.data);
        setForm(DEFAULT_FORM);
        onClose();
      } else {
        setError(result.error || 'Failed to create transaction.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify
            icon={isIncoming ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'}
            width={24}
            sx={{ color: isIncoming ? 'success.main' : 'error.main' }}
          />
          <Typography variant="h6">New Transaction</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Type toggle */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Transaction Type
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <ToggleButtonGroup exclusive value={form.transactionType} onChange={handleTypeChange}>
                <ToggleButton
                  value="credit"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: theme.palette.success.lighter,
                      color: 'success.main',
                      borderColor: 'success.main',
                    },
                  }}
                >
                  <Iconify icon="solar:arrow-down-bold" width={18} sx={{ mr: 1 }} />
                  Incoming
                </ToggleButton>
                <ToggleButton
                  value="debit"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: theme.palette.error.lighter,
                      color: 'error.main',
                      borderColor: 'error.main',
                    },
                  }}
                >
                  <Iconify icon="solar:arrow-up-bold" width={18} sx={{ mr: 1 }} />
                  Outgoing
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Bank Account */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Bank Account</InputLabel>
                <Select
                  label="Bank Account"
                  value={form.bankAccountId}
                  onChange={handleChange('bankAccountId')}
                >
                  {accounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.accountName} — {acc.bankName} ({acc.currency})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Date"
                type="date"
                value={form.transactionDate}
                onChange={handleChange('transactionDate')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Amount"
                type="number"
                value={form.amount}
                onChange={handleChange('amount')}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                    inputProps: { min: 0.01, step: 0.01 },
                  },
                }}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Description"
                value={form.description}
                onChange={handleChange('description')}
                placeholder={
                  isIncoming ? 'e.g. Client payment — Invoice #1234' : 'e.g. Salary - March 2026'
                }
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={form.category} onChange={handleChange('category')}>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Reference */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reference Number"
                value={form.referenceNumber}
                onChange={handleChange('referenceNumber')}
                placeholder="Optional"
              />
            </Grid>

            {/* Counterparty */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Counterparty Name"
                value={form.counterpartyName}
                onChange={handleChange('counterpartyName')}
                placeholder={
                  isIncoming ? 'e.g. Customer / Client name' : 'e.g. Vendor / Employee name'
                }
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          color={isIncoming ? 'success' : 'error'}
          startIcon={
            saving ? null : (
              <Iconify icon={isIncoming ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'} />
            )
          }
        >
          {saving ? 'Saving…' : isIncoming ? 'Record Incoming' : 'Record Outgoing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
