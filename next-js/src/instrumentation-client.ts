import * as Sentry from '@sentry/nextjs';

import { recordSentryEvent, installDiagnosticsRecorder } from 'src/utils/diagnostics-recorder';

// Console, API calls and page changes, kept in memory for "Report an issue".
installDiagnosticsRecorder();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  // Every page load traced in production is costly; errors are always sent.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  debug: process.env.SENTRY_DEBUG === 'true',
  beforeSend(event) {
    // Lets an issue report point at the exact Sentry events this tab sent.
    recordSentryEvent(event.event_id);
    return event;
  },
});

// Auto-reload on ChunkLoadError caused by stale asset URLs after a new deployment.
// This handles errors outside React's render cycle (e.g. dynamic imports in event handlers).
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    const isChunkError =
      err?.name === 'ChunkLoadError' ||
      err?.message?.includes('Loading chunk') ||
      err?.message?.includes('Failed to fetch dynamically imported module');
    if (isChunkError) {
      event.preventDefault();
      window.location.reload();
    }
  });
}
