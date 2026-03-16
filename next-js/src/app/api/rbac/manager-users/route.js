import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg';

const buildHeaders = (request) => {
  const h = { 'Content-Type': 'application/json', apikey: ANON_KEY };
  const auth = request?.headers?.get?.('authorization');
  if (auth) h.Authorization = auth;
  return h;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get('managerId');
  if (!managerId) {
    return NextResponse.json({ error: 'managerId required' }, { status: 400 });
  }

  const url = `${API_BASE_URL}/managerUsers?managerId=eq.${encodeURIComponent(managerId)}`;
  try {
    const res = await fetch(url, { headers: buildHeaders(request), cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch manager users' },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { managerId, userId } = body || {};
  if (!managerId || !userId) {
    return NextResponse.json({ error: 'managerId and userId are required' }, { status: 400 });
  }

  const url = `${API_BASE_URL}/managerUsers`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...buildHeaders(request), Prefer: 'return=representation' },
      body: JSON.stringify({ managerId, userId }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to assign manager' },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Request failed' }, { status: 500 });
  }
}
