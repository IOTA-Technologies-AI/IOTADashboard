'use client';

import { mutate } from 'swr';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
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

const OPEN_EVENT = 'iota:report-issue:open';

/**
 * Opens the one "Report an issue" reporter mounted in the dashboard layout.
 * It lives there so a draft — and screen capture mode — survives navigation.
 */
export function openReportIssue() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const MAX_WIDTH = 1600;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * True when a canvas is (almost) one flat colour — a black or blank frame,
 * which is what a failed capture produces. Samples a grid, not every pixel.
 */
function looksBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (!width || !height) return true;
  const { data } = ctx.getImageData(0, 0, width, height);
  const step = Math.max(1, Math.floor((width * height) / 400));
  let min = 255;
  let max = 0;
  for (let p = 0; p < width * height; p += step) {
    const i = p * 4;
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }
  return max - min < 8;
}

/** The canvas as a JPEG data URL, or an error when it came out blank. */
function canvasToJpeg(canvas) {
  if (looksBlank(canvas)) throw new Error('the capture came out blank');
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Asks the browser to share this tab. A real capture of the pixels on screen —
 * error toasts, dialogs, PDFs and all — unlike re-drawing the page from its
 * HTML. One permission prompt covers a whole capture session.
 */
async function startTabCapture() {
  if (!navigator.mediaDevices?.getDisplayMedia) return null;
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser', frameRate: 5 },
    audio: false,
    preferCurrentTab: true, // Chrome/Edge: offer this tab first
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
  });
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  return { stream, video };
}

function stopTabCapture(session) {
  session?.stream.getTracks().forEach((t) => t.stop());
}

/** One frame of the shared tab as a JPEG data URL. */
async function grabFrame({ video }) {
  // Frames can lag a moment behind the screen; retry once on a blank one.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const scale = Math.min(1, MAX_WIDTH / (video.videoWidth || MAX_WIDTH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    if (!looksBlank(canvas) || attempt === 1) return canvasToJpeg(canvas);
    await sleep(300);
  }
  return null;
}

/**
 * Fallback when the browser cannot (or the user will not) share the tab: the
 * page re-drawn from its HTML. JPEG has no transparency, so the page colour is
 * painted underneath — without it, transparent areas came out black.
 */
