'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { STAMP_CORNERS, DEFAULT_STAMP_POSITIONS } from 'src/utils/document-stamp';

import { updateManagedDocument } from 'src/actions/document-management';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const PARTS = [
  { key: 'classification', label: 'Classification', color: 'error' },
  { key: 'documentId', label: 'Document ID', color: 'primary' },
];

const CORNER_LABEL = {
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
};

/** A miniature first page: tap a corner to put this part of the stamp there. */
function CornerPicker({ part, value, onPick, disabled }) {
  return (
    <Box
      sx={(theme) => ({
        width: 72,
        height: 100,
        flexShrink: 0,
        borderRadius: 0.75,
        position: 'relative',
        bgcolor: 'background.paper',
        border: `1px solid ${theme.vars.palette.divider}`,
        boxShadow: theme.vars.customShadows.z1,
      })}
    >
      {/* Faint body lines so it reads as a page. */}
      {[30, 40, 50, 60, 70].map((top) => (
        <Box
          key={top}
          sx={{ position: 'absolute', top, left: 14, right: 14, height: 2, bgcolor: 'divider' }}
        />
      ))}
      {STAMP_CORNERS.map((corner) => {
        const top = corner.startsWith('top');
        const right = corner.endsWith('right');
        const selected = value === corner;
        return (
          <Tooltip key={corner} title={CORNER_LABEL[corner]}>
            <ButtonBase
              disabled={disabled}
              onClick={() => onPick(corner)}
              sx={{
                width: 26,
                height: 22,
                borderRadius: 0.5,
                position: 'absolute',
                ...(top ? { top: 2 } : { bottom: 2 }),
                ...(right ? { right: 2 } : { left: 2 }),
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {selected ? (
                <Box
                  component={m.div}
                  layoutId={`stamp-${part.key}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  sx={(theme) => ({
                    width: 18,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: `${part.color}.main`,
                    boxShadow: `0 0 0 3px ${varAlpha(theme.vars.palette[part.color].mainChannel, 0.2)}`,
                  })}
                />
              ) : (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'grey.400' }} />
              )}
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
}

/**
 * Where the stamp prints on page one of this document — the classification and
 * the document ID line, each in its own corner. Used for every PDF handed out
 * from here, and for a proposal's own PDF.
 */
export function DocumentStampCard({ document, sx }) {
  const positions = { ...DEFAULT_STAMP_POSITIONS, ...document.stampPositions };
  const [saving, setSaving] = useState('');

  const handlePick = async (key, corner) => {
    if (positions[key] === corner) return;
    setSaving(key);
    try {
      await updateManagedDocument(document.documentId, {
        stampPositions: { ...positions, [key]: corner },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not move the stamp.');
    } finally {
      setSaving('');
    }
  };

  return (
    <Card sx={[{ p: 2.5 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Typography variant="subtitle1">Stamp</Typography>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
        Printed as text on page one of every PDF downloaded or previewed here. Tap a corner to move
        each part.
      </Typography>
      <Stack direction="row" spacing={3} justifyContent="center">
        {PARTS.map((part) => (
          <Stack key={part.key} spacing={1} alignItems="center">
            <CornerPicker
              part={part}
              value={positions[part.key]}
              disabled={Boolean(saving)}
              onPick={(corner) => handlePick(part.key, corner)}
            />
            <Stack direction="row" spacing={0.75} alignItems="center">
              {saving === part.key ? (
                <CircularProgress size={12} />
              ) : (
                <Box
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${part.color}.main` }}
                />
              )}
              <Typography variant="caption">{part.label}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {CORNER_LABEL[positions[part.key]]}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
