'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const METHOD_LABEL = { drawn: 'Drawn', typed: 'Typed', phone: 'Signed on phone' };

/** SHA-256 hex of a string, in the browser — matches shared/signature-id.ts. */
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Does the stored image still hash to what the API recorded when it was
 * signed? true / false, or null while checking / when there is nothing to check.
 */
function useIntact(signatureData, signatureHash) {
  const [intact, setIntact] = useState(null);
  useEffect(() => {
    let live = true;
    setIntact(null);
    if (signatureData && signatureHash && globalThis.crypto?.subtle) {
      sha256Hex(signatureData)
        .then((h) => live && setIntact(h === signatureHash))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [signatureData, signatureHash]);
  return intact;
}

function copy(text) {
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success('Signature ID copied'))
    .catch(() => {});
}

function LogEntry({ entry }) {
  const intact = useIntact(entry.signatureData, entry.signatureHash);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Iconify
        icon="solar:pen-bold"
        color="text.secondary"
        width={16}
        sx={{ mt: 0.5, flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" fontWeight={600}>
            {entry.name || entry.email}
          </Typography>
          <Chip size="small" variant="outlined" label={entry.side} />
          {entry.signatureMethod && (
            <Chip
              size="small"
              variant="soft"
              label={METHOD_LABEL[entry.signatureMethod] || entry.signatureMethod}
            />
          )}
          {intact === false && (
            <Tooltip title="The stored image no longer matches the hash recorded when it was signed.">
              <Chip size="small" color="error" variant="soft" label="Image changed" />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block">
          {entry.email}
          {' · '}
          {new Date(entry.signedAt).toLocaleString()}
          {entry.ipAddress && ` · IP: ${entry.ipAddress}`}
        </Typography>
        {entry.signatureId ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', letterSpacing: 0.3, wordBreak: 'break-all' }}
            >
              ({entry.signatureId})
            </Typography>
            <Tooltip title="Copy signature ID">
              <IconButton size="small" onClick={() => copy(entry.signatureId)}>
                <Iconify icon="solar:copy-bold" width={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.disabled" display="block">
            Signed before signature IDs were issued
          </Typography>
        )}
        {entry.signatureHash && (
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
          >
            SHA-256 {entry.signatureHash}
            {intact === true && ' ✓'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/**
 * Every signature on a document, with the signature ID printed in its frame
 * on the document, how it was captured, and whether the stored image still
 * matches the hash taken when it was signed. Dashboard only.
 *
 * Props:
 *  - entries: [{ side, name, email, signedAt, ipAddress, signatureId,
 *               signatureHash, signatureMethod, signatureData }]
 */
export function SignatureLog({ entries }) {
  const signed = (entries || []).filter((e) => e?.signedAt);
  if (signed.length === 0) return null;

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Signature Log
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        The ID in brackets is printed in the frame around each signature on the document.
      </Typography>
      <Stack spacing={2}>
        {[...signed]
          .sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt))
          .map((entry) => (
            <LogEntry key={`${entry.side}:${entry.email}:${entry.signedAt}`} entry={entry} />
          ))}
      </Stack>
    </Card>
  );
}
