'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

const isChunkError = (err) =>
  err?.name === 'ChunkLoadError' ||
  err?.message?.includes('Loading chunk') ||
  err?.message?.includes('Failed to fetch dynamically imported module');

// Minimal global error boundary to report uncaught render errors
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (!error) return;

    if (isChunkError(error)) {
      // New deployment: cached chunk URLs are stale — reload to pick up fresh assets.
      window.location.reload();
      return;
    }

    Sentry.captureException(error);
  }, [error]);

  // While a chunk-error reload is in progress show nothing
  if (isChunkError(error)) return null;

  return (
    <html>
      <body>
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{String(error)}</pre>
          <button type="button" onClick={() => reset()} style={{ marginTop: '1rem' }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
