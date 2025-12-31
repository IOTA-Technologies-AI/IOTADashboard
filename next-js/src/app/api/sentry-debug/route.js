import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

// Hit this endpoint to force a Sentry error for verification.
export async function GET() {
  const error = new Error('Sentry debug test');
  Sentry.captureException(error);
  // Ensure the event is flushed before the request ends
  await Sentry.flush(2000);
  // Throw to ensure it is also captured by the global handler
  throw error;
}

export async function POST() {
  return NextResponse.json({ ok: true });
}
