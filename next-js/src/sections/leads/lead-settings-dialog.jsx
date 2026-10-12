'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { IOTA_API_HOST } from 'src/lib/iota-api';
import {
  apiMessage,
  saveLeadRouting,
  registerLeadWebhook,
  useLeadWebflowStatus,
} from 'src/actions/leads';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { LeadTemplatesEditor } from './lead-templates-editor';

// ----------------------------------------------------------------------

const KINDS = [
  { value: '', label: 'Not a lead' },
  { value: 'contact', label: 'Contact enquiry' },
  { value: 'careers', label: 'Careers application' },
  { value: 'newsletter', label: 'Newsletter' },
];

const keyOf = (f) => f.formElementId || f.formIds[0];

/**
 * Admin settings for website leads: the Webflow webhook, which form is which,
 * and the privacy notice version recorded with each consent.
 *
 * Forms are mapped by their form element, which is the same on every domain
 * the site is published to — the form's name is not used, because the contact
 * and careers forms are both named "Contact".
 */
export function LeadSettingsDialog({ open, onClose }) {
  const { status, error, loading } = useLeadWebflowStatus(open);
  const [choice, setChoice] = useState({}); // form key → kind
  const [newsletterNames, setNewsletterNames] = useState('');
  const [noticeVersion, setNoticeVersion] = useState('');
  const [apiUrl, setApiUrl] = useState(IOTA_API_HOST || '');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!status) return;
    setChoice(Object.fromEntries(status.forms.map((f) => [keyOf(f), f.routedAs || ''])));
    setNewsletterNames((status.routing?.newsletter?.names || []).join(', '));
    setNoticeVersion(status.noticeVersion || '');
  }, [status]);

  const save = async () => {
    setBusy('save');
    try {
      // Start from what is saved, drop every id of the listed forms, then add
      // them back under the kind chosen here — ids of forms Webflow no longer
      // lists are kept.
      const listedIds = new Set(status.forms.flatMap((f) => [f.formElementId, ...f.formIds]));
      const routing = {};
      ['contact', 'careers', 'newsletter'].forEach((kind) => {
        const saved = status.routing?.[kind] || {};
        routing[kind] = {
          formElementIds: (saved.formElementIds || []).filter((x) => !listedIds.has(x)),
          formIds: (saved.formIds || []).filter((x) => !listedIds.has(x)),
        };
      });
      status.forms.forEach((f) => {
        const kind = choice[keyOf(f)];
        if (!kind) return;
        if (f.formElementId) routing[kind].formElementIds.push(f.formElementId);
        routing[kind].formIds.push(...f.formIds);
      });
      routing.newsletter.names = newsletterNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await saveLeadRouting({ routing, noticeVersion: noticeVersion.trim() });
      toast.success('Lead settings saved.');
    } catch (err) {
      toast.error(apiMessage(err, 'The settings could not be saved.'));
    } finally {
      setBusy(null);
    }
  };

  const register = async () => {
    setBusy('register');
    try {
      await registerLeadWebhook(apiUrl.trim());
      toast.success('Webhook registered with Webflow.');
    } catch (err) {
      toast.error(apiMessage(err, 'The webhook could not be registered.'));
    } finally {
      setBusy(null);
    }
  };

  const hook = status?.webhook;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Lead settings</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiMessage(error, 'The settings could not be loaded.')}
          </Alert>
        ) : null}

        {status ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1">Webflow webhook</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                One webhook receives every form on the site. Registering again replaces the old one.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Label variant="soft" color={hook.registered ? 'success' : 'warning'}>
                  {hook.registered ? 'Registered' : 'Not registered'}
                </Label>
                {hook.registered ? (
                  <Label variant="soft" color={hook.signed ? 'success' : 'warning'}>
                    {hook.signed ? 'Signed by Webflow' : 'Unsigned — secret URL only'}
                  </Label>
                ) : null}
                {hook.registeredAt ? (
                  <Typography variant="caption" color="text.secondary">
                    {fDateTime(hook.registeredAt)} · site {hook.siteId}
                  </Typography>
                ) : null}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Public API address"
                  helperText="The address Webflow will call — the Encore API host for this environment."
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <LoadingButton
                  variant="outlined"
                  loading={busy === 'register'}
                  disabled={!/^https:\/\//.test(apiUrl.trim())}
                  onClick={register}
                  sx={{ flexShrink: 0, alignSelf: { sm: 'flex-start' } }}
                >
                  {hook.registered ? 'Register again' : 'Register'}
                </LoadingButton>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1">Forms on the site</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Choose what each form is. Submissions from a form left as “Not a lead” wait under
                Needs attention.
              </Typography>
              {status.formsError ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  The forms could not be read from Webflow: {status.formsError}
                </Alert>
              ) : null}
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Form</TableCell>
                      <TableCell>Form element</TableCell>
                      <TableCell align="center">Copies</TableCell>
                      <TableCell sx={{ width: 220 }}>Is a</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {status.forms.map((f) => (
                      <TableRow key={keyOf(f)}>
                        <TableCell>
                          <Typography variant="body2">{f.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {f.pageName || ''}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}
                        >
                          {f.formElementId || '—'}
                        </TableCell>
                        <TableCell
                          align="center"
                          title="One per published domain (the footer newsletter: one per page)"
                        >
                          {f.formIds.length}
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value={choice[keyOf(f)] ?? ''}
                            onChange={(e) =>
                              setChoice((c) => ({ ...c, [keyOf(f)]: e.target.value }))
                            }
                          >
                            {KINDS.map((k) => (
                              <MenuItem key={k.value} value={k.value}>
                                {k.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!status.forms.length && !status.formsError ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Webflow lists no forms for this site.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
              <TextField
                fullWidth
                size="small"
                label="Newsletter form names"
                helperText="Also matched by name, because the footer form is a separate copy on every page. Comma-separated."
                value={newsletterNames}
                onChange={(e) => setNewsletterNames(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1">Privacy notice</Typography>
              <TextField
                size="small"
                label="Current version"
                helperText="Recorded with each lead's consent. Change it whenever the website's privacy wording changes."
                value={noticeVersion}
                onChange={(e) => setNoticeVersion(e.target.value)}
                sx={{ mt: 1.5, maxWidth: 320 }}
                fullWidth
              />
            </Box>

            <Divider />

            <LeadTemplatesEditor enabled={open} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy === 'save'}
          disabled={!status || !noticeVersion.trim()}
          onClick={save}
        >
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
