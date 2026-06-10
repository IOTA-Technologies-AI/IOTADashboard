import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const defaultHeaders = {
  'Content-Type': 'application/json',
  apikey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const email = searchParams.get('email') || '';
  const daysParam = Number(searchParams.get('days') || '1');
  const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(7, daysParam)) : 1;

  if (!taskId) {
    return NextResponse.redirect(
      `${new URL('/dashboard/todo?snooze=error&reason=missing-task', request.url)}`
    );
  }

  try {
    const url = `${BASE_URL}/todo/tasks/${encodeURIComponent(taskId)}/snooze?days=${days}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { method: 'GET', headers: defaultHeaders, cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.redirect(
        `${new URL('/dashboard/todo?snooze=error&reason=request-failed', request.url)}`
      );
    }

    return NextResponse.redirect(
      `${new URL(`/dashboard/todo?snooze=success&taskId=${encodeURIComponent(taskId)}&days=${days}`, request.url)}`
    );
  } catch (error) {
    console.error('Proxy /api/todo/snooze GET failed', error);
    return NextResponse.redirect(
      `${new URL('/dashboard/todo?snooze=error&reason=server-error', request.url)}`
    );
  }
}
