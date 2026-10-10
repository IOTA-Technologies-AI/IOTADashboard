'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { useIssues } from 'src/actions/issues';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { STATUS, SEVERITY } from '../issue-labels';
import { ReportIssueDialog } from '../report-issue-dialog';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All' },
  ...['new', 'triaged', 'in_progress', 'fixed'].map((s) => ({ value: s, label: STATUS[s].label })),
];

const OPEN = ['new', 'triaged', 'in_progress'];

export function IssueListView() {
  const [tab, setTab] = useState('open');
  const [reporting, setReporting] = useState(false);
  const { issues, canManage, error, loading, refresh } = useIssues(
    tab === 'open' || tab === 'all' ? 'all' : tab
  );
  const rows = tab === 'open' ? issues.filter((i) => OPEN.includes(i.status)) : issues;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Issues"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Issues' }]}
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:danger-triangle-bold" />}
            onClick={() => setReporting(true)}
          >
            Report an issue
          </Button>
        }
        sx={{ mb: 3 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {canManage
          ? 'Every issue reported by users, with the screenshots, browser logs, failed API calls, backend errors and Sentry events captured with each.'
          : 'Issues you reported. The team is notified of each one.'}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error.message}
        </Alert>
      ) : null}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
        {loading ? <LinearProgress /> : null}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                {canManage ? <TableCell>Reported by</TableCell> : null}
                <TableCell>Evidence</TableCell>
                <TableCell>Reported</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((i) => (
                <TableRow
                  key={i.id}
                  hover
                  component={RouterLink}
                  href={paths.dashboard.issues.details(i.id)}
                  sx={{ textDecoration: 'none' }}
                >
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {i.ticketNumber}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{i.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {i.pageUrl}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={SEVERITY[i.severity]?.color}>
                      {SEVERITY[i.severity]?.label || i.severity}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={STATUS[i.status]?.color}>
                      {STATUS[i.status]?.label || i.status}
                    </Label>
                  </TableCell>
                  {canManage ? <TableCell>{i.reporterName || i.reporterEmail}</TableCell> : null}
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {i.apiErrorCount} backend · {i.sentryEventCount} Sentry
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fToNow(i.createdAt)}</TableCell>
                </TableRow>
              ))}
              {!loading && !rows.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 3, textAlign: 'center' }}
                    >
                      No issues here.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ReportIssueDialog
        open={reporting}
        onClose={() => {
          setReporting(false);
          refresh();
        }}
      />
    </DashboardContent>
  );
}
