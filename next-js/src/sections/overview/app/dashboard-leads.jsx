'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { LEAD_SOURCE } from 'src/sections/leads/lead-labels';
import { LeadReplyDialog } from 'src/sections/leads/lead-reply-dialog';

// ----------------------------------------------------------------------

/**
 * Website form submissions nobody has picked up yet, with a reply from the
 * home page. Shown only while there are some, so it reads as a prompt.
 */
export function DashboardLeads({ leads, sx }) {
  const [replyTo, setReplyTo] = useState(null);
  if (!leads?.awaitingReply) return null;

  const more = leads.awaitingReply - leads.recent.length;

  return (
    <Card sx={{ borderTop: 3, borderColor: 'warning.main', ...sx }}>
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1.5,
              bgcolor: 'warning.lighter',
              color: 'warning.dark',
            }}
          >
            <Iconify icon="solar:letter-bold" width={22} />
          </Box>
        }
        title={`${leads.awaitingReply} website enquir${leads.awaitingReply === 1 ? 'y' : 'ies'} awaiting reply`}
        subheader={
          leads.oldestWaitingSince
            ? `The oldest has waited ${fToNow(leads.oldestWaitingSince).replace(/ ago$/, '')}`
            : null
        }
        action={
          <Button
            size="small"
            component={RouterLink}
            href={paths.dashboard.sales.leads}
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
          >
            All leads
          </Button>
        }
        sx={{ '& .MuiCardHeader-action': { alignSelf: 'center' } }}
      />
      <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />} sx={{ p: 2, pt: 1.5 }}>
        {leads.recent.map((l) => (
          <Stack
            key={l.id}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            alignItems={{ sm: 'center' }}
            sx={{ py: 1.25 }}
          >
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {l.fullName || l.email}
                </Typography>
                <Label variant="soft" color={LEAD_SOURCE[l.source]?.color} sx={{ flexShrink: 0 }}>
                  {LEAD_SOURCE[l.source]?.short || l.source}
                </Label>
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {[l.fullName ? l.email : null, l.company].filter(Boolean).join(' · ')}
              </Typography>
              {l.message ? (
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                  “{l.message}”
                </Typography>
              ) : null}
            </Box>
            <Typography
              variant="caption"
              color="text.disabled"
              title={fDateTime(l.receivedAt)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {fToNow(l.receivedAt)}
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<Iconify icon="solar:letter-bold" width={16} />}
              onClick={() => setReplyTo(l.id)}
              sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              Reply
            </Button>
          </Stack>
        ))}
        {more > 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 1.5 }}>
            …and {more} more in{' '}
            <Box
              component={RouterLink}
              href={paths.dashboard.sales.leads}
              sx={{ color: 'primary.main' }}
            >
              Leads
            </Box>
            .
          </Typography>
        ) : null}
      </Stack>
      <LeadReplyDialog leadId={replyTo} onClose={() => setReplyTo(null)} />
    </Card>
  );
}
