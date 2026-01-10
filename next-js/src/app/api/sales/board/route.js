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
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString ? `${BASE_URL}/sales/board?${queryString}` : `${BASE_URL}/sales/board`;
    const res = await fetch(url, { method: 'GET', headers: defaultHeaders });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/sales/board GET failed', error);
    return NextResponse.json({ message: 'Failed to fetch sales board' }, { status: 500 });
  }
}
