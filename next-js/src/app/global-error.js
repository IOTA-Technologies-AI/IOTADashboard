'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Minimal global error boundary to report uncaught render errors
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

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
