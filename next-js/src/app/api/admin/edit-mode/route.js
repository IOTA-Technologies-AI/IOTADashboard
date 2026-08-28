import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

// Proxies the Record Edit Mode switch (appConfig namespace=adminSettings,
// configKey=recordEditMode). Same-origin so the browser avoids CORS; the
// backend re-checks that the caller is a super-admin before writing.

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

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/admin/edit-mode`, {
      headers: defaultHeaders,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/admin/edit-mode GET failed', error);
    return NextResponse.json({ message: 'Failed to read edit mode' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/admin/edit-mode`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/admin/edit-mode POST failed', error);
    return NextResponse.json({ message: 'Failed to update edit mode' }, { status: 500 });
  }
}
