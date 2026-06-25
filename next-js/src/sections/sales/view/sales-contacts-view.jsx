'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LoadingButton from '@mui/lab/LoadingButton';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { useAuthContext } from 'src/auth/hooks';
import { listPipelineDeals } from 'src/utils/apiHelper';
import axios, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export function SalesContactsView() {
  const router = useRouter();
  const { user } = useAuthContext();

  const { data, isLoading } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  // Apollo state — superAdmin only
  const [apolloQuery, setApolloQuery] = useState('');
  const [apolloSearchBy, setApolloSearchBy] = useState('name');
  const [apolloSearching, setApolloSearching] = useState(false);
  const [apolloResults, setApolloResults] = useState([]);
  const [apolloPage, setApolloPage] = useState(1);
  const [apolloTotalEntries, setApolloTotalEntries] = useState(0);
  const [apolloHasMore, setApolloHasMore] = useState(false);
  const [apolloCredits, setApolloCredits] = useState(null);
  const [apolloCreditsChecked, setApolloCreditsChecked] = useState(false);
  const [apolloEnriching, setApolloEnriching] = useState(null);
  const [apolloEnrichedPerson, setApolloEnrichedPerson] = useState(null);
  const [apolloError, setApolloError] = useState(null);
  const [apolloSavingId, setApolloSavingId] = useState(null);
  const [apolloSavedIds, setApolloSavedIds] = useState(new Set());
  const [apolloSavedContacts, setApolloSavedContacts] = useState([]);
  const [apolloSavedLoading, setApolloSavedLoading] = useState(false);

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

  const handleApolloSearch = async () => {
    if (!apolloQuery.trim()) return;
    setApolloSearching(true);
    setApolloResults([]);
    setApolloPage(1);
    setApolloTotalEntries(0);
    setApolloHasMore(false);
    setApolloEnrichedPerson(null);
    setApolloError(null);
    try {
      const res = await axios.post(endpoints.apollo.peopleSearch, {
        query: apolloQuery.trim(),
        searchBy: apolloSearchBy,
        page: 1,
      });
      const people = res?.data?.people ?? res?.people ?? [];
      const total = res?.data?.totalEntries ?? res?.totalEntries ?? 0;
      const credits = res?.data?.credits ?? null;
      setApolloResults(people);
      setApolloTotalEntries(total);
      setApolloHasMore(people.length > 0 && people.length < total);
      setApolloCredits(credits);
      setApolloCreditsChecked(true);
      if (people.length === 0) {
        setApolloError(
          apolloSearchBy === 'company'
            ? 'No people found under this company.'
            : 'No people found for this name query.'
        );
      }
    } catch (err) {
      console.error('Apollo search failed', err);
      setApolloError(
        err?.response?.data?.message || 'Search failed. Check Apollo API key configuration.'
      );
    } finally {
      setApolloSearching(false);
    }
  };

  const handleApolloLoadMore = async () => {
    const nextPage = apolloPage + 1;
    setApolloSearching(true);
    try {
      const res = await axios.post(endpoints.apollo.peopleSearch, {
        query: apolloQuery.trim(),
        searchBy: apolloSearchBy,
        page: nextPage,
      });
      const people = res?.data?.people ?? res?.people ?? [];
      const total = res?.data?.totalEntries ?? res?.totalEntries ?? apolloTotalEntries;
      const merged = [...apolloResults, ...people];
      setApolloResults(merged);
      setApolloPage(nextPage);
      setApolloTotalEntries(total);
      setApolloHasMore(merged.length < total && people.length > 0);
    } catch (err) {
      setApolloError(err?.response?.data?.message || 'Failed to load more results.');
    } finally {
      setApolloSearching(false);
    }
  };

  const fetchSavedApolloContacts = async () => {
    setApolloSavedLoading(true);
    try {
      const res = await axios.get(endpoints.apollo.savedContacts);
      setApolloSavedContacts(res?.data?.contacts ?? []);
    } catch (err) {
      console.error('Failed to fetch saved Apollo contacts', err);
    } finally {
      setApolloSavedLoading(false);
    }
  };

  const handleApolloSaveContact = async (person) => {
    setApolloSavingId(person.id);
    try {
      await axios.post(endpoints.apollo.saveContact, {
        apolloId: person.id,
        name: person.name,
        title: person.title ?? null,
        company: person.company ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
      });
      setApolloSavedIds((prev) => new Set([...prev, person.id]));
      fetchSavedApolloContacts();
    } catch (err) {
      setApolloError(err?.response?.data?.message || 'Failed to save contact.');
    } finally {
      setApolloSavingId(null);
    }
  };

  // Load saved Apollo contacts once on mount (superAdmin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user?.role === 'superAdmin') fetchSavedApolloContacts(); }, []);

  const handleApolloEnrich = async (person) => {
    setApolloEnriching(person.id);
    setApolloEnrichedPerson(null);
    setApolloError(null);
    try {
      const res = await axios.post(endpoints.apollo.peopleEnrich, {
        apolloId: person.id,
        name: person.name,
        organizationName: person.company,
      });
      const enriched = res?.data ?? res;
      setApolloEnrichedPerson({
        ...enriched,
        displayName: person.name,
        apolloId: person.id,
        title: person.title ?? null,
        company: person.company ?? null,
      });
      setApolloCredits(enriched?.credits ?? null);
      setApolloCreditsChecked(true);
    } catch (err) {
      console.error('Apollo enrich failed', err);
      setApolloError(err?.response?.data?.message || 'Failed to fetch contact details.');
    } finally {
      setApolloEnriching(null);
    }
  };

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

      {/* ── Apollo Intelligence Panel (superAdmin only) ─────────────────── */}
      {user?.role === 'superAdmin' && (
        <Card sx={{ mb: 3, p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Apollo.io Intelligence
            </Typography>
            <Chip label="Super Admin" size="small" color="warning" variant="soft" />
          </Stack>

          <Stack direction="row" spacing={1} mb={2}>
            <TextField
              select
              size="small"
              label="Search by"
              value={apolloSearchBy}
              onChange={(e) => setApolloSearchBy(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="name">Search by Name</MenuItem>
              <MenuItem value="company">Search by Company</MenuItem>
            </TextField>

            <TextField
              size="small"
              placeholder={
                apolloSearchBy === 'company'
                  ? 'Enter company name (e.g. IOTA Technologies)'
                  : 'Enter person/resource name'
              }
              value={apolloQuery}
              onChange={(e) => setApolloQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApolloSearch();
              }}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box component="span" sx={{ color: 'text.disabled', fontSize: 18 }}>
                      🔍
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            <LoadingButton
              loading={apolloSearching}
              variant="contained"
              onClick={handleApolloSearch}
              disabled={!apolloQuery.trim()}
            >
              Search
            </LoadingButton>
          </Stack>

          {apolloError && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setApolloError(null)}>
              {apolloError}
            </Alert>
          )}

          {apolloCreditsChecked && (
            <>
              {apolloCredits ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
                  <Chip
                    size="small"
                    color="info"
                    variant="soft"
                    label={`Apollo credits left (day): ${apolloCredits?.day?.leftOver ?? '—'}`}
                  />
                  <Chip
                    size="small"
                    color="default"
                    variant="soft"
                    label={`Hour: ${apolloCredits?.hour?.leftOver ?? '—'}`}
                  />
                  <Chip
                    size="small"
                    color="default"
                    variant="soft"
                    label={`Minute: ${apolloCredits?.minute?.leftOver ?? '—'}`}
                  />
                </Stack>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Apollo credits are currently unavailable for this request. This usually means the
                  API key does not have usage-stats permission (master key required) or data came
                  from Contact DB cache.
                </Alert>
              )}
            </>
          )}

          {/* Search results table */}
          {apolloResults.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {apolloSearchBy === 'company'
                  ? `Found ${apolloResults.length} people under this company.`
                  : `Found ${apolloResults.length} people matching this name query.`}{' '}
                Click &quot;Fetch Details&quot; to retrieve email and phone.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Has Email</TableCell>
                    <TableCell>Has Phone</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apolloResults.map((person) => (
                    <TableRow key={person.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {person.name || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {person.title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {person.company || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={person.hasEmail ? 'Yes' : 'No'}
                          size="small"
                          color={person.hasEmail ? 'success' : 'default'}
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={person.hasPhone ? 'Yes' : 'No'}
                          size="small"
                          color={person.hasPhone ? 'info' : 'default'}
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell>
                        <LoadingButton
                          size="small"
                          variant="outlined"
                          loading={apolloEnriching === person.id}
                          onClick={() => handleApolloEnrich(person)}
                        >
                          Fetch Details
                        </LoadingButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {/* Enriched contact card */}
          {apolloEnrichedPerson && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" mb={1}>
                  {apolloEnrichedPerson.name || apolloEnrichedPerson.displayName}
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <Box component="span" fontWeight={500} mr={0.5}>
                      Email:
                    </Box>
                    {apolloEnrichedPerson.email || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <Box component="span" fontWeight={500} mr={0.5}>
                      Phone:
                    </Box>
                    {apolloEnrichedPerson.phone || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Source:{' '}
                    {apolloEnrichedPerson.source === 'cache' ? 'Contact DB (cached)' : 'Apollo'}
                    {apolloEnrichedPerson.fetchedAt
                      ? ` • Fetched: ${new Date(apolloEnrichedPerson.fetchedAt).toLocaleString()}`
                      : ''}
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </Card>
      )}

      {/* ── Pipeline Contacts Table ──────────────────────────────────────── */}
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
