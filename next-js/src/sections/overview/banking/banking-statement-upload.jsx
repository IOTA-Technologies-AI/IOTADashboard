'use client';

import { useDropzone } from 'react-dropzone';
import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { SUPPORTED_BANKS, BANK_REGIONS } from 'src/utils/constants/banking';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function BankingStatementUpload({ onUploadComplete, accounts = [], sx, ...other }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedBank, setSelectedBank] = useState(SUPPORTED_BANKS.UAE[0]?.id || 'emirates_nbd'); // Default to first bank
  const [selectedRegion, setSelectedRegion] = useState('UAE');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [parseResult, setParseResult] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPassword('');
    setSelectedAccount('');
    setSelectedBank('');
    setError('');
    setProgress(0);
    setParseResult(null);
    setIsNewAccount(false);
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setProgress(10);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);
      formData.append('accountId', selectedAccount);
      formData.append('bankId', selectedBank);
      formData.append('region', selectedRegion);
      formData.append('isNewAccount', isNewAccount.toString());

      setProgress(30);

      const response = await fetch('/api/banking/parse-statement', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse statement');
      }

      setProgress(100);
      setParseResult(result);

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to process statement');
    } finally {
      setLoading(false);
    }
  };

  const banksForRegion = SUPPORTED_BANKS[selectedRegion] || [];

  return (
    <>
            <Card sx={sx} {...other}>
        <CardHeader
          title="Upload Statement"
          subheader="Import transactions from bank statements"
          slotProps={{
            subheader: {
              sx: {
                fontSize: '0.6875rem', // Reduced by ~5px (from default 0.875rem)
                fontStyle: 'regular',
                opacity: 0.8,
                pb: 2,
              },
            },
          }}
          action={
            <Button variant="contained" startIcon={<Iconify icon="eva:cloud-upload-fill" />} onClick={handleOpen}>
              Upload
            </Button>
          }
        />
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            Upload Bank Statement
            <IconButton onClick={handleClose} size="small">
              <Iconify icon="eva:close-fill" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                label="Region"
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedBank(''); // Reset bank when region changes
                  // Auto-select first bank in new region
                  const newRegionBanks = SUPPORTED_BANKS[e.target.value] || [];
                  if (newRegionBanks.length > 0) {
                    setSelectedBank(newRegionBanks[0].id);
                  }
                }}
              >
                {Object.keys(BANK_REGIONS).map((region) => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={isNewAccount ? 'new' : selectedAccount}
                label="Bank Account"
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setIsNewAccount(true);
                    setSelectedAccount('');
                  } else {
                    setIsNewAccount(false);
                    setSelectedAccount(e.target.value);
                  }
                }}
              >
                {accounts.filter((acc) => acc.region === selectedRegion || !acc.region).map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.accountName} - {account.bankName} ({account.accountNumber})
                  </MenuItem>
                ))}
                <MenuItem value="new">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="eva:plus-fill" />
                    <span>Add New Account</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            {(isNewAccount || !selectedAccount) && (
              <FormControl fullWidth>
                <InputLabel>Bank</InputLabel>
                <Select value={selectedBank} label="Bank" onChange={(e) => setSelectedBank(e.target.value)}>
                  {banksForRegion.map((bank) => (
                    <MenuItem key={bank.id} value={bank.id}>{bank.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box
              {...getRootProps()}
              sx={{
                p: 3,
                borderRadius: 1,
                cursor: 'pointer',
                textAlign: 'center',
                bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                border: (theme) => `1px dashed ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
                '&:hover': { bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.16) },
                ...(isDragActive && { bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.08), borderColor: 'primary.main' }),
                ...(file && { bgcolor: (theme) => varAlpha(theme.vars.palette.success.mainChannel, 0.08), borderColor: 'success.main' }),
              }}
            >
              <input {...getInputProps()} />
              {file ? (
                <Stack alignItems="center" spacing={1}>
                  <Iconify icon="eva:file-text-fill" width={48} sx={{ color: 'success.main' }} />
                  <Typography variant="subtitle2">{file.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{(file.size / 1024).toFixed(1)} KB</Typography>
                </Stack>
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <Iconify icon="eva:cloud-upload-fill" width={48} sx={{ color: isDragActive ? 'primary.main' : 'text.disabled' }} />
                  <Typography variant="subtitle2">{isDragActive ? 'Drop the file here' : 'Drag & drop PDF statement'}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>or click to browse (max 10MB)</Typography>
                </Stack>
              )}
            </Box>

            <TextField
              fullWidth
              type="password"
              label="PDF Password (if encrypted)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty if not password protected"
              helperText="Some bank statements are password protected"
            />

            {loading && (
              <Box sx={{ width: '100%' }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>Processing statement...</Typography>
              </Box>
            )}

            {error && <Typography color="error" variant="body2">{error}</Typography>}

            {parseResult && (
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: (theme) => varAlpha(theme.vars.palette.success.mainChannel, 0.08) }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>✓ Statement Parsed Successfully</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">Bank: {parseResult.bankName}</Typography>
                  <Typography variant="body2">Account: {parseResult.accountInfo?.accountNumber}</Typography>
                  <Typography variant="body2">Transactions: {parseResult.transactions?.length || 0}</Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Iconify icon="eva:cloud-upload-fill" />}
          >
            {loading ? 'Processing...' : 'Upload & Parse'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
