'use client';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useTalentRequirements } from 'src/actions/talent';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PRIORITY, REQUIREMENT_STATUS } from '../constants';

// ----------------------------------------------------------------------

export function RequirementListView() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { requirements, loading, error } = useTalentRequirements({
    q: q || undefined,
    status: status || undefined,
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Client Requirements"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Talent', href: paths.dashboard.talent.root },
          { name: 'Requirements' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.talent.requirements.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New requirement
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role, client or requirement text…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {Object.entries(REQUIREMENT_STATUS).map(([key, s]) => (
              <MenuItem key={key} value={key}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {error ? (
          <Typography color="error" sx={{ px: 3, pb: 3 }}>
            {error?.response?.data?.message || error.message}
          </Typography>
        ) : null}

        <TableContainer>
          <Scrollbar>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Received</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requirements.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(paths.dashboard.talent.requirements.details(r.id))}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">{r.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[r.location, r.experienceYears ? `${r.experienceYears}+ yrs` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.clientName}</TableCell>
                    <TableCell>{r.sourceType === 'jd' ? 'Full JD' : 'One-liner'}</TableCell>
                    <TableCell>
                      <Label variant="soft" color={PRIORITY[r.priority]?.color || 'default'}>
                        {PRIORITY[r.priority]?.label || r.priority}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <Label
                        variant="soft"
                        color={REQUIREMENT_STATUS[r.status]?.color || 'default'}
                      >
                        {REQUIREMENT_STATUS[r.status]?.label || r.status}
                      </Label>
                    </TableCell>
                    <TableCell>{fDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        {!loading && !error && requirements.length === 0 ? (
          <EmptyContent
            title="No requirements yet"
            description="Add a client requirement — a full JD or a one-liner — to start."
            sx={{ py: 8 }}
          />
        ) : null}
      </Card>
    </DashboardContent>
  );
}
