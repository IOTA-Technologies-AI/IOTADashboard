import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

// Read-only proxy over the adminEditAuditLog table. The log is append-only and
// is written server-side inside the invoice/expense PATCH endpoints, so there
// is deliberately no write route here.

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
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParams.toString();
    const url = params ? `${BASE_URL}/admin/edit-audit?${params}` : `${BASE_URL}/admin/edit-audit`;
    const res = await fetch(url, { headers: defaultHeaders, cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/admin/edit-audit GET failed', error);
    return NextResponse.json({ entries: [], message: 'Failed to read audit log' }, { status: 500 });
  }
}
