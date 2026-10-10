'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { diagnosticsSnapshot } from 'src/utils/diagnostics-recorder';

import { CONFIG } from 'src/global-config';
import { createIssue } from 'src/actions/issues';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const SEVERITIES = [
  { value: 'low', label: 'Low — cosmetic or minor' },
  { value: 'medium', label: 'Medium — something is wrong, I can work around it' },
  { value: 'high', label: 'High — I cannot complete my work' },
  { value: 'critical', label: 'Critical — data is wrong, or many people are blocked' },
];

const MAX_IMAGES = 3;

/** A JPEG data URL of the current page, scaled down to keep the upload small. */
async function capturePage() {
  const { domToJpeg } = await import('modern-screenshot');
  return domToJpeg(document.body, {
    quality: 0.7,
    scale: Math.min(1, 1600 / window.innerWidth),
    width: window.innerWidth,
    height: window.innerHeight,
    style: { transform: `translateY(-${window.scrollY}px)` },
    // The report dialog itself is not part of the problem.
    filter: (node) => !(node instanceof Element && node.closest?.('[data-report-issue]')),
  });
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function browserContext(user) {
  const ua = navigator.userAgent;
  const match = (re, name) => {
    const m = re.exec(ua);
    return m ? `${name} ${m[1]}` : null;
  };
  const browser =
    match(/Edg\/([\d.]+)/, 'Edge') ||
    match(/Chrome\/([\d.]+)/, 'Chrome') ||
    match(/Firefox\/([\d.]+)/, 'Firefox') ||
    match(/Version\/([\d.]+).*Safari/, 'Safari') ||
    'unknown';
  return {
    userName: user?.displayName || '',
    role: user?.role || String(user?.roleId || ''),
    browser,
    userAgent: ua,
    os: navigator.platform || '',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    build: process.env.NEXT_PUBLIC_BUILD_SHA || '',
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || '',
    appVersion: CONFIG.appVersion || '',
    online: navigator.onLine,
  };
}

/**
 * "Report an issue": the user describes the problem; the page attaches a
 * screenshot, the browser console, recent API calls (with Encore trace ids)
 * and Sentry event ids. The API adds the matching backend errors and Sentry
 * events, so a developer gets everything needed to reproduce it.
 */
export function ReportIssueDialog({ open, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [images, setImages] = useState([]); // data URLs
  const [capturing, setCapturing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [include, setInclude] = useState({ console: true, network: true, navigation: true });
  const [sending, setSending] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSteps('');
    setExpected('');
    setSeverity('medium');
    setImages([]);
  };

  // Freeze what the tab recorded at the moment the dialog opened, and take a
  // screenshot of the page behind it.
  useEffect(() => {
    if (!open) return;
    setSnapshot(diagnosticsSnapshot());
    setCapturing(true);
    capturePage()
      .then((dataUrl) => setImages((cur) => (cur.length ? cur : [dataUrl])))
      .catch((err) => console.warn('Screenshot failed:', err?.message || err))
      .finally(() => setCapturing(false));
  }, [open]);

  const addFiles = useCallback(async (files) => {
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, MAX_IMAGES);
    const urls = await Promise.all(list.map(fileToDataUrl));
    setImages((cur) => [...cur, ...urls].slice(0, MAX_IMAGES));
  }, []);

  // Paste a screenshot straight in (Ctrl/Cmd+V).
  useEffect(() => {
    if (!open) return undefined;
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, addFiles]);

  const failed = (snapshot?.networkLogs || []).filter((n) => n.status >= 400 || n.status === 0);
  const consoleErrors = (snapshot?.consoleLogs || []).filter((c) => c.level === 'error');

  const handleSubmit = async () => {
    setSending(true);
    try {
      const toImage = (url) => {
        const [head, base64] = String(url).split(',');
        return { mime: head.includes('image/png') ? 'image/png' : 'image/jpeg', base64 };
      };
      const res = await createIssue({
        title,
        description,
        stepsToReproduce: steps,
        expected,
        severity,
        pageUrl: `${window.location.pathname}${window.location.search}`,
        context: browserContext(user),
        consoleLogs: include.console ? snapshot?.consoleLogs : [],
        networkLogs: include.network ? snapshot?.networkLogs : [],
        navigation: include.navigation ? snapshot?.navigation : [],
        sentryEventIds: snapshot?.sentryEventIds || [],
        screenshots: images.map(toImage),
      });
      toast.success(`Reported as ${res.ticketNumber}. Thank you — the team has been notified.`);
      reset();
      onClose();
      if (!pathname.startsWith(paths.dashboard.issues.root)) {
        router.push(paths.dashboard.issues.details(res.id));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'The report could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth data-report-issue>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Iconify icon="solar:danger-triangle-bold" width={24} sx={{ color: 'error.main' }} />
          <span>Report an issue</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            autoFocus
            fullWidth
            label="Short title"
            placeholder="e.g. Authenticator code rejected on first sign-in"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="What happened?"
            placeholder="What you were doing, what you saw, and any error message."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Steps to reproduce (optional)"
              placeholder={'1. Open …\n2. Click …'}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="What did you expect? (optional)"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </Stack>
          <TextField
            select
            label="How serious is it?"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITIES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">
                Screenshots ({images.length}/{MAX_IMAGES})
              </Typography>
              <Button
                size="small"
                component="label"
                disabled={images.length >= MAX_IMAGES}
                startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              >
                Add image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => addFiles(e.target.files)}
                />
              </Button>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {capturing ? (
                <Typography variant="body2" color="text.secondary">
                  Taking a screenshot of the page…
                </Typography>
              ) : null}
              {images.map((src, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'relative',
                    width: 180,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    sx={{ width: 1, display: 'block' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              The page behind this window is captured automatically. You can also paste (Ctrl/⌘+V)
              or upload images. Remove anything sensitive before sending.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Technical details attached for the developers
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Chip
                size="small"
                color={failed.length ? 'error' : 'default'}
                variant="soft"
                label={`${failed.length} failed API call${failed.length === 1 ? '' : 's'}`}
              />
              <Chip
                size="small"
                color={consoleErrors.length ? 'error' : 'default'}
                variant="soft"
                label={`${consoleErrors.length} console error${consoleErrors.length === 1 ? '' : 's'}`}
              />
              <Chip
                size="small"
                variant="soft"
                label={`${snapshot?.sentryEventIds?.length || 0} Sentry event${snapshot?.sentryEventIds?.length === 1 ? '' : 's'}`}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={include.network}
                    onChange={(e) => setInclude((c) => ({ ...c, network: e.target.checked }))}
                  />
                }
                label="Recent API calls"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={include.console}
                    onChange={(e) => setInclude((c) => ({ ...c, console: e.target.checked }))}
                  />
                }
                label="Browser console"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={include.navigation}
                    onChange={(e) => setInclude((c) => ({ ...c, navigation: e.target.checked }))}
                  />
                }
                label="Pages visited"
              />
            </Stack>
            <Alert severity="info" sx={{ mt: 1 }}>
              Your browser, the build version and the backend errors and Sentry events from your
              recent requests are attached too. Passwords, tokens and codes are removed.
            </Alert>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          color="error"
          loading={sending}
          disabled={title.trim().length < 4 || description.trim().length < 10}
          onClick={handleSubmit}
          startIcon={<Iconify icon="custom:send-fill" />}
        >
          Send report
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/** The floating "Report an issue" button, on every dashboard page. */
export function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        data-report-issue
        variant="contained"
        color="inherit"
        size="small"
        onClick={() => setOpen(true)}
        startIcon={<Iconify icon="solar:danger-triangle-bold" />}
        sx={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          zIndex: 1250,
          boxShadow: (theme) => theme.customShadows?.z8,
          opacity: 0.85,
          '&:hover': { opacity: 1 },
        }}
      >
        Report an issue
      </Button>
      <ReportIssueDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
