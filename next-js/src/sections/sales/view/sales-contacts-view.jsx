'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { listPipelineDeals } from 'src/utils/apiHelper';

// ----------------------------------------------------------------------

export function SalesContactsView() {
  const router = useRouter();

  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  // Derive contacts from deals (deduplicated by email, then by name)
  const contacts = useMemo(() => {
    const seen = new Set();
    const result = [];

    deals.forEach((deal) => {
      if (!deal.contactName && !deal.contactEmail) return;
      const key = deal.contactEmail || deal.contactName;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        name: deal.contactName || '—',
        email: deal.contactEmail || '—',
        phone: deal.contactPhone || '—',
        company: deal.company,
        dealCount: deals.filter((d) => d.contactEmail === deal.contactEmail && d.contactEmail)
          .length,
        dealId: deal.id,
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [deals]);

  const initials = (name) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Contacts
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Contacts are derived from your pipeline deals. Add contacts by creating deals with contact
        info.
      </Typography>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contact</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Deals</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No contacts yet. Add contact details when creating deals.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.email + contact.name}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(paths.dashboard.sales.deals.details(contact.dealId))}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                        {initials(contact.name)}
                      </Avatar>
                      <Typography variant="body2">{contact.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{contact.company}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell align="right">{contact.dealCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
