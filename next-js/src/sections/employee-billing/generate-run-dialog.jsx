import { useState, useEffect, useCallback } from 'react';

import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { fCurrency } from 'src/utils/format-number';

import { previewBillingRun, generateBillingRun } from 'src/actions/employee-billing';

import { toast } from 'src/components/snackbar';

import { periodLabel, currentPeriod } from './utils/stages';

// ----------------------------------------------------------------------

/**
 * Month-end run: preview what each active contract would bill for the period
 * (pro-rated lines, VAT), pick the contracts, generate. Each generated invoice
 * lands in the Invoice module as "pending" for the usual internal approval.
 */
export function GenerateRunDialog({ open, onClose, onDone }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);

  const loadPreview = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await previewBillingRun(p);
      setPreview(res);
      setSelected(res.contracts.filter((c) => !c.skipReason).map((c) => c.contract.id));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadPreview(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleGenerate = async () => {
    if (!selected.length) return;
    setGenerating(true);
    try {
      const res = await generateBillingRun({ period, contractIds: selected });
      if (res.created.length) {
        toast.success(
          `${res.created.length} invoice${res.created.length === 1 ? '' : 's'} raised for ${periodLabel(period)} and sent for internal approval`
        );
      }
      res.skipped
        .filter((s) => s.reason.startsWith('Failed'))
        .forEach((s) => toast.error(`Contract #${s.contractId}: ${s.reason}`));
      onDone?.(res);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const billable = (preview?.contracts || []).filter((c) => !c.skipReason);
  const selectedTotal = billable
    .filter((c) => selected.includes(c.contract.id))
    .reduce((s, c) => s + c.total, 0);
  const currency = billable[0]?.currencyCode || 'SAR';

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate monthly invoices</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Billing period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />
            <Button
              variant="outlined"
              onClick={() => loadPreview(period)}
              disabled={loading || !period}
            >
              Preview
            </Button>
          </Stack>

          {loading && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          )}

          {!loading && preview && preview.contracts.length === 0 && (
            <Alert severity="warning">
              No active contracts. Activate a contract before generating.
            </Alert>
          )}

          {!loading && preview && preview.contracts.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Contract</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Headcount</TableCell>
                  <TableCell align="right">Net</TableCell>
                  <TableCell align="right">VAT</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.contracts.map((c) => {
                  const disabled = !!c.skipReason;
                  return (
                    <TableRow key={c.contract.id} sx={{ opacity: disabled ? 0.6 : 1 }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(c.contract.id)}
                          disabled={disabled}
                          onChange={() => toggle(c.contract.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {c.contract.contractNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.contract.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{c.contract.customerName}</TableCell>
                      <TableCell align="right">{c.headcount}</TableCell>
                      <TableCell align="right">
                        {fCurrency(c.baseAmount, { currencyCode: c.currencyCode })}
                      </TableCell>
                      <TableCell align="right">
                        {fCurrency(c.vatAmount, { currencyCode: c.currencyCode })}
                      </TableCell>
                      <TableCell align="right">
                        <strong>{fCurrency(c.total, { currencyCode: c.currencyCode })}</strong>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          color={disabled ? 'warning.main' : 'text.secondary'}
                        >
                          {c.skipReason ||
                            c.lines
                              .filter((l) => l.daysBilled < l.daysInMonth)
                              .map(
                                (l) => `${l.employeeName}: ${l.daysBilled}/${l.daysInMonth} days`
                              )
                              .join(', ')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {billable.length > 0 && (
            <Alert severity="info">
              {selected.length} of {billable.length} contract{billable.length === 1 ? '' : 's'}{' '}
              selected · {fCurrency(selectedTotal, { currencyCode: currency })} incl. VAT. Invoices
              are raised as <strong>pending</strong> and follow the normal internal approval.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={generating}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={generating}
          disabled={!selected.length}
          onClick={handleGenerate}
        >
          Generate {selected.length || ''} invoice{selected.length === 1 ? '' : 's'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
