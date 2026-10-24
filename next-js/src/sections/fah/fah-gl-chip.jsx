'use client';

import { useState } from 'react';

import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { setTag, fahError, useFahMe, useFahCatalog, useSourceLedger } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

/**
 * "Posted to GL" on an ERP screen (FR-SLA-7): the journals an invoice or
 * expense produced, and its practice, which finance can change (the row is
 * then reversed and reposted). Additive and read-only for everyone else:
 * without a finance role it renders nothing.
 */
export function FahGlChip({ sourceTable, sourceId }) {
  const { me } = useFahMe();
  const allowed = !!me && me.rank >= 1 && !!sourceId;
  if (!allowed) return null;
  return <GlChip sourceTable={sourceTable} sourceId={String(sourceId)} me={me} />;
}

function GlChip({ sourceTable, sourceId, me }) {
  const { t, nameOf } = useFahT();
  const router = useRouter();
  const { ledger } = useSourceLedger(sourceTable, sourceId);
  const { practices } = useFahCatalog();
  const [anchor, setAnchor] = useState(null);
  const [tagging, setTagging] = useState(false);

  if (!ledger) return null;
  const posted = ledger.journals.filter((j) => j.status === 'POSTED');
  const first = posted[0];
  const practice = practices.find((p) => p.id === ledger.tag?.practiceId);

  let chip;
  if (ledger.problems.length) {
    chip = {
      color: 'warning',
      icon: 'solar:danger-triangle-bold',
      label: t('chip.problem', 'GL: needs attention'),
      href: `${paths.dashboard.finance.accounting.postings}?tab=events`,
      tip: ledger.problems[0].error,
    };
  } else if (first) {
    chip = {
      color: 'success',
      icon: 'solar:verified-check-bold',
      label:
        posted.length > 1
          ? t('chip.postedMany', 'Posted to GL: {{number}} +{{more}}', {
              number: first.journalNumber,
              more: posted.length - 1,
            })
          : t('chip.posted', 'Posted to GL: {{number}}', { number: first.journalNumber }),
    };
  } else if (ledger.pending) {
    chip = {
      color: 'info',
      icon: 'solar:clock-circle-bold',
      label: t('chip.pending', 'Posting to GL…'),
    };
  } else {
    chip = {
      color: 'default',
      icon: 'solar:clock-circle-outline',
      label: t('chip.none', 'Not in the GL'),
    };
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Tooltip title={chip.tip ?? ''}>
        <Chip
          size="small"
          variant="soft"
          color={chip.color}
          icon={<Iconify icon={chip.icon} width={16} />}
          label={chip.label}
          onClick={(e) => {
            if (chip.href) router.push(chip.href);
            else if (posted.length > 1) setAnchor(e.currentTarget);
            else if (first) router.push(paths.dashboard.finance.accounting.journal(first.id));
          }}
        />
      </Tooltip>
      {(practice || me.canPrepare) && ['invoices', 'expenses'].includes(sourceTable) && (
        <Chip
          size="small"
          variant="outlined"
          label={practice ? nameOf(practice) : t('chip.noPractice', 'No practice')}
          onClick={me.canPrepare ? () => setTagging(true) : undefined}
          icon={me.canPrepare ? <Iconify icon="solar:pen-bold" width={14} /> : undefined}
        />
      )}

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {posted.map((j) => (
          <MenuItem
            key={j.id}
            onClick={() => router.push(paths.dashboard.finance.accounting.journal(j.id))}
          >
            <Stack>
              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                {j.journalNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {j.journalDate} · {j.description}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      <PracticeDialog
        open={tagging}
        onClose={() => setTagging(false)}
        sourceTable={sourceTable}
        sourceId={sourceId}
        current={ledger.tag}
      />
    </Stack>
  );
}

function PracticeDialog({ open, onClose, sourceTable, sourceId, current }) {
  const { t, nameOf } = useFahT();
  const { practices, engagements } = useFahCatalog();
  const [practiceId, setPracticeId] = useState(current?.practiceId ?? '');
  const [engagementId, setEngagementId] = useState(current?.engagementId ?? '');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await setTag({
        sourceTable,
        sourceId,
        practiceId: practiceId || null,
        engagementId: engagementId || null,
        fahCostCentreId: current?.fahCostCentreId ?? null,
        overrideAccountCode: current?.overrideAccountCode ?? null,
      });
      toast.success(
        res.reposting
          ? t('chip.reposted', 'Practice changed; the GL entry is reposted')
          : t('chip.saved', 'Practice saved')
      );
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('chip.practiceTitle', 'Practice for the ledger')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label={t('chip.practice', 'Practice')}
            value={practiceId}
            onChange={(e) => setPracticeId(e.target.value)}
          >
            {practices
              .filter((p) => p.isActive)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label={t('chip.engagement', 'Engagement (optional)')}
            value={engagementId}
            onChange={(e) => setEngagementId(e.target.value)}
          >
            <MenuItem value="">
              <em>{t('chip.noEngagement', 'None')}</em>
            </MenuItem>
            {engagements
              .filter((g) => g.status !== 'CLOSED')
              .map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.code} · {g.name}
                </MenuItem>
              ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            {t(
              'chip.practiceHelp',
              'Only the ledger changes: the ERP record stays as it is. If it has posted, the entry is reversed and posted again with the new practice.'
            )}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!practiceId}
          onClick={handleSave}
        >
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
