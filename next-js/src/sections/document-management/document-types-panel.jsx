'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { saveDocumentTypes, useDocumentCatalog } from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const MAX_TYPES = 15;

let nextKey = 0;
const withKey = (t) => ({ ...t, key: t.id ? `t${t.id}` : `n${(nextKey += 1)}` });

/**
 * Document types, kept in appConfig and shared by all practices: each is
 * tagged to the practices that use it. A type's number is written into every
 * document ID and its code onto every document, so a saved type can be
 * renamed, re-tagged or switched off, but its code is fixed and it cannot be
 * removed. Super-admins edit; everyone else reads.
 */
export function DocumentTypesPanel() {
  const { practices, types, canEditTypes, error, loading } = useDocumentCatalog();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setRows(types.map(withKey));
  }, [types]);

  const original = JSON.stringify(
    types.map(({ id, code, name, practices: p, active }) => ({ id, code, name, p, active }))
  );
  const current = JSON.stringify(
    rows.map(({ id, code, name, practices: p, active }) => ({ id, code, name, p, active }))
  );
  const dirty = original !== current;

  const update = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const togglePractice = (row, practiceId) =>
    update(row.key, {
      practices: row.practices.includes(practiceId)
        ? row.practices.filter((p) => p !== practiceId)
        : [...row.practices, practiceId].sort(),
    });

  const handleAdd = () =>
    setRows((prev) => [
      ...prev,
      withKey({ code: '', name: '', practices: practices.map((p) => p.id), active: true }),
    ]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await saveDocumentTypes(
        rows.map(({ id, code, name, practices: p, active }) => ({
          ...(id ? { id } : {}),
          code: code.trim().toUpperCase(),
          name: name.trim(),
          practices: p,
          active,
        }))
      );
      toast.success('Document types saved');
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const editable = canEditTypes;

  return (
    <Card
      component={m.div}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        sx={{ p: 2.5 }}
      >
        <Box sx={{ maxWidth: 720 }}>
          <Typography variant="h6">Document types</Typography>
          <Typography variant="body2" color="text.secondary">
            One list for every practice: tick the practices each type applies to. A type&apos;s
            number is part of every document ID issued under it, so a saved type can be renamed,
            re-tagged or switched off, but not removed, and its code is fixed. Up to {MAX_TYPES}{' '}
            types.
          </Typography>
        </Box>
        {editable && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleAdd}
              disabled={rows.length >= MAX_TYPES}
            >
              Add type
            </Button>
            <AnimatePresence>
              {dirty && (
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" onClick={() => setRows(types.map(withKey))}>
                      Discard
                    </Button>
                    <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
                      Save changes
                    </LoadingButton>
                  </Stack>
                </m.div>
              )}
            </AnimatePresence>
          </Stack>
        )}
      </Stack>

      <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>

      {!editable && !loading && (
        <Alert severity="info" sx={{ mx: 2.5, mb: 2 }}>
          Only a super-admin can change document types.
        </Alert>
      )}
      {(error || saveError) && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {saveError || error.response?.data?.message || error.message}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell width={56}>#</TableCell>
              <TableCell width={120}>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Practices</TableCell>
              <TableCell width={96} align="center">
                Active
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence initial={false}>
              {rows.map((row, index) => (
                <TableRow
                  key={row.key}
                  component={m.tr}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: row.active ? 1 : 0.55, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: row.id ? Math.min(index, 10) * 0.03 : 0 }}
                >
                  <TableCell>
                    {row.id ? (
                      <Typography variant="body2" color="text.secondary">
                        {row.id}
                      </Typography>
                    ) : (
                      <Label variant="soft" color="info">
                        New
                      </Label>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.id || !editable ? (
                      <Tooltip title={row.id ? 'Fixed: documents already carry this code' : ''}>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                          {row.code}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <TextField
                        size="small"
                        value={row.code}
                        placeholder="e.g. MOU"
                        onChange={(e) =>
                          update(row.key, {
                            code: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, '')
                              .slice(0, 4),
                          })
                        }
                        inputProps={{ style: { fontFamily: 'monospace' } }}
                        autoFocus
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={row.name}
                        placeholder="e.g. Memorandum of Understanding"
                        onChange={(e) => update(row.key, { name: e.target.value })}
                      />
                    ) : (
                      <Typography variant="body2">{row.name}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {practices.map((p) => {
                        const on = row.practices.includes(p.id);
                        return (
                          <Tooltip key={p.id} title={p.name}>
                            <Chip
                              component={m.div}
                              whileTap={editable ? { scale: 0.9 } : undefined}
                              size="small"
                              label={p.code}
                              color={on ? 'primary' : 'default'}
                              variant={on ? 'filled' : 'outlined'}
                              onClick={editable ? () => togglePractice(row, p.id) : undefined}
                              sx={{ fontFamily: 'monospace', minWidth: 48 }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={row.active}
                      disabled={!editable}
                      onChange={(e) => update(row.key, { active: e.target.checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ p: 2.5 }}>
        {practices.map((p) => (
          <Typography key={p.id} variant="caption" color="text.secondary">
            <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {p.code}
            </Box>{' '}
            {p.name}
          </Typography>
        ))}
      </Stack>
    </Card>
  );
}
