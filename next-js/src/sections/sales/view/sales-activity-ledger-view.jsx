'use client';

import useSWR, { mutate } from 'swr';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';

import { useAuthContext } from 'src/auth/hooks';
import { useGetTodoBoard, createTask as createTodoTask } from 'src/actions/todo';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import {
  listLedgerEntries,
  createLedgerEntry,
  updateLedgerEntry,
  addLedgerActivity,
} from 'src/utils/apiHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'nurturing',
  'converted',
  'lost',
  'inactive',
];
const LEAD_SOURCES = [
  'cold_call',
  'email',
  'referral',
  'website',
  'event',
  'linkedin',
  'partner',
  'inbound',
  'other',
];
const ACTIVITY_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
  'linkedin',
  'demo',
  'proposal',
  'follow_up',
];
const ACTIVITY_OUTCOMES = [
  'left_voicemail',
  'spoke_to_decision_maker',
  'no_show',
  'interested',
  'not_interested',
  'follow_up_scheduled',
  'proposal_sent',
  'demo_scheduled',
  'meeting_completed',
  'email_sent',
  'email_replied',
  'other',
];
const LOSS_REASONS = [
  'pricing',
  'competitor',
  'timing',
  'no_budget',
  'no_decision',
  'fit',
  'other',
];

const STATUS_COLORS = {
  new: 'default',
  contacted: 'info',
  qualified: 'primary',
  nurturing: 'warning',
  converted: 'success',
  lost: 'error',
  inactive: 'default',
};

const OUTCOME_COLORS = {
  open: 'info',
  won: 'success',
  lost: 'error',
};

const ACTIVITY_ICONS = {
  call: 'solar:phone-bold',
  email: 'solar:letter-bold',
  meeting: 'solar:users-group-rounded-bold',
  note: 'solar:document-text-bold',
  linkedin: 'eva:linkedin-fill',
  demo: 'solar:monitor-bold',
  proposal: 'solar:file-text-bold',
  follow_up: 'solar:bell-bold',
};

const fLabel = (str) => str?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '—';

