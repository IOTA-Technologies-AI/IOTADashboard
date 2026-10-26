'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { fahError, useAllocationRun, useAllocationRuns } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';
import { ruleSummary } from './allocation-run';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/** Every allocation run of a book, and what each was computed from (FR-CC-6). */
export function AllocationHistory({ bookId }) {
  const { t } = useFahT();
  const { runs, error, loading } = useAllocationRuns(bookId);
  const [openId, setOpenId] = useState(null);

  return (
    <Card>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !runs.length ? (
        <EmptyContent title={t('history.empty', 'No allocation posted yet')} sx={{ py: 8 }} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('history.month', 'Month')}</TableCell>
              <TableCell>{t('history.status', 'Status')}</TableCell>
              <TableCell align="right">{t('history.total', 'Allocated')}</TableCell>
              <TableCell>{t('history.posted', 'Posted')}</TableCell>
              <TableCell>{t('history.note', 'Note')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r.id)}>
                <TableCell>{r.periodName}</TableCell>
                <TableCell>
                  <Label variant="soft" color={r.status === 'POSTED' ? 'success' : 'default'}>
                    {r.status === 'POSTED'
                      ? t('history.live', 'In force')
                      : r.replacesRunId || r.reversedAt
                        ? t('history.reversed', 'Reversed')
                        : r.status}
                  </Label>
                </TableCell>
                <TableCell align="right" sx={num}>
                  {fAmount(r.total)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{r.postedBy}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fDateTime(r.postedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {r.note}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <RunDrawer id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

function RunDrawer({ id, onClose }) {
  const { t } = useFahT();
  const { run, error, loading } = useAllocationRun(id);

  return (
    <Drawer
      anchor="right"
      open={Boolean(id)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 1, md: 640 } } }}
    >
      <Stack direction="row" alignItems="center" sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {run ? t('history.drawerTitle', 'Allocation, {{month}}', { month: run.periodName }) : ''}
        </Typography>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
      <Divider />
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {run && (
        <Box sx={{ p: 2.5, overflowY: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('history.by', 'Posted by {{who}}, {{when}}', {
              who: run.postedBy,
              when: fDateTime(run.postedAt),
            })}
            {run.reversedAt
              ? ` · ${t('history.reversedBy', 'reversed by {{who}}, {{when}}', { who: run.reversedBy, when: fDateTime(run.reversedAt) })}`
              : ''}
          </Typography>

          {run.result
            .filter((c) => c.shares.length)
            .map((c) => (
              <Box key={c.costCentreId} sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2">
                  {c.code} · v{c.version} · {ruleSummary(t, c)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ mb: 0.5 }}
                >
                  {t(
                    'history.formula',
                    'Own cost {{direct}} + received {{received}} = {{pool}}, spread by {{total}} driver units',
                    {
                      direct: fAmount(c.direct),
                      received: fAmount(c.received),
                      pool: fAmount(c.pool),
                      total: c.driverTotal,
                    }
                  )}
                </Typography>
                <Table size="small">
                  <TableBody>
                    {c.shares.map((s) => (
                      <TableRow key={s.targetId}>
                        <TableCell>
                          {s.kind === 'centre' ? `→ ${s.targetCode}` : s.targetCode}
                        </TableCell>
                        <TableCell align="right" sx={num}>
                          {s.driverValue}
                        </TableCell>
                        <TableCell align="right" sx={num}>
                          {s.percent} %
                        </TableCell>
                        <TableCell align="right" sx={num}>
                          {fAmount(s.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            {t('history.journals', 'Journals')}
          </Typography>
          <Stack spacing={0.5}>
            {run.journals.map((j) => (
              <Stack key={j.id} direction="row" spacing={1} alignItems="center">
                <Link
                  component={RouterLink}
                  href={paths.dashboard.finance.accounting.journal(j.id)}
                >
                  {j.journalNumber ?? j.id.slice(0, 8)}
                </Link>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {j.description}
                </Typography>
                <Label variant="soft">{j.status}</Label>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