async function renderPage() {
  const { domToCanvas } = await import('modern-screenshot');
  const bodyColor = getComputedStyle(document.body).backgroundColor;
  const transparent = !bodyColor || bodyColor === 'transparent' || bodyColor.endsWith(', 0)');
  const canvas = await domToCanvas(document.documentElement, {
    scale: Math.min(1, MAX_WIDTH / window.innerWidth),
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: transparent ? '#ffffff' : bodyColor,
    style: { transform: `translateY(-${window.scrollY}px)` },
    // The report dialog itself is not part of the problem.
    filter: (node) => !(node instanceof Element && node.closest?.('[data-report-issue]')),
  });
  return canvasToJpeg(canvas);
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
  // Screen capture mode: the dialog steps aside so the user can go to the
  // screen with the problem, reproduce it, and capture it. `replace` is the
  // index of the image being retaken, or null to add a new one.
  const [capture, setCapture] = useState(null);
  const [shooting, setShooting] = useState(false);
  // The shared-tab stream for this capture session (see startTabCapture), and
  // whether the capture bar is stepping out of the frame being taken.
  const sessionRef = useRef(null);
  const [hideBar, setHideBar] = useState(false);
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

  // What the tab recorded, frozen when the form is shown — and again on the way
  // back from capture mode, so errors reproduced there are included.
  useEffect(() => {
    if (open && !capture) setSnapshot(diagnosticsSnapshot());
  }, [open, capture]);

  // Capture mode ends → stop sharing the tab (the browser's "sharing" bar goes).
  useEffect(() => {
    if (open && capture) return undefined;
    stopTabCapture(sessionRef.current);
    sessionRef.current = null;
    return undefined;
  }, [open, capture]);
  useEffect(() => () => stopTabCapture(sessionRef.current), []);

  // Runs from the click, which the browser requires before it will ask to share.
  const startCapture = async (replace) => {
    if (!sessionRef.current) {
      try {
        const session = await startTabCapture();
        if (session) {
          // The user can stop sharing from the browser's own bar at any time.
          session.stream.getVideoTracks()[0]?.addEventListener('ended', () => {
            if (sessionRef.current === session) sessionRef.current = null;
          });
          sessionRef.current = session;
        }
      } catch (err) {
        console.warn('Tab sharing declined:', err?.message || err);
        toast.info(
          'Screen sharing was not allowed, so captures will be re-drawn from the page. For an exact picture, allow sharing this tab next time.'
        );
      }
    }
    setCapture({ replace });
  };

  const capturePage = async () => {
    if (!sessionRef.current) return renderPage();
    setHideBar(true);
    try {
      await sleep(400); // let the bar leave the screen and a fresh frame arrive
      return await grabFrame(sessionRef.current);
    } finally {
      setHideBar(false);
    }
  };

  const takeCapture = async () => {
    const replace = capture?.replace ?? null;
    setShooting(true);
    try {
      const dataUrl = await capturePage();
      setImages((cur) => {
        if (replace !== null && replace < cur.length) {
          return cur.map((src, k) => (k === replace ? dataUrl : src));
        }
        return [...cur, dataUrl].slice(0, MAX_IMAGES);
      });
      // A retake, or the last free slot, goes straight back to the form.
      if (replace !== null || images.length + 1 >= MAX_IMAGES) setCapture(null);
    } catch (err) {
      console.warn('Screenshot failed:', err?.message || err);
      toast.error(
        'This screen could not be captured. Take a screenshot with your computer and paste it into the report instead.'
      );
    } finally {
      setShooting(false);
    }
  };

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
      // Any open Issues list picks up the new ticket.
      mutate((key) => typeof key === 'string' && key.startsWith('/issues'));
      if (!pathname.startsWith(paths.dashboard.issues.root)) {
        router.push(paths.dashboard.issues.details(res.id));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'The report could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (open && capture) {
    return (
      <CaptureBar
        count={images.length}
        retake={capture.replace !== null}
        shooting={shooting}
        hidden={hideBar}
        onCapture={takeCapture}
        onDone={() => setCapture(null)}
      />
    );
  }

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
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="soft"
                  disabled={images.length >= MAX_IMAGES}
                  startIcon={<Iconify icon="solar:camera-add-bold" />}
                  onClick={() => startCapture(null)}
                >
                  Capture screen
                </Button>
                <Button
                  size="small"
                  component="label"
                  disabled={images.length >= MAX_IMAGES}
                  startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                >
                  Upload
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </Button>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
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
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                  >
                    <Tooltip title="Retake">
                      <IconButton
                        size="small"
                        onClick={() => startCapture(i)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <Iconify icon="solar:restart-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: images.length ? 1 : 0 }}
            >
              Use <strong>Capture screen</strong> to go to the screen with the problem, reproduce
              it, and capture it — this form keeps what you typed. Your browser asks once to share
              this tab; choose this tab. You can also paste (Ctrl/⌘+V) or upload images. Remove
              anything sensitive before sending.
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

/**
 * Shown instead of the dialog in capture mode. It steps out of the frame
 * (`hidden`) while a shared-tab capture is taken, and is marked
 * data-report-issue so the re-drawn fallback leaves it out too. Error toasts
 * and dialogs on the page are kept — they are usually what the report is about.
 */
function CaptureBar({ count, retake, shooting, hidden, onCapture, onDone }) {
  return (
    <Paper
      data-report-issue
      elevation={8}
      sx={{
        // Out of the picture while a real (shared-tab) frame is taken.
        visibility: hidden ? 'hidden' : 'visible',
        position: 'fixed',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        zIndex: (theme) => theme.zIndex.modal + 10,
        width: 'calc(100% - 32px)',
        maxWidth: 720,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'error.main',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Iconify
            icon="solar:camera-add-bold"
            width={28}
            sx={{ color: 'error.main', flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">
              {retake ? 'Retake screenshot' : 'Screen capture'}
              {!retake ? ` · ${count} of ${MAX_IMAGES} captured` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Go to the screen with the problem and reproduce it, then capture.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            color="inherit"
            onClick={onDone}
            disabled={shooting}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back to report
          </Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={shooting}
            onClick={onCapture}
            startIcon={<Iconify icon="solar:camera-add-bold" />}
          >
            Capture
          </LoadingButton>
        </Stack>
      </Stack>
    </Paper>
  );
}

/**
 * The floating "Report an issue" button, on every dashboard page, and the one
 * reporter instance — other pages open it with openReportIssue().
 */
export function ReportIssueButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

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
          // The capture bar takes its place while a report is in progress.
          display: open ? 'none' : undefined,
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
