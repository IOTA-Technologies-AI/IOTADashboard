'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fDateTime } from 'src/utils/format-time';

import { decideVetting } from 'src/actions/employee-vetting';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * Super Admin approval of a vetting. An approved vetting from an onboarding
 * submission makes the employee available under Offer Letter Management.
 */
export function VettingApprovalCard({ vetting, onChange }) {
  const { user } = useAuthContext();
  const isSuperAdmin = Number(user?.roleId) === 4;
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject'
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!vetting || !('approvalStatus' in vetting)) return null;

  const status = vetting.approvalStatus || 'pending';
  const waiting = ['draft', 'pending'].includes(vetting.status);

  const handleDecide = async () => {
    setSaving(true);
    try {
      const updated = await decideVetting(vetting.id, dialog === 'approve', note);
      await onChange?.(updated);
      toast.success(dialog === 'approve' ? 'Vetting approved.' : 'Vetting rejected.');
      setDialog(null);
      setNote('');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Could not save the decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:shield-check-bold" sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Super Admin approval</Typography>
            <Label
              variant="soft"
              color={
                status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'
              }
            >
              {status === 'approved'
                ? 'Approved'
                : status === 'rejected'
                  ? 'Rejected'
                  : 'Awaiting decision'}
            </Label>
            {vetting.source === 'onboarding' ? (
              <Label variant="outlined" color="info">
                From onboarding
              </Label>
            ) : null}
          </Stack>
          {status !== 'pending' ? (
            <Typography variant="body2" color="text.secondary">
              {status === 'approved' ? 'Approved' : 'Rejected'} by {vetting.approvedBy} on{' '}
              {fDateTime(vetting.approvedAt)}
              {vetting.approvalNote ? ` — “${vetting.approvalNote}”` : ''}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {vetting.source === 'onboarding'
                ? 'Once approved, this employee can be issued an offer letter under Offer Letter Management.'
                : 'Record the decision once the checks are back.'}
            </Typography>
          )}
        </Stack>

        {isSuperAdmin ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              disabled={status === 'rejected'}
              onClick={() => setDialog('reject')}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={status === 'approved' || waiting}
              onClick={() => setDialog('approve')}
            >
              Approve
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {isSuperAdmin && waiting && status === 'pending' ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Approval opens once every check has come back. Results are collected automatically every
          30 minutes, or use Refresh.
        </Alert>
      ) : null}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog === 'approve' ? 'Approve vetting' : 'Reject vetting'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {vetting.employeeName} — review every check&apos;s result before deciding. The decision
            and reason are recorded on the vetting.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={dialog === 'approve' ? 'Note (optional)' : 'Reason (required)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color={dialog === 'approve' ? 'success' : 'error'}
            loading={saving}
            disabled={dialog === 'reject' && note.trim().length < 5}
            onClick={handleDecide}
          >
            {dialog === 'approve' ? 'Approve' : 'Reject'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
