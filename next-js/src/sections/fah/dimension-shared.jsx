'use client';

import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

/**
 * A dimension table in a card: title, help, an optional add button, and rows.
 * columns: [{ key, label, width?, align?, render(row) }]
 */
export function DimensionTable({
  title,
  help,
  addLabel,
  onAdd,
  columns,
  rows,
  onRowClick,
  minWidth = 720,
}) {
  const { t } = useFahT();
  return (
    <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ p: 2.5 }}
      >
        <Box>
          <Typography variant="h6">{title}</Typography>
          {help && (
            <Typography variant="body2" color="text.secondary">
              {help}
            </Typography>
          )}
        </Box>
        {onAdd && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={onAdd}
            sx={{ flexShrink: 0 }}
          >
            {addLabel}
          </Button>
        )}
      </Stack>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} width={c.width} align={c.align}>
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  component={m.tr}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: row.isActive === false ? 0.55 : 1 }}
                  exit={{ opacity: 0 }}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} align={c.align}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>
      {!rows.length && <EmptyContent title={t('dims.empty', 'Nothing here yet')} sx={{ py: 6 }} />}
    </Card>
  );
}

export function ActiveLabel({ active }) {
  const { t } = useFahT();
  return (
    <Label variant="soft" color={active ? 'success' : 'default'}>
      {active ? t('dims.active', 'Active') : t('dims.inactive', 'Inactive')}
    </Label>
  );
}

export function Code({ children }) {
  return (
    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }} noWrap>
      {children}
    </Typography>
  );
}

/** Create/edit dialog shell with Cancel and Save. */
export function DimensionDialog({ open, title, busy, valid, onClose, onSave, children }) {
  const { t } = useFahT();
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {children}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} disabled={!valid} onClick={onSave}>
          {t('common.save', 'Save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/** '' for null; the API takes null for "none". */
export const orNull = (v) => (v === '' || v === undefined ? null : v);
export const orEmpty = (v) => (v === null || v === undefined ? '' : v);