const LEDGER_KEY = 'sales-ledger';

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  const theme = useTheme();
  return (
    <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}.lighter`,
          color: `${color}.main`,
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={24} />
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit Prospect Dialog
// ─────────────────────────────────────────────────────────────────────────────

const BLANK_PROSPECT = {
  prospectName: '',
  company: '',
  jobTitle: '',
  email: '',
  phone: '',
  linkedIn: '',
  website: '',
  leadSource: 'other',
  leadStatus: 'new',
  notes: '',
  currency: 'USD',
  dealValue: '',
};

function ProspectDialog({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState(initial || BLANK_PROSPECT);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = useCallback(async () => {
    if (!form.prospectName.trim() || !form.company.trim()) {
      setErr('Prospect name and company are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (form.id) {
        await updateLedgerEntry(form.id, form);
      } else {
        await createLedgerEntry({
          ...form,
          dealValue: form.dealValue ? Number(form.dealValue) : undefined,
        });
      }
      mutate(LEDGER_KEY);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, onClose, onSaved]);

  // Sync form when initial changes (edit mode)
  const handleOpen = () => setForm(initial || BLANK_PROSPECT);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>{form.id ? 'Edit Prospect' : 'Add Prospect'}</DialogTitle>
      <DialogContent
        sx={{ display: 'grid', gap: 2, pt: '8px !important', gridTemplateColumns: '1fr 1fr' }}
      >
        {err && (
          <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
            {err}
          </Alert>
        )}

        <TextField
          label="Prospect Name *"
          value={form.prospectName}
          onChange={set('prospectName')}
        />
        <TextField label="Company *" value={form.company} onChange={set('company')} />
        <TextField label="Job Title" value={form.jobTitle} onChange={set('jobTitle')} />
        <TextField label="Email" value={form.email} onChange={set('email')} />
        <TextField label="Phone" value={form.phone} onChange={set('phone')} />
        <TextField label="LinkedIn URL" value={form.linkedIn} onChange={set('linkedIn')} />
        <TextField label="Website" value={form.website} onChange={set('website')} />
        <TextField
          label="Deal Value"
          type="number"
          value={form.dealValue}
          onChange={set('dealValue')}
        />

        <FormControl>
          <InputLabel>Lead Source</InputLabel>
          <Select
            value={form.leadSource}
            onChange={set('leadSource')}
            input={<OutlinedInput label="Lead Source" />}
          >
            {LEAD_SOURCES.map((s) => (
              <MenuItem key={s} value={s}>
                {fLabel(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel>Lead Status</InputLabel>
          <Select
            value={form.leadStatus}
            onChange={set('leadStatus')}
            input={<OutlinedInput label="Lead Status" />}
          >
            {LEAD_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {fLabel(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Notes"
          value={form.notes}
          onChange={set('notes')}
          multiline
          rows={2}
          sx={{ gridColumn: '1 / -1' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : form.id ? 'Update' : 'Add Prospect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Activity Dialog
// ─────────────────────────────────────────────────────────────────────────────

function LogActivityDialog({ open, onClose, prospect, userInfo }) {
  const [form, setForm] = useState({
    type: 'call',
    outcome: 'other',
    content: '',
    subject: '',
    nextFollowUpDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = useCallback(async () => {
    if (!form.content.trim()) {
      setErr('Activity notes are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await addLedgerActivity(prospect.id, {
        type: form.type,
        subject: form.subject || undefined,
        content: form.content,
        outcome: form.outcome || undefined,
        performedBy: userInfo?.displayName || userInfo?.email || 'Unknown',
        nextFollowUpDate: form.nextFollowUpDate || undefined,
      });
      mutate(LEDGER_KEY);
      onClose();
      setForm({ type: 'call', outcome: 'other', content: '', subject: '', nextFollowUpDate: '' });
    } catch (e) {
      setErr(e?.message || 'Failed to log activity.');
    } finally {
      setSaving(false);
    }
  }, [form, prospect, userInfo, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log Activity — {prospect?.prospectName}</DialogTitle>
      <DialogContent
        sx={{ display: 'grid', gap: 2, pt: '8px !important', gridTemplateColumns: '1fr 1fr' }}
      >
        {err && (
          <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
            {err}
          </Alert>
        )}

        <FormControl>
          <InputLabel>Activity Type</InputLabel>
          <Select
            value={form.type}
            onChange={set('type')}
            input={<OutlinedInput label="Activity Type" />}
          >
            {ACTIVITY_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {fLabel(t)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel>Outcome</InputLabel>
          <Select
            value={form.outcome}
            onChange={set('outcome')}
            input={<OutlinedInput label="Outcome" />}
          >
            {ACTIVITY_OUTCOMES.map((o) => (
              <MenuItem key={o} value={o}>
                {fLabel(o)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Subject / Title"
          value={form.subject}
          onChange={set('subject')}
          sx={{ gridColumn: '1 / -1' }}
        />

        <TextField
          label="Notes *"
          value={form.content}
          onChange={set('content')}
          multiline
          rows={3}
          sx={{ gridColumn: '1 / -1' }}
        />

        <TextField
          label="Next Follow-up Date"
          type="date"
          value={form.nextFollowUpDate}
          onChange={set('nextFollowUpDate')}
          InputLabelProps={{ shrink: true }}
          sx={{ gridColumn: '1 / -1' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Log Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Todo Task Dialog  — reuses the existing Todo Kanban board
// ─────────────────────────────────────────────────────────────────────────────

function CreateTodoDialog({ open, onClose, prospect, userInfo }) {
  const { board } = useGetTodoBoard();
  const firstColumnId = board?.columns?.[0]?.id ?? null;

  const [form, setForm] = useState({ name: '', description: '', dueDate: '', assigneeEmail: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Pre-fill name when prospect changes
  const handleEnter = () => {
    setForm((f) => ({
      ...f,
      name: f.name || `Follow-up: ${prospect?.prospectName ?? ''}`,
      description:
        f.description ||
        `Company: ${prospect?.company ?? ''}\nEmail: ${prospect?.email ?? ''}\nPhone: ${prospect?.phone ?? ''}`,
    }));
    setSuccess(false);
    setErr('');
  };

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) {
      setErr('Task name is required.');
      return;
    }
    if (!firstColumnId) {
      setErr('Todo board is not ready. Please try again.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await createTodoTask(
        firstColumnId,
        {
          name: form.name,
          description: form.description,
          expectedCloseDate: form.dueDate || null,
          assigneeEmail: form.assigneeEmail || null,
        },
        { email: userInfo?.email, displayName: userInfo?.displayName || userInfo?.email }
      );
      setSuccess(true);
    } catch (e) {
      setErr(e?.message || 'Failed to create task. Please ensure the Todo board has loaded.');
    } finally {
      setSaving(false);
    }
  }, [form, firstColumnId, userInfo]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
    >
      <DialogTitle>Create Follow-up Task</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {err && <Alert severity="error">{err}</Alert>}
        {success && (
          <Alert
            severity="success"
            action={
              <Button
                component={RouterLink}
                href={paths.dashboard.todo}
                size="small"
                color="inherit"
              >
                Open Todo Board
              </Button>
            }
          >
            Task created! It now appears in your Todo Kanban board.
          </Alert>
        )}

        <TextField label="Task Name *" value={form.name} onChange={set('name')} fullWidth />
        <TextField
          label="Description"
          value={form.description}
          onChange={set('description')}
          multiline
          rows={3}
          fullWidth
        />
        <TextField
          label="Due Date"
          type="date"
          value={form.dueDate}
          onChange={set('dueDate')}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="Assign to (email)"
          value={form.assigneeEmail}
          onChange={set('assigneeEmail')}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!success && (
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Create Task'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Timeline (right panel)
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
        <Iconify icon="solar:document-text-broken" width={40} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          No activities logged yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={0}>
      {activities.map((act, idx) => (
        <Box key={act.id} sx={{ display: 'flex', gap: 1.5, pb: 2, position: 'relative' }}>
          {/* vertical line */}
          {idx < activities.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                left: 16,
                top: 36,
                bottom: 0,
                width: 2,
                bgcolor: 'divider',
              }}
            />
          )}
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.lighter',
              color: 'primary.main',
              flexShrink: 0,
              mt: 0.5,
            }}
          >
            <Iconify icon={ACTIVITY_ICONS[act.type] || 'solar:calendar-bold'} width={16} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
              <Typography variant="subtitle2">{fLabel(act.type)}</Typography>
              {act.outcome && (
                <Chip
                  label={fLabel(act.outcome)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18 }}
                />
              )}
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                {act.performedAt
                  ? new Date(act.performedAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </Typography>
            </Stack>
            {act.subject && (
              <Typography variant="caption" fontWeight={600}>
                {act.subject}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {act.content}
            </Typography>
            {act.nextFollowUpDate && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
              >
                <Iconify icon="solar:clock-circle-bold" width={12} />
                Follow-up: {new Date(act.nextFollowUpDate).toLocaleDateString('en-GB')}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              by {act.performedBy}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prospect Detail Panel (right side)
// ─────────────────────────────────────────────────────────────────────────────

function ProspectDetail({ prospect, userInfo, onEdit }) {
  const [tab, setTab] = useState('activities');
  const [logOpen, setLogOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeVal, setOutcomeVal] = useState('open');
  const [lossReason, setLossReason] = useState('other');
  const [lossNote, setLossNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!prospect) {
    return (
      <Card
        sx={{
          p: 4,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1,
          color: 'text.disabled',
        }}
      >
        <Iconify icon="solar:users-group-rounded-broken" width={48} />
        <Typography variant="body2">Select a prospect to view details</Typography>
      </Card>
    );
  }

  const handleSaveOutcome = async () => {
    setSaving(true);
    try {
      await updateLedgerEntry(prospect.id, {
        outcome: outcomeVal,
        lossReason: outcomeVal === 'lost' ? lossReason : null,
        lossNote: outcomeVal === 'lost' ? lossNote : null,
        leadStatus:
          outcomeVal === 'won' ? 'converted' : outcomeVal === 'lost' ? 'lost' : prospect.leadStatus,
      });
      mutate(LEDGER_KEY);
      setOutcomeOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{prospect.prospectName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {prospect.jobTitle ? `${prospect.jobTitle} @ ` : ''}
              {prospect.company}
            </Typography>
          </Box>
          <Stack direction="row" gap={0.5}>
            <Chip
              label={fLabel(prospect.outcome || 'open')}
              color={OUTCOME_COLORS[prospect.outcome] || 'default'}
              size="small"
              onClick={() => {
                setOutcomeVal(prospect.outcome || 'open');
                setOutcomeOpen(true);
              }}
              sx={{ cursor: 'pointer' }}
            />
            <Tooltip title="Edit prospect">
              <IconButton size="small" onClick={onEdit}>
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Contact info chips */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1.5}>
          {prospect.email && (
            <Chip
              icon={<Iconify icon="solar:letter-bold" width={14} />}
              label={prospect.email}
              size="small"
              variant="outlined"
              component="a"
              href={`mailto:${prospect.email}`}
              clickable
            />
          )}
          {prospect.phone && (
            <Chip
              icon={<Iconify icon="solar:phone-bold" width={14} />}
              label={prospect.phone}
              size="small"
              variant="outlined"
            />
          )}
          {prospect.linkedIn && (
            <Chip
              icon={<Iconify icon="eva:linkedin-fill" width={14} />}
              label="LinkedIn"
              size="small"
              variant="outlined"
              component="a"
              href={prospect.linkedIn}
              target="_blank"
              clickable
            />
          )}
        </Stack>

        {/* Status + Source chips */}
        <Stack direction="row" gap={0.75} mt={1}>
          <Chip
            label={fLabel(prospect.leadStatus)}
            color={STATUS_COLORS[prospect.leadStatus] || 'default'}
            size="small"
          />
          <Chip label={fLabel(prospect.leadSource)} size="small" variant="outlined" />
          {prospect.dealValue && (
            <Chip
              icon={<Iconify icon="solar:dollar-bold" width={12} />}
              label={`${prospect.currency ?? 'USD'} ${Number(prospect.dealValue).toLocaleString()}`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab
          label={`Activities (${prospect.activities?.length ?? 0})`}
          value="activities"
          sx={{ minHeight: 40 }}
        />
        <Tab label="Notes" value="notes" sx={{ minHeight: 40 }} />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 'activities' && <ActivityTimeline activities={prospect.activities} />}
        {tab === 'notes' && (
          <Typography
            variant="body2"
            color={prospect.notes ? 'text.primary' : 'text.disabled'}
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {prospect.notes || 'No notes added.'}
          </Typography>
        )}
      </Box>

      {/* Action buttons */}
      <Divider />
      <Stack direction="row" gap={1} sx={{ p: 1.5 }} flexWrap="wrap">
        <Button
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          variant="outlined"
          onClick={() => setLogOpen(true)}
        >
          Log Activity
        </Button>
        <Button
          size="small"
          startIcon={<Iconify icon="solar:clipboard-list-bold" />}
          variant="outlined"
          color="secondary"
          onClick={() => setTodoOpen(true)}
        >
          Create Follow-up Task
        </Button>
      </Stack>

      {/* Dialogs */}
      <LogActivityDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        prospect={prospect}
        userInfo={userInfo}
      />
      <CreateTodoDialog
        open={todoOpen}
        onClose={() => setTodoOpen(false)}
        prospect={prospect}
        userInfo={userInfo}
      />

      {/* Outcome update dialog */}
      <Dialog open={outcomeOpen} onClose={() => setOutcomeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Deal Outcome</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <FormControl fullWidth>
            <InputLabel>Outcome</InputLabel>
            <Select
              value={outcomeVal}
              onChange={(e) => setOutcomeVal(e.target.value)}
              input={<OutlinedInput label="Outcome" />}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </Select>
          </FormControl>
          {outcomeVal === 'lost' && (
            <>
              <FormControl fullWidth>
                <InputLabel>Loss Reason</InputLabel>
                <Select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  input={<OutlinedInput label="Loss Reason" />}
                >
                  {LOSS_REASONS.map((r) => (
                    <MenuItem key={r} value={r}>
                      {fLabel(r)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Loss Note"
                value={lossNote}
                onChange={(e) => setLossNote(e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutcomeOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveOutcome} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

export function SalesActivityLedgerView() {
  const { user } = useAuthContext();
  const userInfo = { email: user?.email, displayName: user?.displayName || user?.email };

  const { data, isLoading, error } = useSWR(LEDGER_KEY, listLedgerEntries);
  const entries = data?.entries ?? [];

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [selected, setSelected] = useState(null);
  const [prospectOpen, setProspectOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Derive stats
  const total = entries.length;
  const activitiesThisWeek = entries.reduce((n, e) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (
      n + (e.activities ?? []).filter((a) => new Date(a.performedAt).getTime() > weekAgo).length
    );
  }, 0);
  const followUpsPending = entries.filter((e) =>
    (e.activities ?? []).some(
      (a) => a.nextFollowUpDate && new Date(a.nextFollowUpDate) >= new Date()
    )
  ).length;
  const won = entries.filter((e) => e.outcome === 'won').length;
  const closed = entries.filter((e) => e.outcome === 'won' || e.outcome === 'lost').length;
  const winRate = closed ? Math.round((won / closed) * 100) : 0;

  // Filter
  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.prospectName?.toLowerCase().includes(q) ||
      e.company?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || e.leadStatus === filterStatus;
    const matchOutcome = filterOutcome === 'all' || e.outcome === filterOutcome;
    return matchSearch && matchStatus && matchOutcome;
  });

  // Sync selected after mutation
  const selectedEntry = entries.find((e) => e.id === selected?.id) ?? selected;

  const handleEdit = useCallback(() => {
    setEditTarget(selectedEntry);
    setProspectOpen(true);
  }, [selectedEntry]);

  const handleAdd = () => {
    setEditTarget(null);
    setProspectOpen(true);
  };

  return (
    <Box>
      {/* Page header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Sales Activity Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track prospects, log interactions, and create follow-up tasks.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={handleAdd}
        >
          Add Prospect
        </Button>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Prospects"
            value={total}
            icon="solar:users-group-rounded-bold"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Activities This Week"
            value={activitiesThisWeek}
            icon="solar:calendar-bold"
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Follow-ups Pending"
            value={followUpsPending}
            icon="solar:bell-bold"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Win Rate" value={`${winRate}%`} icon="solar:star-bold" color="success" />
        </Grid>
      </Grid>

      {/* Two-column layout */}
      <Grid container spacing={2}>
        {/* LEFT — prospects table */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            {/* Filters */}
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: '1fr auto auto',
              }}
            >
              <TextField
                size="small"
                placeholder="Search prospect / company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" width={18} />
                    </InputAdornment>
                  ),
                }}
              />
              <Select
                size="small"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {LEAD_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {fLabel(s)}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                sx={{ minWidth: 100 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="won">Won</MenuItem>
                <MenuItem value="lost">Lost</MenuItem>
              </Select>
            </Box>

            {/* Table */}
            {isLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ m: 2 }}>
                Failed to load ledger entries.
              </Alert>
            ) : (
              <Box sx={{ overflow: 'auto', maxHeight: 620 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Prospect</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Acts.</TableCell>
                      <TableCell>Outcome</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                          sx={{ py: 4, color: 'text.disabled' }}
                        >
                          {entries.length === 0
                            ? 'No prospects yet. Add your first one.'
                            : 'No results match your filters.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((entry) => (
                        <TableRow
                          key={entry.id}
                          hover
                          selected={selectedEntry?.id === entry.id}
                          onClick={() => setSelected(entry)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="subtitle2" noWrap sx={{ maxWidth: 150 }}>
                              {entry.prospectName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {entry.company}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={fLabel(entry.leadStatus)}
                              color={STATUS_COLORS[entry.leadStatus] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{entry.activities?.length ?? 0}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={fLabel(entry.outcome || 'open')}
                              color={OUTCOME_COLORS[entry.outcome] || 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Card>
        </Grid>

        {/* RIGHT — detail panel */}
        <Grid item xs={12} md={7}>
          <ProspectDetail prospect={selectedEntry} userInfo={userInfo} onEdit={handleEdit} />
        </Grid>
      </Grid>

      {/* Add / Edit Prospect Dialog */}
      <ProspectDialog
        open={prospectOpen}
        onClose={() => setProspectOpen(false)}
        initial={editTarget}
        onSaved={() => setEditTarget(null)}
      />
    </Box>
  );
}
