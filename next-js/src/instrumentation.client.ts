import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  debug: process.env.SENTRY_DEBUG === 'true',
});
