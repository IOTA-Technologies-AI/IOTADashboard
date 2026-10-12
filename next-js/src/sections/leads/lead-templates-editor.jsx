'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { apiMessage, useLeadTemplates, saveLeadTemplates } from 'src/actions/leads';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const KINDS = [
  { value: 'contact', label: 'Contact enquiry' },
  { value: 'careers', label: 'Careers application' },
  { value: 'newsletter', label: 'Newsletter' },
];

const PLACEHOLDERS = [
  ['{{greeting}}', '“Dear Sara,” — or “Hello,” when there is no name'],
  ['{{firstName}} / {{fullName}}', 'the person’s name'],
  ['{{company}}', 'their company, when the form asked'],
  ['{{signature}}', 'the signature set in appConfig (leads › replySender)'],
  ['{{senderName}} / {{senderEmail}}', 'whoever presses Send'],
  ['{{receivedDate}}', 'when the form was submitted'],
];

/**
 * The standard reply for each kind of form — what “Reply by email” opens with,
 * on the home page and in the Leads inbox. The sender can still edit it.
 */
export function LeadTemplatesEditor({ enabled }) {
  const { templates, error, loading } = useLeadTemplates(enabled);
  const [kind, setKind] = useState('contact');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (templates) setDraft(templates);
  }, [templates]);

  const current = draft?.[kind] || { subject: '', body: '' };
  const edit = (field) => (e) =>
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], [field]: e.target.value } }));

  const save = async () => {
    setSaving(true);
    try {
      setDraft(await saveLeadTemplates(draft));
      toast.success('Reply templates saved.');
    } catch (err) {
      toast.error(apiMessage(err, 'The templates could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1">Reply templates</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        What “Reply by email” starts with for each kind of form. The sender can change it before
        sending.
      </Typography>
      {error ? (
        <Typography variant="body2" color="error.main">
          {apiMessage(error, 'The templates could not be loaded.')}
        </Typography>
      ) : null}
      {loading || !draft ? null : (
        <Stack spacing={2}>
          <Tabs value={kind} onChange={(_, v) => setKind(v)} variant="scrollable">
            {KINDS.map((k) => (
              <Tab key={k.value} value={k.value} label={k.label} />
            ))}
          </Tabs>
          <TextField
            size="small"
            label="Subject"
            value={current.subject}
            onChange={edit('subject')}
          />
          <TextField
            multiline
            minRows={8}
            label="Message"
            value={current.body}
            onChange={edit('body')}
          />
          <Box
            component="ul"
            sx={{ m: 0, pl: 2.5, typography: 'caption', color: 'text.secondary' }}
          >
            {PLACEHOLDERS.map(([p, meaning]) => (
              <li key={p}>
                <Box component="code" sx={{ fontFamily: 'monospace' }}>
                  {p}
                </Box>{' '}
                — {meaning}
              </li>
            ))}
          </Box>
          <Box>
            <LoadingButton
              variant="outlined"
              loading={saving}
              disabled={!current.subject.trim() || !current.body.trim()}
              onClick={save}
            >
              Save templates
            </LoadingButton>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
