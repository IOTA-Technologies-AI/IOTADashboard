import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const getHeaders = (request) => {
  const h = {
    'Content-Type': 'application/json',
    apikey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg',
  };
  const auth = request?.headers?.get?.('authorization');
  if (auth) h.Authorization = auth;
  return h;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/todo/tasks`, {
      method: 'POST',
      headers: getHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/tasks failed', error);
    return NextResponse.json({ message: 'Failed to create task' }, { status: 500 });
  }
}
