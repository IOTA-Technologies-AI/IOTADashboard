import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const BASE_URL = CONFIG.serverUrl || 'https://staging-iotaapiserver-s572.encr.app/supabaseservices';
const defaultHeaders = {
  'Content-Type': 'application/json',
  apikey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/todo/stages/reorder`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/stages/reorder failed', error);
    return NextResponse.json({ message: 'Failed to reorder stages' }, { status: 500 });
  }
}
