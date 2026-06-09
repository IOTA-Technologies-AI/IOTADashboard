import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  debug: process.env.SENTRY_DEBUG === 'true',
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
