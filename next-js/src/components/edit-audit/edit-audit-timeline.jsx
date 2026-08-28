'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { useEditAudit } from 'src/actions/admin-edit-mode';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { EditAuditChanges } from './edit-audit-changes';

// ----------------------------------------------------------------------
// Per-record edit history: every change a super-admin made to this invoice or
// expense while Record Edit Mode was open. Renders nothing at all when the
// record has never been edited that way, so it stays out of the way.
// ----------------------------------------------------------------------

export function EditAuditTimeline({
  entityType,
  entityId,
  title = 'Edit history',
  hideWhenEmpty = true,
  sx,
}) {
  const { auditEntries, auditLoading } = useEditAudit({
    entityType,
    entityId,
    limit: 50,
    enabled: !!entityId,
  });

  if (auditLoading) {
    return (
      <Card sx={sx}>
        <CardHeader title={title} />
        <Box sx={{ p: 3 }}>
          <Skeleton height={24} />
          <Skeleton height={24} width="70%" />
        </Box>
      </Card>
    );
  }

  if (!auditEntries.length) {
    if (hideWhenEmpty) return null;
    return (
      <Card sx={sx}>
        <CardHeader title={title} />
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No edits have been recorded for this record.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={sx}>
      <CardHeader
        title={title}
        subheader={`${auditEntries.length} recorded ${
          auditEntries.length === 1 ? 'change' : 'changes'
        } made under Record Edit Mode`}
        avatar={<Iconify icon="solar:history-bold" width={24} />}
      />

      <Stack sx={{ p: 3, pt: 2 }} divider={<Divider sx={{ my: 2, borderStyle: 'dashed' }} />}>
        {auditEntries.map((entry) => (
          <Stack key={entry.id} spacing={1}>
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle2">
                {entry.actorName || entry.actorEmail}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {fDateTime(entry.occurredAt)}
              </Typography>

              {entry.entityStage && (
                <Label variant="soft" color="warning">
                  edited while {entry.entityStage}
                </Label>
              )}
            </Box>

            {entry.actorName && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {entry.actorEmail}
              </Typography>
            )}

            <EditAuditChanges changes={entry.changes} />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
