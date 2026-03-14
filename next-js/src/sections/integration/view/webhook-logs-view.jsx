'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';
import { getWebhookEvents, getLogDrainStatus, toggleLogDrain } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const SOURCE_COLOR = {
  resend: 'primary',
  vercel: 'default',
  encore: 'warning',
};

const SOURCE_ICON = {
  resend: 'simple-icons:resend',
  vercel: 'simple-icons:vercel',
  encore: 'material-symbols:bolt',
};

const ALL_SOURCES = ['all', 'resend', 'vercel', 'encore'];

// ----------------------------------------------------------------------

export function WebhookLogsView({ source: initialSource = 'all' }) {
  const [tab, setTab] = useState(initialSource);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [logDrainEnabled, setLogDrainEnabled] = useState(false);
  const [drainToggling, setDrainToggling] = useState(false);

  const currentSource = tab === 'all' ? undefined : tab;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWebhookEvents({
        source: currentSource,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setRows(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch webhook events:', err);
    } finally {
      setLoading(false);
    }
  }, [currentSource, page, rowsPerPage]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Load log drain status on mount
  useEffect(() => {
    getLogDrainStatus().then((data) => setLogDrainEnabled(data.enabled));
  }, []);

  const handleDrainToggle = async (e) => {
    setDrainToggling(true);
    const data = await toggleLogDrain(e.target.checked);
    setLogDrainEnabled(data.enabled);
    setDrainToggling(false);
  };

  // Reset page when tab changes
  const handleTabChange = (_, newValue) => {
    setTab(newValue);
    setPage(0);
  };

  const breadcrumbLinks = [
    { name: 'Dashboard', href: paths.dashboard.root },
    { name: 'Integrations', href: paths.dashboard.integration.root },
    { name: 'Webhook Logs' },
  ];

  if (initialSource !== 'all') {
    breadcrumbLinks[2] = { name: 'Webhook Logs', href: paths.dashboard.webhookLogs.root };
    breadcrumbLinks.push({ name: initialSource.charAt(0).toUpperCase() + initialSource.slice(1) });
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Webhook Logs"
        links={breadcrumbLinks}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {(tab === 'vercel' || tab === 'all') && (
              <FormControlLabel
                control={
                  <Switch
                    checked={logDrainEnabled}
                    onChange={handleDrainToggle}
                    disabled={drainToggling}
                    color="warning"
                    size="small"
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    color={logDrainEnabled ? 'warning.main' : 'text.secondary'}
                  >
                    {logDrainEnabled ? 'Log Drain: ON' : 'Log Drain: OFF'}
                  </Typography>
                }
              />
            )}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              onClick={fetchEvents}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {ALL_SOURCES.map((s) => (
            <Tab
              key={s}
              value={s}
              label={s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1)}
              icon={s !== 'all' ? <Iconify icon={SOURCE_ICON[s]} width={16} /> : undefined}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <EmptyContent
            filled
            title="No webhook events found"
            description="Webhook events will appear here once your endpoints start receiving traffic."
            sx={{ py: 10 }}
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Source</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Received At</TableCell>
                    <TableCell align="right">Payload</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          color={SOURCE_COLOR[event.source] || 'default'}
                          icon={
                            <Iconify icon={SOURCE_ICON[event.source] || 'mdi:webhook'} width={14} />
                          }
                          label={event.source}
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {event.eventType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={event.status}
                          color={event.status === 'failed' ? 'error' : 'success'}
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {fDateTime(event.receivedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View payload">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedEvent(event)}
                          >
                            View
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      {/* Payload detail dialog */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {selectedEvent && (
              <Chip
                size="small"
                color={SOURCE_COLOR[selectedEvent.source] || 'default'}
                label={selectedEvent.source}
                variant="soft"
              />
            )}
            <Typography variant="subtitle1">{selectedEvent?.eventType}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block">
            {selectedEvent && fDateTime(selectedEvent.receivedAt)}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              bgcolor: 'background.neutral',
              p: 2,
              borderRadius: 1,
              overflowX: 'auto',
              maxHeight: 500,
            }}
          >
            {selectedEvent ? JSON.stringify(selectedEvent.payload, null, 2) : ''}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
